"use client";

import { useDb } from "@/components/providers/db-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { History, Loader2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { format, parseISO, isValid } from "date-fns";

/** Safely parse a date string that may be ISO ("2025-01-01T00:00:00") or SQLite CURRENT_TIMESTAMP ("2025-01-01 00:00:00") format. */
function safeDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const normalised = value.replace(' ', 'T');
    const d = new Date(normalised);
    return isValid(d) ? d : null;
}

export function BatchHistoryDialog({ batchId, batchName, sourceId, startDate }: { batchId: number, batchName: string, sourceId: string, startDate: string }) {
    const { db } = useDb();
    const [open, setOpen] = useState(false);
    const [actions, setActions] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [batchPrimaryLocation, setBatchPrimaryLocation] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !db) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Fetch action history
                const batchHistory = await db.select()
                    .from(schema.batchActions)
                    .where(eq(schema.batchActions.batchId, batchId))
                    .orderBy(desc(schema.batchActions.performedAt));
                setActions(batchHistory);

                // Fetch past locations from batchLocations (may exist for active/discarded batches)
                const locs = await db.select({
                    id: schema.batchLocations.id,
                    layer: schema.batchLocations.layer,
                    quantity: schema.batchLocations.quantity,
                    rackName: schema.racks.name,
                    createdAt: schema.batchLocations.createdAt,
                })
                    .from(schema.batchLocations)
                    .leftJoin(schema.racks, eq(schema.batchLocations.rackId, schema.racks.id))
                    .where(eq(schema.batchLocations.batchId, batchId));
                setLocations(locs);

                // Fetch the batch's primary rack (for harvested batches where batchLocations are cleared)
                const batchRes = await db.select({
                    rackId: schema.batches.rackId,
                    layer: schema.batches.layer,
                    rackName: schema.racks.name,
                })
                    .from(schema.batches)
                    .leftJoin(schema.racks, eq(schema.batches.rackId, schema.racks.id))
                    .where(eq(schema.batches.id, batchId))
                    .limit(1);
                setBatchPrimaryLocation(batchRes[0] || null);

            } catch (e) {
                console.error("Failed to fetch batch history", e);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [open, db, batchId]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                    <History className="h-4 w-4" />
                    History
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>History: {batchName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 pt-1">
                    {/* Batch meta */}
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                        <span className="text-muted-foreground">Culture Source:</span>
                        <span className="font-medium">{sourceId || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-medium">{format(parseISO(startDate), 'PPP')}</span>
                    </div>
                </div>

                <Tabs defaultValue="actions" className="mt-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="actions">Actions</TabsTrigger>
                        <TabsTrigger value="locations">Past Locations</TabsTrigger>
                    </TabsList>

                    {/* ── Actions tab ── */}
                    <TabsContent value="actions" className="mt-3">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : actions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No actions recorded for this batch yet.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {actions.map((act) => (
                                    <div key={act.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded-md">
                                        <span className="font-medium">{act.actionType}</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-muted-foreground">
                                                {safeDate(act.performedAt) ? format(safeDate(act.performedAt)!, 'MMM d, yy') : '—'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {safeDate(act.performedAt) ? format(safeDate(act.performedAt)!, 'h:mm a') : '—'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Past Locations tab ── */}
                    <TabsContent value="locations" className="mt-3">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {/* Live / multi-rack locations (for active batches) */}
                                {locations.length > 0 ? (
                                    locations.map((loc) => (
                                        <div key={loc.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span className="font-medium">{loc.rackName}</span>
                                                <span className="text-muted-foreground">Layer {loc.layer}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{loc.quantity} jars</span>
                                        </div>
                                    ))
                                ) : batchPrimaryLocation ? (
                                    /* Harvested batches — locations were cleared, show primary rack from batch record */
                                    <div>
                                        <div className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span className="font-medium">{batchPrimaryLocation.rackName || "Unknown Rack"}</span>
                                                <span className="text-muted-foreground">Layer {batchPrimaryLocation.layer}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 text-center">
                                            Primary rack at time of harvest
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No location data available.
                                    </p>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
