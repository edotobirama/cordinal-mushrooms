
"use client";

import { useDb } from "@/components/providers/db-provider";
import { useProduction } from "@/hooks/use-production";
import * as schema from "@/lib/db/schema";
import { NewBatchDialog } from "@/components/production/new-batch-dialog";
import { ProductionActions } from "@/components/production/production-actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { desc, eq, inArray, not } from "drizzle-orm";
import { addDays, format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export default function ProductionPage() {
    const { db } = useDb();
    const [loading, setLoading] = useState(true);
    const [activeBatches, setActiveBatches] = useState<any[]>([]);
    const [discardedBatches, setDiscardedBatches] = useState<any[]>([]);
    const [wasteItems, setWasteItems] = useState<any[]>([]);
    const [availableRacks, setAvailableRacks] = useState<any[]>([]);
    const [locationMap, setLocationMap] = useState<Map<number, string[]>>(new Map());

    const refreshData = async () => {
        if (!db) return;
        setLoading(true);
        try {
            // Fetch Active Batches
            const active = await db.select({
                id: schema.batches.id,
                name: schema.batches.name,
                type: schema.batches.type,
                jarCount: schema.batches.jarCount,
                startDate: schema.batches.startDate,
                stage: schema.batches.stage,
                status: schema.batches.status,
                estimatedReadyDate: schema.batches.estimatedReadyDate,
                rackId: schema.batches.rackId,
                layer: schema.batches.layer,
                rackName: schema.racks.name,
            })
                .from(schema.batches)
                .leftJoin(schema.racks, eq(schema.batches.rackId, schema.racks.id))
                .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])))
                .orderBy(desc(schema.batches.startDate));

            // Fetch Discarded Batches
            const discarded = await db.select({
                id: schema.batches.id,
                name: schema.batches.name,
                type: schema.batches.type,
                jarCount: schema.batches.jarCount,
                startDate: schema.batches.startDate,
                stage: schema.batches.stage,
            })
                .from(schema.batches)
                .where(eq(schema.batches.status, "Discarded"))
                .orderBy(desc(schema.batches.startDate));

            // Fetch Waste Inventory Items
            const waste = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.type, "Waste"));

            // Sort manually
            active.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            discarded.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

            setActiveBatches(active);
            setDiscardedBatches(discarded);
            setWasteItems(waste);

            // Fetch Available Racks
            const racks = await db.select().from(schema.racks).where(eq(schema.racks.status, "Active"));
            setAvailableRacks(racks);

            // Fetch Locations for Active Batches
            const batchIds = active.map((b: any) => b.id);
            const locMap = new Map<number, string[]>();

            if (batchIds.length > 0) {
                const locs = await db.select({
                    batchId: schema.batchLocations.batchId,
                    rackName: schema.racks.name,
                    quantity: schema.batchLocations.quantity
                })
                    .from(schema.batchLocations)
                    .leftJoin(schema.racks, eq(schema.batchLocations.rackId, schema.racks.id))
                    .where(inArray(schema.batchLocations.batchId, batchIds));

                for (const loc of locs) {
                    if (!locMap.has(loc.batchId)) {
                        locMap.set(loc.batchId, []);
                    }
                    locMap.get(loc.batchId)?.push(`${loc.rackName} (${loc.quantity})`);
                }
            }
            setLocationMap(locMap);

        } catch (e) {
            console.error("Fetch Production Error", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, [db]);

    if (!db || loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Production</h1>
                    <p className="text-muted-foreground">
                        Monitor active batches and track waste management.
                    </p>
                </div>
                <NewBatchDialog racks={availableRacks} onSuccess={refreshData} />
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="active">Active Production</TabsTrigger>
                    <TabsTrigger value="waste" className="data-[state=active]:text-red-500">
                        Waste Management
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="pt-4">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Jars</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Next Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeBatches.map((batch) => {
                                    const start = parseISO(batch.startDate);
                                    const daysElapsed = Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                    const day14 = addDays(start, 14);
                                    const day16 = addDays(start, 16);

                                    let nextAction = `Remove Blanket: ${format(day14, 'MMM d')}`;
                                    if (new Date() > day14) {
                                        nextAction = `Lights On: ${format(day16, 'MMM d')}`;
                                    }

                                    // Specific logic for Liquid Culture
                                    if (batch.type === "Liquid Culture") {
                                        const day20 = addDays(start, 20);

                                        if (daysElapsed <= 5) {
                                            nextAction = `Shake 2x Daily`;
                                        } else if (daysElapsed < 20) {
                                            nextAction = `Incubating (Remove Cloth: ${format(day20, 'MMM d')})`;
                                        } else if (daysElapsed === 20) {
                                            nextAction = `Remove Cloth / Light Exposure`;
                                        } else if (daysElapsed >= 21) {
                                            nextAction = `Store in Inventory (Harvest)`;
                                        }
                                    }

                                    const multiLocs = locationMap.get(batch.id);
                                    const locationDisplay = multiLocs && multiLocs.length > 0
                                        ? multiLocs.join(", ")
                                        : batch.rackName;

                                    return (
                                        <TableRow key={batch.id}>
                                            <TableCell className="font-medium">{batch.name}</TableCell>
                                            <TableCell>{format(start, 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{batch.type}</TableCell>
                                            <TableCell>{daysElapsed} days</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={locationDisplay || ""}>
                                                {locationDisplay}
                                            </TableCell>
                                            <TableCell>{batch.jarCount}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{batch.stage}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm flex items-center justify-between gap-2">
                                                <span>{nextAction}</span>
                                                <ProductionActions batchId={batch.id} batchName={batch.name} onSuccess={refreshData} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {activeBatches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                            No active batches. Start a new one!
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="waste" className="pt-4 space-y-6">
                    <div className="border rounded-md border-red-200 dark:border-red-900/50">
                        <div className="bg-red-50 dark:bg-red-950/20 p-4 border-b border-red-200 dark:border-red-900/50 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            <h3 className="font-semibold text-red-700 dark:text-red-400">Discarded Batches (Graveyard)</h3>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Initial Jars/Qty</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {discardedBatches.map((batch) => (
                                    <TableRow key={batch.id} className="bg-red-50/30 dark:bg-red-950/10">
                                        <TableCell className="font-medium">{batch.name}</TableCell>
                                        <TableCell>{format(parseISO(batch.startDate), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{batch.type}</TableCell>
                                        <TableCell>{batch.jarCount}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive" className="bg-red-500">Discarded</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <ProductionActions batchId={batch.id} batchName={batch.name} onSuccess={refreshData} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {discardedBatches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            No discarded batches recorded.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {wasteItems.length > 0 && (
                        <div className="border rounded-md border-orange-200 dark:border-orange-900/50">
                            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 border-b border-orange-200 dark:border-orange-900/50 flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-orange-500" />
                                <h3 className="font-semibold text-orange-700 dark:text-orange-400">Inventory Waste</h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Origin Batch</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Logged Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wasteItems.map((item) => (
                                        <TableRow key={item.id} className="bg-orange-50/30 dark:bg-orange-950/10">
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.batchId || "Manual Entry"}</TableCell>
                                            <TableCell>{item.type}</TableCell>
                                            <TableCell>{item.quantity} {item.unit}</TableCell>
                                            <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
