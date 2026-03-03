"use client";

import { useDb } from "@/components/providers/db-provider";
import { useDashboard } from "@/hooks/use-dashboard";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
        const stats = await getDashboardGridStats();
        setGridStats(stats);
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Helper for generating conditional class names for warning values (Red for Critical Actions)
  const criticalClass = (val: number) => cn("font-bold text-base", val > 0 ? "text-red-500 dark:text-red-400" : "");
  // Helper for generating conditional class names for warning values (Yellow for Warnings)
  const warningClass = (val: number) => cn("font-bold text-base", val > 0 ? "text-amber-500 dark:text-amber-400" : "");
  // Helper for generating conditional class names for harvest/positive values
  const harvestClass = (val: number) => cn("font-bold text-base", val > 0 ? "text-emerald-500 dark:text-emerald-400" : "");

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        </div>
        <p className="text-muted-foreground">
          Real-time facility status matrix for incubation and storage rooms.
        </p>
      </div>

      <div className="min-w-full overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border p-3 w-1/4 text-left font-semibold">Location</th>
              <th className="border p-3 w-1/4 text-center font-semibold">Base Culture</th>
              <th className="border p-3 w-1/4 text-center font-semibold">Liquid Culture</th>
              <th className="border p-3 w-1/4 text-center font-semibold">Jars</th>
            </tr>
          </thead>
          <tbody>
            {/* FRUITING ROOM OVERVIEW ROW */}
            <tr>
              <td className="border p-4 bg-muted/20 font-medium align-top">
                Fruiting Room / Incubation room
              </td>

              {/* === FRUITING: BASE CULTURE === */}
              <td className="border p-4 align-top space-y-3 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex justify-between items-center pb-2 border-b border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                  <span className="font-semibold text-base">Total:</span>
                  <span className="text-lg font-bold">{gridStats.fruitingRoom.baseCulture.total}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>In darkness</span>
                    <span className="font-medium text-foreground">{gridStats.fruitingRoom.baseCulture.inDarkness}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>In light</span>
                    <span className="font-medium text-foreground">{gridStats.fruitingRoom.baseCulture.inLight}</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t border-border/50">
                    <span className={gridStats.fruitingRoom.baseCulture.toHarvest > 0 ? "font-medium text-emerald-500 dark:text-emerald-400" : ""}>To Harvest</span>
                    <span className={harvestClass(gridStats.fruitingRoom.baseCulture.toHarvest)}>{gridStats.fruitingRoom.baseCulture.toHarvest}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={gridStats.fruitingRoom.baseCulture.toDiscard > 0 ? "font-medium text-red-500 dark:text-red-400" : ""}>To discard</span>
                    <span className={criticalClass(gridStats.fruitingRoom.baseCulture.toDiscard)}>{gridStats.fruitingRoom.baseCulture.toDiscard}</span>
                  </div>
                </div>
              </td>

              {/* === FRUITING: LIQUID CULTURE === */}
              <td className="border p-4 align-top space-y-3 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex justify-between items-center pb-2 border-b border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                  <span className="font-semibold text-base">Total:</span>
                  <span className="text-lg font-bold">{gridStats.fruitingRoom.liquidCulture.total}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>In darkness</span>
                    <span className="font-medium text-foreground">{gridStats.fruitingRoom.liquidCulture.inDarkness}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>In light</span>
                    <span className="font-medium text-foreground">{gridStats.fruitingRoom.liquidCulture.inLight}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className={gridStats.fruitingRoom.liquidCulture.toShake > 0 ? "font-medium text-red-500 dark:text-red-400" : ""}>To shake (Days 1-5)</span>
                    <span className={criticalClass(gridStats.fruitingRoom.liquidCulture.toShake)}>{gridStats.fruitingRoom.liquidCulture.toShake}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={gridStats.fruitingRoom.liquidCulture.toKeepInLight > 0 ? "font-medium text-red-500 dark:text-red-400" : ""}>To keep in light</span>
                    <span className={criticalClass(gridStats.fruitingRoom.liquidCulture.toKeepInLight)}>{gridStats.fruitingRoom.liquidCulture.toKeepInLight}</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t border-border/50">
                    <span className={gridStats.fruitingRoom.liquidCulture.toHarvest > 0 ? "font-medium text-emerald-500 dark:text-emerald-400" : ""}>To Harvest</span>
                    <span className={harvestClass(gridStats.fruitingRoom.liquidCulture.toHarvest)}>{gridStats.fruitingRoom.liquidCulture.toHarvest}</span>
                  </div>
                </div>
              </td>

              {/* === FRUITING: JARS (SPAWN) === */}
              <td className="border p-4 align-top space-y-3 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex justify-between items-center pb-2 border-b border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                  <span className="font-semibold text-base">Total:</span>
                  <span className="text-lg font-bold">{gridStats.fruitingRoom.jars.total}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>In darkness</span>
                    <span className="font-medium text-foreground">{gridStats.fruitingRoom.jars.inDarkness}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>In light</span>
                    <span className="font-medium text-foreground">{gridStats.fruitingRoom.jars.inLight}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className={gridStats.fruitingRoom.jars.removeCloth > 0 ? "font-medium text-red-500 dark:text-red-400" : ""}>Remove cloth (Day 13)</span>
                    <span className={criticalClass(gridStats.fruitingRoom.jars.removeCloth)}>{gridStats.fruitingRoom.jars.removeCloth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={gridStats.fruitingRoom.jars.toKeepInLight > 0 ? "font-medium text-red-500 dark:text-red-400" : ""}>To keep in light (Day 17)</span>
                    <span className={criticalClass(gridStats.fruitingRoom.jars.toKeepInLight)}>{gridStats.fruitingRoom.jars.toKeepInLight}</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t border-border/50">
                    <span className={gridStats.fruitingRoom.jars.toHarvest > 0 ? "font-medium text-emerald-500 dark:text-emerald-400" : ""}>To Harvest (Day 60)</span>
                    <span className={harvestClass(gridStats.fruitingRoom.jars.toHarvest)}>{gridStats.fruitingRoom.jars.toHarvest}</span>
                  </div>
                </div>
              </td>
            </tr>

            {/* STORAGE ROOM OVERVIEW ROW */}
            <tr>
              <td className="border p-4 bg-muted/20 font-medium align-top">
                Storage Room
              </td>

              {/* === STORAGE: BASE CULTURE === */}
              <td className="border p-4 align-top space-y-4 bg-blue-100/40 dark:bg-blue-900/10">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-blue-700 dark:text-blue-300">
                    <span className="font-semibold text-base">Total:</span>
                    <span className="text-lg font-bold">{gridStats.storageRoom.baseCulture.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground pb-2 border-b border-blue-200 dark:border-blue-800/50">
                    <span>Preserved:</span>
                    <span className="font-medium text-foreground">{gridStats.storageRoom.baseCulture.preserved}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-2">
                  <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Standard Storage</div>
                  <span className={gridStats.storageRoom.baseCulture.aboutToExpire > 0 ? "text-amber-500 dark:text-amber-400 font-medium" : "text-muted-foreground"}>About to expire (1 mo left):</span>
                  <span className={cn("text-right", warningClass(gridStats.storageRoom.baseCulture.aboutToExpire))}>{gridStats.storageRoom.baseCulture.aboutToExpire}</span>

                  <span className={gridStats.storageRoom.baseCulture.expired > 0 ? "text-red-500 dark:text-red-400 font-medium" : "text-muted-foreground"}>Expired (&gt; 6mo):</span>
                  <span className={cn("text-right", criticalClass(gridStats.storageRoom.baseCulture.expired))}>{gridStats.storageRoom.baseCulture.expired}</span>

                  <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-3 mb-1 pt-3 border-t border-border/40">Preserved Storage</div>
                  <span className={gridStats.storageRoom.baseCulture.preservedAboutToExpire > 0 ? "text-amber-500 dark:text-amber-400 font-medium" : "text-muted-foreground"}>About to expire (1 mo left):</span>
                  <span className={cn("text-right", warningClass(gridStats.storageRoom.baseCulture.preservedAboutToExpire))}>{gridStats.storageRoom.baseCulture.preservedAboutToExpire}</span>

                  <span className={gridStats.storageRoom.baseCulture.preservedExpired > 0 ? "text-red-500 dark:text-red-400 font-medium" : "text-muted-foreground"}>Expired (&gt; 2y):</span>
                  <span className={cn("text-right", criticalClass(gridStats.storageRoom.baseCulture.preservedExpired))}>{gridStats.storageRoom.baseCulture.preservedExpired}</span>
                </div>
              </td>

              {/* === STORAGE: LIQUID CULTURE === */}
              <td className="border p-4 align-top space-y-6 bg-blue-100/40 dark:bg-blue-900/10">
                <div className="flex justify-between items-center text-blue-700 dark:text-blue-300">
                  <span className="font-semibold text-lg">Total:</span>
                  <span className="text-2xl font-bold">{gridStats.storageRoom.liquidCulture.total}</span>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800/50">
                    <span className={cn("text-base tracking-wide", gridStats.storageRoom.liquidCulture.aboutToExpire > 0 ? "text-amber-500 dark:text-amber-400 font-medium" : "text-muted-foreground")}>About to expire (1 mo left):</span>
                    <span className={warningClass(gridStats.storageRoom.liquidCulture.aboutToExpire)}>{gridStats.storageRoom.liquidCulture.aboutToExpire}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={cn("text-base tracking-wide", gridStats.storageRoom.liquidCulture.expired > 0 ? "text-red-500 dark:text-red-400 font-medium" : "text-muted-foreground")}>Expired (&gt; 3mo):</span>
                    <span className={criticalClass(gridStats.storageRoom.liquidCulture.expired)}>{gridStats.storageRoom.liquidCulture.expired}</span>
                  </div>
                </div>
              </td>

              {/* === STORAGE: JARS (SPAWN) === */}
              <td className="border p-0 align-top bg-blue-100/40 dark:bg-blue-900/10 h-full">
                <div className="flex flex-col h-full">
                  {/* Stored Fresh */}
                  <div className="p-4 flex-1 border-b border-blue-200 dark:border-blue-800/50">
                    <div className="flex justify-between items-center mb-4 text-blue-700 dark:text-blue-300">
                      <div>
                        <span className="font-semibold text-lg block">Stored Fresh</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">total: <span className="font-bold">{gridStats.storageRoom.jars.fresh.total}</span></span>
                      </div>
                      <div className="text-right space-y-1 text-sm pt-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className={gridStats.storageRoom.jars.fresh.aboutToExpire > 0 ? "text-amber-500 dark:text-amber-400 font-medium" : "text-muted-foreground text-xs"}>about to expire (2w left):</span>
                          <span className={warningClass(gridStats.storageRoom.jars.fresh.aboutToExpire)}>{gridStats.storageRoom.jars.fresh.aboutToExpire}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className={gridStats.storageRoom.jars.fresh.expired > 0 ? "text-red-500 dark:text-red-400 font-medium" : "text-muted-foreground text-xs"}>expired (&gt; 2mo):</span>
                          <span className={criticalClass(gridStats.storageRoom.jars.fresh.expired)}>{gridStats.storageRoom.jars.fresh.expired}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stored Dry */}
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-center pb-2 text-blue-700 dark:text-blue-300">
                      <div>
                        <span className="font-semibold text-lg block">Stored Dry</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">total: <span className="font-bold">{gridStats.storageRoom.jars.dry.total}</span></span>
                      </div>
                      <div className="text-right space-y-1 text-sm pt-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className={gridStats.storageRoom.jars.dry.aboutToExpire > 0 ? "text-amber-500 dark:text-amber-400 font-medium" : "text-muted-foreground text-xs"}>about to expire (2mo left):</span>
                          <span className={warningClass(gridStats.storageRoom.jars.dry.aboutToExpire)}>{gridStats.storageRoom.jars.dry.aboutToExpire}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className={gridStats.storageRoom.jars.dry.expired > 0 ? "text-red-500 dark:text-red-400 font-medium" : "text-muted-foreground text-xs"}>expired (&gt; 2y):</span>
                          <span className={criticalClass(gridStats.storageRoom.jars.dry.expired)}>{gridStats.storageRoom.jars.dry.expired}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

