"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, AlertCircle, Package, CheckCircle2, Lightbulb, UserCheck, Loader2 } from "lucide-react";
import { useDb } from "@/components/providers/db-provider";
import { useDashboard } from "@/hooks/use-dashboard";
import * as schema from "@/lib/db/schema";
import { useEffect, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { eq } from "drizzle-orm";

export default function Home() {
  const { db } = useDb();
  const { getStats, getActions, getRecentActivity, getPendingActionCounts } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ incubation: { spawn: 0, lc: 0, agar: 0 }, storage: { lc: 0, agar: 0, spawn: 0 }, totalCapacity: 0 });
  const [actions, setActions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingCounts, setPendingCounts] = useState({ removeCloth: 0, switchLights: 0, harvestReady: 0, shakingNeeded: 0 });

  useEffect(() => {
    if (!db) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Auto-seed test notifications if they don't exist
        const testBatches = await db.select().from(schema.batches).where(eq(schema.batches.name, "Test-LC-Shake")).limit(1);

        if (testBatches.length === 0) {
          const testRacks = await db.select().from(schema.racks).limit(1);
          const rackId = testRacks.length > 0 ? testRacks[0].id : 1;

          if (testRacks.length > 0) {
            const today = new Date();
            await db.insert(schema.batches).values([
              { name: "Test-LC-Shake", type: "Liquid Culture", sourceId: "Test", startDate: subDays(today, 3).toISOString(), rackId, layer: 1, jarCount: 15, stage: "Incubation", status: "Active" },
              { name: "Test-Spawn-Cloth", type: "Spawn", sourceId: "Test", startDate: subDays(today, 14).toISOString(), rackId, layer: 1, jarCount: 20, stage: "Incubation", status: "Active" },
              { name: "Test-LC-Light", type: "Liquid Culture", sourceId: "Test", startDate: subDays(today, 21).toISOString(), rackId, layer: 1, jarCount: 10, stage: "Incubation", status: "Active" },
              { name: "Test-BC-Harvest", type: "Base Culture", sourceId: "Test", startDate: subDays(today, 62).toISOString(), rackId, layer: 1, jarCount: 5, stage: "Incubation", status: "Active" }
            ]);
          }
        }

        const s = await getStats();
        setStats(s);
        const a = await getActions();
        setActions(a);
        const r = await getRecentActivity();
        setRecentActivity(r);
        const p = await getPendingActionCounts();
        setPendingCounts(p);
      } catch (e) {
        console.error("Dashboard Load Error", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [db, getStats, getActions, getRecentActivity, getPendingActionCounts]);

  if (!db || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Welcome to Cordinal Mushrooms Facility Management.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Incubation Room Stats */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Incubation Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Spawn Jars</span>
              <div className="text-right">
                <span className="text-xl font-bold">{stats.incubation.spawn}</span>
                <span className="text-xs text-muted-foreground ml-1">/ {stats.totalCapacity} Cap</span>
              </div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Liquid Culture</span>
              <span className="text-xl font-bold">{stats.incubation.lc}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Base Culture</span>
              <span className="text-xl font-bold">{stats.incubation.agar}</span>
            </div>
          </CardContent>
        </Card>

        {/* Storage Stats */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Storage (Inventory)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Liquid Culture</span>
              <span className="text-xl font-bold">{stats.storage.lc}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Spawn (Grain)</span>
              <span className="text-xl font-bold">{stats.storage.spawn}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Base Culture</span>
              <span className="text-xl font-bold">{stats.storage.agar}</span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Ready for use
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Action Jar Counts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-violet-500" />
              Pending Actions (Jars)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Remove Cloth (Day 14)</span>
              <span className="text-xl font-bold">{pendingCounts.removeCloth}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Switch Lights (Day 16)</span>
              <span className="text-xl font-bold">{pendingCounts.switchLights}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Harvest Ready</span>
              <span className="text-xl font-bold">{pendingCounts.harvestReady}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground">Shaking Needed (LC)</span>
              <span className="text-xl font-bold text-purple-600">{pendingCounts.shakingNeeded}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Action Required Today</CardTitle>
            <CardDescription>
              Tasks based on batch incubation cycles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actions.length > 0 ? (
              <div className="space-y-4">
                {actions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-lg bg-accent/50">
                      <Icon className={`h-6 w-6 ${action.color}`} />
                      <div className="flex-1">
                        <p className="font-medium">{action.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                No immediate actions required.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest created batches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{activity.name}</p>
                      <p className="text-xs text-muted-foreground">Started {format(parseISO(activity.created), 'MMM d, h:mm a')}</p>
                    </div>
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                No recent activity.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
