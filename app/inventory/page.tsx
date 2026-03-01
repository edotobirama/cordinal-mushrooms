
"use client";

import { useDb } from "@/components/providers/db-provider";
import * as schema from "@/lib/db/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { desc, eq, sql, not, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Package, Loader2 } from "lucide-react";
import { AddItemDialog } from "@/components/inventory/add-item-dialog";
import { InventoryActions } from "@/components/inventory/inventory-actions";
import { useEffect, useState } from "react";

export default function InventoryPage() {
    const { db } = useDb();
    const [loading, setLoading] = useState(true);
    const [fruitingBatches, setFruitingBatches] = useState<any[]>([]);
    const [storedItems, setStoredItems] = useState<any[]>([]);
    const [stats, setStats] = useState({
        incubation: { lc: 0, agar: 0, spawn: 0 },
        storage: { lc: 0, agar: 0, fruit: 0, spawn: 0 },
        totalCapacity: 0
    });

    const refreshData = async () => {
        if (!db) return;
        setLoading(true);
        try {
            // 1. Fetch Fruiting Batches
            const fruiting = await db.select()
                .from(schema.batches)
                .where(eq(schema.batches.stage, "Fruiting"))
                .orderBy(desc(schema.batches.startDate));

            setFruitingBatches(fruiting);

            // 2. Fetch Stored Items
            const stored = await db.select().from(schema.inventoryItems);
            setStoredItems(stored.sort((a: any, b: any) => b.id - a.id));

            // 3. Stats Logic
            // Incubation
            const activeBatches = await db.select().from(schema.batches).where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])));
            const incubation = { lc: 0, agar: 0, spawn: 0 };
            activeBatches.forEach((b: any) => {
                if (b.type === "Liquid Culture") incubation.lc += b.jarCount;
                else if (b.type === "Base Culture") incubation.agar += b.jarCount;
                else if (b.type === "Spawn") incubation.spawn += b.jarCount;
            });

            // Storage
            const storage = { lc: 0, agar: 0, fruit: 0, spawn: 0 };
            stored.forEach((item: any) => {
                if (item.type === "Liquid-Culture") storage.lc += item.quantity;
                else if (item.type === "Base Culture") storage.agar += item.quantity;
                else if (item.type === "Dried-Sealed" || item.type === "Dried-Capsule") storage.fruit += item.quantity;
                else if (item.type === "Spawn") storage.spawn += item.quantity;
            });

            // Capacity
            const racks = await db.select().from(schema.racks);
            const totalCapacity = racks.reduce((acc: number, r: any) => acc + r.capacity, 0);

            setStats({ incubation, storage, totalCapacity });

        } catch (e) {
            console.error("Failed to fetch inventory data", e);
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
                    <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                    <p className="text-muted-foreground">
                        Track fruiting batches and stored cultures/products.
                    </p>
                </div>
                <AddItemDialog onSuccess={refreshData} />
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Incubation Room</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between text-sm">
                            <span>Liquid Culture:</span>
                            <span className="font-bold">{stats.incubation.lc}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Spawn (Grain):</span>
                            <span className="font-bold">{stats.incubation.spawn}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Base Culture (Agar):</span>
                            <span className="font-bold">{stats.incubation.agar}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage (Ready)</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between text-sm">
                            <span>Liquid Culture:</span>
                            <span className="font-bold">{stats.storage.lc}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Spawn (Grain):</span>
                            <span className="font-bold">{stats.storage.spawn}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Base Culture:</span>
                            <span className="font-bold">{stats.storage.agar}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Fruiting Bodies:</span>
                            <span className="font-bold">{stats.storage.fruit}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="fruiting" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="fruiting">Fruiting Batches</TabsTrigger>
                    <TabsTrigger value="stored">Stored (LC, BC, Jars, Fruit)</TabsTrigger>
                </TabsList>

                <TabsContent value="fruiting" className="space-y-4">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Quantity (Jars)</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Est. Ready</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fruitingBatches.map((batch) => (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-medium">{batch.name}</TableCell>
                                        <TableCell>{batch.type}</TableCell>
                                        <TableCell>{batch.jarCount}</TableCell>
                                        <TableCell>{batch.startDate}</TableCell>
                                        <TableCell>{batch.estimatedReadyDate || "N/A"}</TableCell>
                                    </TableRow>
                                ))}
                                {fruitingBatches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No batches currently in Fruiting stage.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="stored" className="space-y-4">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Created Date</TableHead>
                                    <TableHead className="w-[80px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {storedItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.batchId || "-"}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.type === 'Waste' ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800'
                                                } `}>
                                                {item.type}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>{format(new Date(item.createdAt), "PPP")}</TableCell>
                                        <TableCell>
                                            <InventoryActions itemId={item.id} itemName={item.name} onSuccess={refreshData} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {storedItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No items in storage. Harvest batches to add stock.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
