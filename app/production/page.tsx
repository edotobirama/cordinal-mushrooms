
"use client";

import { useDb } from "@/components/providers/db-provider";
import { useProduction } from "@/hooks/use-production";
import { useInventory } from "@/hooks/use-inventory";
import * as schema from "@/lib/db/schema";
import { NewBatchDialog } from "@/components/production/new-batch-dialog";
import { ProductionActions } from "@/components/production/production-actions";
import { BatchHistoryDialog } from "@/components/production/batch-history-dialog";
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
import { desc, eq, inArray, not, ne } from "drizzle-orm";
import { Package, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ProductionPage() {
    const { db } = useDb();
    const { permanentlyDeleteBatch, permanentlyDeleteWasteItem } = useInventory();
    const [loading, setLoading] = useState(true);
    const [activeBatches, setActiveBatches] = useState<any[]>([]);
    const [discardedBatches, setDiscardedBatches] = useState<any[]>([]);
    const [wasteItems, setWasteItems] = useState<any[]>([]);
    const [storedItems, setStoredItems] = useState<any[]>([]);
    const [availableRacks, setAvailableRacks] = useState<any[]>([]);
    const [locationMap, setLocationMap] = useState<Map<number, string[]>>(new Map());
    const [permDeleteBatch, setPermDeleteBatch] = useState<{ id: number; name: string } | null>(null);
    const [permDeleteWaste, setPermDeleteWaste] = useState<{ id: number; name: string } | null>(null);

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
                sourceId: schema.batches.sourceId,
                discardedAt: schema.batches.updatedAt,
            })
                .from(schema.batches)
                .where(eq(schema.batches.status, "Discarded"))
                .orderBy(desc(schema.batches.startDate));

            // Fetch Waste Inventory Items (joined with batches for source & start date)
            const waste = await db.select({
                id: schema.inventoryItems.id,
                name: schema.inventoryItems.name,
                type: schema.inventoryItems.type,
                quantity: schema.inventoryItems.quantity,
                unit: schema.inventoryItems.unit,
                batchId: schema.inventoryItems.batchId,
                notes: schema.inventoryItems.notes,
                createdAt: schema.inventoryItems.createdAt,
                sourceName: schema.batches.sourceId,
                batchStartDate: schema.batches.startDate,
            })
                .from(schema.inventoryItems)
                .leftJoin(schema.batches, eq(schema.inventoryItems.batchId, schema.batches.id))
                .where(eq(schema.inventoryItems.type, "Waste"));

            // Fetch Stored Items (non-Waste), joined with batches + racks for source & location
            const stored = await db.select({
                id: schema.inventoryItems.id,
                name: schema.inventoryItems.name,
                type: schema.inventoryItems.type,
                quantity: schema.inventoryItems.quantity,
                unit: schema.inventoryItems.unit,
                batchId: schema.inventoryItems.batchId,
                createdAt: schema.inventoryItems.createdAt,
                sourceName: schema.batches.sourceId,
                batchStartDate: schema.batches.startDate,
                pastRackName: schema.racks.name,
                pastLayer: schema.batches.layer,
            })
                .from(schema.inventoryItems)
                .leftJoin(schema.batches, eq(schema.inventoryItems.batchId, schema.batches.id))
                .leftJoin(schema.racks, eq(schema.batches.rackId, schema.racks.id))
                .where(ne(schema.inventoryItems.type, "Waste"));

            // Sort manually
            active.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            discarded.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

            setActiveBatches(active);
            setDiscardedBatches(discarded);
            setWasteItems(waste);
            setStoredItems(stored.sort((a: any, b: any) => b.id - a.id));

            // Fetch Available Racks
            const { getAllRacksService } = await import("@/lib/services/facility");
            const allRacks = await getAllRacksService(db);
            setAvailableRacks(allRacks.filter((r: any) => r.status === "Active"));

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
                <TabsList className="grid w-full grid-cols-3 max-w-[560px]">
                    <TabsTrigger value="active">Active Production</TabsTrigger>
                    <TabsTrigger value="stored" className="data-[state=active]:text-green-600">
                        Stored Items
                    </TabsTrigger>
                    <TabsTrigger value="waste" className="data-[state=active]:text-red-500">
                        Waste
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="pt-4">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Culture</TableHead>
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
                                            <TableCell className="max-w-[150px] truncate" title={batch.sourceId}>{batch.sourceId || "-"}</TableCell>
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
                                                <div className="flex items-center gap-1">
                                                    <BatchHistoryDialog batchId={batch.id} batchName={batch.name} sourceId={batch.sourceId} startDate={batch.startDate} />
                                                    <ProductionActions batchId={batch.id} batchName={batch.name} onSuccess={refreshData} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {activeBatches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                            No active batches. Start a new one!
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="stored" className="pt-4">
                    <div className="border rounded-md">
                        <div className="bg-green-50 dark:bg-green-950/20 p-4 border-b border-green-200 dark:border-green-900/50 flex items-center gap-2">
                            <Package className="w-5 h-5 text-green-600" />
                            <h3 className="font-semibold text-green-700 dark:text-green-400">Stored Inventory</h3>
                            <span className="ml-auto text-sm text-muted-foreground">{storedItems.length} item{storedItems.length !== 1 ? 's' : ''}</span>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Past Location</TableHead>
                                    <TableHead>Batch Start Date</TableHead>
                                    <TableHead>Date Added to Storage</TableHead>
                                    <TableHead className="w-[100px]">History</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {storedItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-sm text-muted-foreground">{item.batchId ? `#${item.batchId}` : "—"}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                {item.type}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.sourceName || "—"}</TableCell>
                                        <TableCell className="text-sm">
                                            {item.pastRackName
                                                ? <span>{item.pastRackName} <span className="text-muted-foreground">/ L{item.pastLayer}</span></span>
                                                : <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell>{item.batchStartDate ? format(parseISO(item.batchStartDate), 'MMM d, yyyy') : "—"}</TableCell>
                                        <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>
                                            {item.batchId && item.batchStartDate ? (
                                                <BatchHistoryDialog
                                                    batchId={item.batchId}
                                                    batchName={item.name}
                                                    sourceId={item.sourceName || ""}
                                                    startDate={item.batchStartDate}
                                                />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {storedItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                            No stored items yet. Harvest batches to populate inventory.
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
                            <span className="ml-auto text-xs text-muted-foreground">{discardedBatches.length} record{discardedBatches.length !== 1 ? 's' : ''}</span>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Batch Start Date</TableHead>
                                    <TableHead>Discarded Date</TableHead>
                                    <TableHead>Jars</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {discardedBatches.map((batch) => (
                                    <TableRow key={batch.id} className="bg-red-50/30 dark:bg-red-950/10">
                                        <TableCell className="font-medium">{batch.name}</TableCell>
                                        <TableCell className="max-w-[150px] truncate" title={batch.sourceId}>{batch.sourceId || "—"}</TableCell>
                                        <TableCell>{batch.type}</TableCell>
                                        <TableCell>{format(parseISO(batch.startDate), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{batch.discardedAt ? format(new Date(batch.discardedAt), 'MMM d, yyyy') : "—"}</TableCell>
                                        <TableCell>{batch.jarCount}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive" className="bg-red-500">Discarded</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <BatchHistoryDialog batchId={batch.id} batchName={batch.name} sourceId={batch.sourceId} startDate={batch.startDate} />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    title="Permanently Delete"
                                                    onClick={() => setPermDeleteBatch({ id: batch.id, name: batch.name })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {discardedBatches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                            No discarded batches recorded.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Inventory Waste */}
                    {wasteItems.length > 0 && (
                        <div className="border rounded-md border-orange-200 dark:border-orange-900/50">
                            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 border-b border-orange-200 dark:border-orange-900/50 flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-orange-500" />
                                <h3 className="font-semibold text-orange-700 dark:text-orange-400">Inventory Waste</h3>
                                <span className="ml-auto text-xs text-muted-foreground">{wasteItems.length} item{wasteItems.length !== 1 ? 's' : ''}</span>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Batch Start Date</TableHead>
                                        <TableHead>Discarded Date</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[80px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wasteItems.map((item) => (
                                        <TableRow key={item.id} className="bg-orange-50/30 dark:bg-orange-950/10">
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={item.sourceName}>{item.sourceName || "—"}</TableCell>
                                            <TableCell>{item.type}</TableCell>
                                            <TableCell>{item.batchStartDate ? format(parseISO(item.batchStartDate), 'MMM d, yyyy') : "—"}</TableCell>
                                            <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{item.quantity} {item.unit}</TableCell>
                                            <TableCell>
                                                <Badge className="bg-orange-500 text-white">Waste</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    {item.batchId && item.batchStartDate && (
                                                        <BatchHistoryDialog
                                                            batchId={item.batchId}
                                                            batchName={item.name}
                                                            sourceId={item.sourceName || ""}
                                                            startDate={item.batchStartDate}
                                                        />
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        title="Permanently Delete"
                                                        onClick={() => setPermDeleteWaste({ id: item.id, name: item.name })}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Permanent Delete — Discarded Batch */}
            <Dialog open={!!permDeleteBatch} onOpenChange={(open: boolean) => !open && setPermDeleteBatch(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Permanently Delete Batch?
                        </DialogTitle>
                        <DialogDescription>
                            This will <strong>permanently erase</strong> batch <strong>&ldquo;{permDeleteBatch?.name}&rdquo;</strong> and all its history, actions and associated inventory records. <strong>This cannot be undone.</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPermDeleteBatch(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (permDeleteBatch) {
                                    await permanentlyDeleteBatch(permDeleteBatch.id);
                                    setPermDeleteBatch(null);
                                    refreshData();
                                }
                            }}
                        >
                            Yes, Delete Forever
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permanent Delete — Waste Item */}
            <Dialog open={!!permDeleteWaste} onOpenChange={(open: boolean) => !open && setPermDeleteWaste(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Permanently Delete Waste Item?
                        </DialogTitle>
                        <DialogDescription>
                            This will <strong>permanently erase</strong> the waste record for <strong>&ldquo;{permDeleteWaste?.name}&rdquo;</strong>. <strong>This cannot be undone.</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPermDeleteWaste(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (permDeleteWaste) {
                                    await permanentlyDeleteWasteItem(permDeleteWaste.id);
                                    setPermDeleteWaste(null);
                                    refreshData();
                                }
                            }}
                        >
                            Yes, Delete Forever
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
