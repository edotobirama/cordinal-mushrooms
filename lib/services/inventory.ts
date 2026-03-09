import * as schema from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function addToInventoryService(db: any, params: { name: string; type: string; quantity: number; unit: string; isPreserved: boolean; notes: string }) {
    const { name, type, quantity, unit, isPreserved, notes } = params;

    const existingRes = await db.select().from(schema.inventoryItems).where(
        and(
            eq(schema.inventoryItems.name, name),
            eq(schema.inventoryItems.type, type),
            eq(schema.inventoryItems.isPreserved, isPreserved)
        )
    ).limit(1);
    const existing = existingRes[0];

    if (existing) {
        await db.update(schema.inventoryItems)
            .set({ quantity: sql`${schema.inventoryItems.quantity} + ${quantity}`, notes })
            .where(eq(schema.inventoryItems.id, existing.id));
    } else {
        await db.insert(schema.inventoryItems).values({
            name,
            type,
            quantity,
            unit,
            isPreserved,
            notes
        });
    }
}

export async function updateInventoryItemService(db: any, params: { id: number; quantity: number; notes: string }) {
    await db.update(schema.inventoryItems)
        .set({ quantity: params.quantity, notes: params.notes })
        .where(eq(schema.inventoryItems.id, params.id));
}

export async function deleteInventoryItemService(db: any, id: number) {
    await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id));
}

/** Mark an inventory item as Waste (moves it to the Inventory Waste section) */
export async function discardInventoryItemService(db: any, id: number) {
    await db.update(schema.inventoryItems)
        .set({ type: "Waste", notes: `Discarded on ${new Date().toLocaleDateString()}` })
        .where(eq(schema.inventoryItems.id, id));
}

/** Permanently delete a discarded batch record (and its actions/locations) */
export async function permanentlyDeleteBatchService(db: any, batchId: number) {
    await db.delete(schema.batchActions).where(eq(schema.batchActions.batchId, batchId));
    await db.delete(schema.batchLocations).where(eq(schema.batchLocations.batchId, batchId));
    await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.batchId, batchId));
    await db.delete(schema.batches).where(eq(schema.batches.id, batchId));
}

/** Permanently delete a waste inventory item */
export async function permanentlyDeleteWasteItemService(db: any, id: number) {
    await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id));
}

/** Update only the notes field on an inventory item */
export async function updateInventoryItemNotesService(db: any, id: number, notes: string) {
    await db.update(schema.inventoryItems)
        .set({ notes })
        .where(eq(schema.inventoryItems.id, id));
}


export async function addMaterialService(db: any, params: { name: string; quantity: number; unit: string; lowStockThreshold: number }) {
    await db.insert(schema.materials).values({
        name: params.name,
        quantity: params.quantity,
        unit: params.unit,
        lowStockThreshold: params.lowStockThreshold,
    });
}

export async function updateStockService(db: any, id: number, newQuantity: number) {
    await db.update(schema.materials)
        .set({ quantity: newQuantity })
        .where(eq(schema.materials.id, id));
}

export async function deleteMaterialService(db: any, id: number) {
    await db.delete(schema.materials).where(eq(schema.materials.id, id));
}

export async function performDailyCheckService(db: any, entries: [string, any][]) {
    for (const [key, value] of entries) {
        if (key.startsWith("qty_")) {
            const id = Number(key.replace("qty_", ""));
            const quantity = Number(value);
            await db.update(schema.materials)
                .set({ quantity, updatedAt: new Date().toISOString() })
                .where(eq(schema.materials.id, id));
        }
    }

    await db.insert(schema.inventoryChecks).values({
        date: new Date().toISOString().split('T')[0],
        performedBy: "System",
        notes: "Daily inventory check completed",
    });
}

export async function getInventoryItemsByTypeService(db: any, type: string) {
    return await db.select()
        .from(schema.inventoryItems)
        .where(eq(schema.inventoryItems.type, type));
}

export async function convertJarToDriedService(db: any, id: number) {
    const jarRes = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, id)).limit(1);
    const jar = jarRes[0];
    if (!jar || jar.type !== "Jars" || jar.quantity <= 0) return;

    // Decrement Jar
    await db.update(schema.inventoryItems)
        .set({ quantity: jar.quantity - 1 })
        .where(eq(schema.inventoryItems.id, id));

    // Add Dried
    await addToInventoryService(db, {
        name: jar.name,
        type: "Dried",
        quantity: 1,
        unit: "grams",
        isPreserved: false,
        notes: `Harvested from Jar`
    });
}
