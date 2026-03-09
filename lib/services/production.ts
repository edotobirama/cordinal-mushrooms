import * as schema from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { INCUBATION_PERIODS } from "@/lib/constants";

export async function startBatchService(db: any, params: {
    name?: string;
    type: string;
    sourceId: string;
    startDate: string;
    rackId: number;
    jarCount: number;
    locationsStr: string;
    providedLayer: number;
    notes?: string | null;
    motherCultureSource?: string;
}) {
    let { name: providedName, type, sourceId, startDate, rackId, jarCount, locationsStr, providedLayer, notes, motherCultureSource } = params;

    if (!sourceId || sourceId === "undefined" || sourceId === "null") {
        sourceId = "New Source";
    }

    let sourceItem = null;
    if (sourceId !== "New Source" && sourceId !== "External") {
        // use select instead of query for better-sqlite3 compat if query isn't always reliable in all proxy setups, but query is standard Drizzle.
        // We will use standard select to avoid Relational queries issues.
        const items = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.name, sourceId)).limit(1);
        sourceItem = items[0] || null;
    }

    const typeAbbr = type === "Liquid Culture" ? "LC" : type === "Base Culture" ? "BC" : "Jar";
    const dateStr = format(new Date(startDate), "yyMMdd");
    const sourceName = sourceItem ? sourceItem.name : (sourceId === "New Source" || sourceId === "External" ? "Master" : sourceId);
    const name = providedName || `${sourceName}-${typeAbbr}-${dateStr}`;

    // ── Duplicate name guard ──────────────────────────────────────────────────
    // Prevent two *Active* batches from having the same name.
    const existing = await db.select({ id: schema.batches.id, status: schema.batches.status })
        .from(schema.batches)
        .where(and(eq(schema.batches.name, name), eq(schema.batches.status, "Active")))
        .limit(1);
    if (existing.length > 0) {
        throw new Error(`A batch named "${name}" is already active (id=${existing[0].id}). Use a different name or start date.`);
    }


    const isCultureBatch = ["Liquid Culture", "Base Culture", "Basal Medium"].includes(type);
    let targetLayer = providedLayer || 1;

    if (isCultureBatch && !providedLayer) {
        const rackRes = await db.select({ totalLayers: schema.racks.totalLayers }).from(schema.racks).where(eq(schema.racks.id, rackId)).limit(1);
        if (rackRes[0]) targetLayer = rackRes[0].totalLayers;
    }

    if (sourceItem && sourceItem.quantity > 0) {
        await db.update(schema.inventoryItems)
            .set({ quantity: sql`${schema.inventoryItems.quantity} - 1` })
            .where(eq(schema.inventoryItems.id, sourceItem.id));
    }

    const days = INCUBATION_PERIODS[type] || 14;
    const readyDate = addDays(new Date(startDate), days).toISOString().split('T')[0];

    const result = await db.insert(schema.batches).values({
        name,
        type,
        sourceId: sourceItem ? sourceItem.name : "External",
        startDate,
        estimatedReadyDate: readyDate,
        rackId,
        layer: targetLayer,
        jarCount,
        stage: "Incubation",
        status: "Active",
        notes: notes || null,
        motherCultureSource: motherCultureSource || "New"
    }).returning({ id: schema.batches.id });

    const batchId = result[0]?.id;
    if (!batchId) throw new Error("Failed to create batch");

    if (locationsStr) {
        const locations = JSON.parse(locationsStr) as { rackId: number; layer: number; quantity: number }[];
        for (const loc of locations) {
            if (loc.quantity > 0) {
                await db.insert(schema.batchLocations).values({
                    batchId,
                    rackId: loc.rackId,
                    layer: loc.layer,
                    quantity: loc.quantity
                });
                await db.update(schema.racks)
                    .set({ currentUsage: sql`${schema.racks.currentUsage} + ${loc.quantity}` })
                    .where(eq(schema.racks.id, loc.rackId));
            }
        }
    } else {
        if (jarCount > 0) {
            await db.insert(schema.batchLocations).values({
                batchId,
                rackId,
                layer: targetLayer,
                quantity: jarCount
            });
            await db.update(schema.racks)
                .set({ currentUsage: sql`${schema.racks.currentUsage} + ${jarCount}` })
                .where(eq(schema.racks.id, rackId));
        }
    }

    return { success: true, batchId };
}

export async function harvestBatchService(db: any, batchId: number) {
    const batchRes = await db.select().from(schema.batches).where(eq(schema.batches.id, batchId)).limit(1);
    const batch = batchRes[0];
    if (!batch) return;

    const locations = await db.select().from(schema.batchLocations).where(eq(schema.batchLocations.batchId, batchId));
    const locationTotal = locations.reduce((sum: number, loc: any) => sum + loc.quantity, 0);
    const finalQuantity = locationTotal > 0 ? locationTotal : (batch.jarCount || 0);

    await db.update(schema.batches)
        .set({ status: "Harvested", stage: "Complete", jarCount: finalQuantity })
        .where(eq(schema.batches.id, batchId));

    let inventoryType = "Waste";
    let unit = "jars";
    if (batch.type === "Liquid Culture") inventoryType = "Liquid-Culture";
    else if (batch.type === "Base Culture") inventoryType = "Base Culture";
    else if (batch.type === "Jars" || batch.type === "Spawn" || batch.type === "Grain" || batch.type === "Basal Medium") {
        inventoryType = "Jars";
        unit = "jars";
    } else {
        inventoryType = "Dried-Sealed";
        unit = "grams";
    }

    const existingItemRes = await db.select().from(schema.inventoryItems).where(
        and(
            eq(schema.inventoryItems.name, batch.name),
            eq(schema.inventoryItems.type, inventoryType)
        )
    ).limit(1);
    const existingItem = existingItemRes[0];

    if (existingItem) {
        await db.update(schema.inventoryItems)
            .set({ quantity: sql`${schema.inventoryItems.quantity} + ${finalQuantity}` })
            .where(eq(schema.inventoryItems.id, existingItem.id));
    } else {
        await db.insert(schema.inventoryItems).values({
            name: batch.name,
            type: inventoryType,
            quantity: finalQuantity,
            unit: unit,
            batchId: batch.id
        });
    }

    if (locations.length > 0) {
        const rackUsageMap = new Map<number, number>();
        for (const loc of locations) {
            const current = rackUsageMap.get(loc.rackId) || 0;
            rackUsageMap.set(loc.rackId, current + loc.quantity);
        }

        for (const [rId, qty] of rackUsageMap.entries()) {
            await db.update(schema.racks)
                .set({ currentUsage: sql`MAX(0, ${schema.racks.currentUsage} - ${qty})` })
                .where(eq(schema.racks.id, rId));
        }
        await db.delete(schema.batchLocations).where(eq(schema.batchLocations.batchId, batchId));
    } else {
        await db.update(schema.racks)
            .set({ currentUsage: sql`MAX(0, ${schema.racks.currentUsage} - ${finalQuantity})` })
            .where(eq(schema.racks.id, batch.rackId));
    }
}

export async function discardBatchService(db: any, batchId: number) {
    const batchRes = await db.select().from(schema.batches).where(eq(schema.batches.id, batchId)).limit(1);
    const batch = batchRes[0];
    if (!batch) return;

    await db.update(schema.batches)
        .set({ status: "Discarded", stage: "Discarded", updatedAt: new Date().toISOString() })
        .where(eq(schema.batches.id, batchId));

    const locations = await db.select().from(schema.batchLocations).where(eq(schema.batchLocations.batchId, batchId));

    if (locations.length > 0) {
        // Clean up via batchLocations (normal path)
        for (const loc of locations) {
            await db.update(schema.racks)
                .set({ currentUsage: sql`MAX(0, ${schema.racks.currentUsage} - ${loc.quantity})` })
                .where(eq(schema.racks.id, loc.rackId));
        }
        await db.delete(schema.batchLocations).where(eq(schema.batchLocations.batchId, batchId));
    } else if (batch.rackId && batch.jarCount > 0) {
        // Fallback: no batchLocations (e.g. deleted by audit), use batch record itself
        await db.update(schema.racks)
            .set({ currentUsage: sql`MAX(0, ${schema.racks.currentUsage} - ${batch.jarCount})` })
            .where(eq(schema.racks.id, batch.rackId));
    }
}

export async function discardPartialBatchService(db: any, batchId: number, rackId: number, layer: number, quantityToDiscard: number) {
    // 1. Get current batch and its remaining locations
    const batchRes = await db.select().from(schema.batches).where(eq(schema.batches.id, batchId)).limit(1);
    const batch = batchRes[0];
    if (!batch) return;

    // 2. Identify specific location row to deduct quantity from
    const locationRes = await db.select().from(schema.batchLocations).where(
        and(
            eq(schema.batchLocations.batchId, batchId),
            eq(schema.batchLocations.rackId, rackId),
            eq(schema.batchLocations.layer, layer)
        )
    ).limit(1);

    const location = locationRes[0];
    if (!location) return;

    const actualDiscardQuantity = Math.min(quantityToDiscard, location.quantity);

    // 3. Update Rack Usage
    await db.update(schema.racks)
        .set({ currentUsage: sql`MAX(0, ${schema.racks.currentUsage} - ${actualDiscardQuantity})` })
        .where(eq(schema.racks.id, rackId));

    // 4. Update or Delete Location depending on remaining quantity
    if (location.quantity <= actualDiscardQuantity) {
        await db.delete(schema.batchLocations).where(eq(schema.batchLocations.id, location.id));
    } else {
        await db.update(schema.batchLocations)
            .set({ quantity: location.quantity - actualDiscardQuantity })
            .where(eq(schema.batchLocations.id, location.id));
    }

    // 5. Update Total Batch Jar Count
    const newJarCount = Math.max(0, batch.jarCount - actualDiscardQuantity);

    // 6. Check if entire batch should be marked Discarded
    // Sometimes there are no locations so we should fallback to verifying jarCount drops to 0
    if (newJarCount <= 0) {
        // Discard the whole batch since everything is gone
        await db.update(schema.batches)
            .set({ status: "Discarded", stage: "Discarded", jarCount: 0 })
            .where(eq(schema.batches.id, batch.id));
    } else {
        // Otherwise just update the jarCount
        await db.update(schema.batches)
            .set({ jarCount: newJarCount })
            .where(eq(schema.batches.id, batch.id));
    }

    // 7. Log Action and Create Waste Item Record
    await logBatchActionService(db, batch.id, `Discarded ${actualDiscardQuantity} jars`);

    await db.insert(schema.inventoryItems).values({
        name: `${batch.name} - Discarded`,
        type: "Waste",
        quantity: actualDiscardQuantity,
        unit: "jars",
        batchId: batch.id,
        notes: `Partially discarded from Rack ${rackId}, Layer ${layer}`
    });
}

export async function deleteBatchService(db: any, id: number) {
    const batchRes = await db.select().from(schema.batches).where(eq(schema.batches.id, id)).limit(1);
    const b = batchRes[0];
    if (!b) return;

    await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.batchId, id));
    await db.delete(schema.batchActions).where(eq(schema.batchActions.batchId, id));

    const locations = await db.select().from(schema.batchLocations).where(eq(schema.batchLocations.batchId, id));
    if (locations.length > 0) {
        for (const loc of locations) {
            await db.update(schema.racks)
                .set({ currentUsage: sql`MAX(0, ${schema.racks.currentUsage} - ${loc.quantity})` })
                .where(eq(schema.racks.id, loc.rackId));
        }
        await db.delete(schema.batchLocations).where(eq(schema.batchLocations.batchId, id));
    }

    await db.delete(schema.batches).where(eq(schema.batches.id, id));
}

export async function updateBatchNotesService(db: any, batchId: number, notes: string) {
    await db.update(schema.batches).set({ notes }).where(eq(schema.batches.id, batchId));
}

export async function updateBatchService(db: any, params: {
    id: number;
    name: string;
    sourceId: string;
    startDate: string;
    jarCount: number;
    status: string;
}) {
    await db.update(schema.batches).set({
        name: params.name,
        sourceId: params.sourceId,
        startDate: params.startDate,
        jarCount: params.jarCount,
        status: params.status,
        updatedAt: new Date().toISOString()
    }).where(eq(schema.batches.id, params.id));
}

export async function logBatchActionService(db: any, batchId: number, actionType: string) {
    await db.insert(schema.batchActions).values({
        batchId,
        actionType,
        performedBy: "User",
        performedAt: new Date().toISOString()
    });
}
