"use client";

import { useDb } from "@/components/providers/db-provider";
import { useDashboard } from "@/hooks/use-dashboard";
import { useEffect, useState } from "react";
import { Loader2, FlaskConical, Beaker, Archive, Package, AlertTriangle, CheckCircle2, Lightbulb, RotateCcw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number;
  variant?: "neutral" | "critical" | "warning" | "success";
}) {
  const hidden = variant !== "neutral" && value === 0;
  const badgeColor =
    variant === "critical"
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : variant === "warning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : variant === "success"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 px-1 rounded transition-all",
        hidden && "opacity-30"
      )}
    >
      <span className="text-sm text-muted-foreground leading-tight">{label}</span>
      <span
        className={cn(
          "text-sm font-bold min-w-[2rem] text-center rounded-full px-2 py-0.5",
          badgeColor
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function CultureCard({
  title,
  icon,
  total,
  accentColor,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col", accentColor)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-lg font-extrabold tabular-nums">{total}</span>
        </div>
      </div>
      {/* Body */}
      <div className="px-4 py-3 flex-1 space-y-0.5">{children}</div>
    </div>
  );
}

function RoomSection({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className={cn("flex items-center gap-2.5 px-1", color)}>
        {icon}
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {children}
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { db } = useDb();
  const { getDashboardGridStats } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [gridStats, setGridStats] = useState<any>(null);

  useEffect(() => {
    if (!db) return;
    const loadData = async () => {
      setLoading(true);
      try {
        setGridStats(await getDashboardGridStats());
      } catch (e) {
        console.error("Dashboard Load Error", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [db, getDashboardGridStats]);

  if (!db || loading || !gridStats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fr = gridStats.fruitingRoom;
  const sr = gridStats.storageRoom;

  return (
    <div className="space-y-8 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time status for incubation and storage rooms.
        </p>
      </div>

      {/* ── FRUITING / INCUBATION ROOM ── */}
      <RoomSection
        title="Fruiting / Incubation Room"
        icon={<FlaskConical className="h-5 w-5" />}
        color="text-blue-600 dark:text-blue-400"
      >
        {/* Base Culture */}
        <CultureCard
          title="Base Culture"
          icon={<Beaker className="h-4 w-4 text-blue-500" />}
          total={fr.baseCulture.total}
          accentColor="border-blue-200 dark:border-blue-900/50"
        >
          <StatRow label="In darkness" value={fr.baseCulture.inDarkness} />
          <StatRow label="In light" value={fr.baseCulture.inLight} />
          <SectionDivider label="Actions" />
          <StatRow label="To Harvest" value={fr.baseCulture.toHarvest} variant="success" />
          <StatRow label="To Discard" value={fr.baseCulture.toDiscard} variant="critical" />
        </CultureCard>

        {/* Liquid Culture */}
        <CultureCard
          title="Liquid Culture"
          icon={<FlaskConical className="h-4 w-4 text-violet-500" />}
          total={fr.liquidCulture.total}
          accentColor="border-violet-200 dark:border-violet-900/50"
        >
          <StatRow label="In darkness" value={fr.liquidCulture.inDarkness} />
          <StatRow label="In light" value={fr.liquidCulture.inLight} />
          <SectionDivider label="Actions" />
          <StatRow label="To shake (Days 1–5)" value={fr.liquidCulture.toShake} variant="critical" />
          <StatRow label="Move to light (Day 20+)" value={fr.liquidCulture.toKeepInLight} variant="warning" />
          <StatRow label="To Harvest (Day 22+)" value={fr.liquidCulture.toHarvest} variant="success" />
        </CultureCard>

        {/* Jars / Spawn */}
        <CultureCard
          title="Jars / Spawn"
          icon={<Archive className="h-4 w-4 text-emerald-500" />}
          total={fr.jars.total}
          accentColor="border-emerald-200 dark:border-emerald-900/50"
        >
          <StatRow label="In darkness" value={fr.jars.inDarkness} />
          <StatRow label="In light" value={fr.jars.inLight} />
          <SectionDivider label="Actions" />
          <StatRow label="Remove cloth (Day 13)" value={fr.jars.removeCloth} variant="critical" />
          <StatRow label="Move to light (Day 17)" value={fr.jars.toKeepInLight} variant="warning" />
          <StatRow label="To Harvest (Day 60+)" value={fr.jars.toHarvest} variant="success" />
        </CultureCard>
      </RoomSection>

      {/* ── STORAGE ROOM ── */}
      <RoomSection
        title="Storage Room"
        icon={<Package className="h-5 w-5" />}
        color="text-emerald-600 dark:text-emerald-400"
      >
        {/* Base Culture Storage */}
        <CultureCard
          title="Base Culture"
          icon={<Beaker className="h-4 w-4 text-blue-500" />}
          total={sr.baseCulture.total}
          accentColor="border-blue-200 dark:border-blue-900/50"
        >
          <StatRow label="Preserved" value={sr.baseCulture.preserved} />
          <SectionDivider label="Standard (6 mo shelf life)" />
          <StatRow label="About to expire (~1 mo)" value={sr.baseCulture.aboutToExpire} variant="warning" />
          <StatRow label="Expired (>6 mo)" value={sr.baseCulture.expired} variant="critical" />
          <SectionDivider label="Preserved (2 yr shelf life)" />
          <StatRow label="About to expire (~1 mo)" value={sr.baseCulture.preservedAboutToExpire} variant="warning" />
          <StatRow label="Expired (>2 yr)" value={sr.baseCulture.preservedExpired} variant="critical" />
        </CultureCard>

        {/* Liquid Culture Storage */}
        <CultureCard
          title="Liquid Culture"
          icon={<FlaskConical className="h-4 w-4 text-violet-500" />}
          total={sr.liquidCulture.total}
          accentColor="border-violet-200 dark:border-violet-900/50"
        >
          <SectionDivider label="Shelf life: 3 months" />
          <StatRow label="About to expire (~1 mo)" value={sr.liquidCulture.aboutToExpire} variant="warning" />
          <StatRow label="Expired (>3 mo)" value={sr.liquidCulture.expired} variant="critical" />
          {sr.liquidCulture.total === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No liquid cultures in storage.</p>
          )}
        </CultureCard>

        {/* Jars Storage — Fresh + Dry side by side on mobile, stacked in card */}
        <div className="sm:col-span-2 xl:col-span-1 grid grid-cols-1 xs:grid-cols-2 gap-3">
          <CultureCard
            title="Stored Fresh"
            icon={<Archive className="h-4 w-4 text-emerald-500" />}
            total={sr.jars.fresh.total}
            accentColor="border-emerald-200 dark:border-emerald-900/50"
          >
            <SectionDivider label="Shelf life: 2 months" />
            <StatRow label="About to expire (2w)" value={sr.jars.fresh.aboutToExpire} variant="warning" />
            <StatRow label="Expired (>2 mo)" value={sr.jars.fresh.expired} variant="critical" />
          </CultureCard>

          <CultureCard
            title="Stored Dry"
            icon={<Archive className="h-4 w-4 text-amber-500" />}
            total={sr.jars.dry.total}
            accentColor="border-amber-200 dark:border-amber-900/50"
          >
            <SectionDivider label="Shelf life: 2 years" />
            <StatRow label="About to expire (2 mo)" value={sr.jars.dry.aboutToExpire} variant="warning" />
            <StatRow label="Expired (>2 yr)" value={sr.jars.dry.expired} variant="critical" />
          </CultureCard>
        </div>
      </RoomSection>
    </div>
  );
}
