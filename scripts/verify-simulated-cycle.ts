
import { db } from "../lib/db";
import { inventoryItems, batches, racks } from "../lib/db/schema";
import { eq, like } from "drizzle-orm";

async function main() {
    console.log("Starting verification simulation...");

    // 1. Create a Test Inventory Item
    const testItemName = "Test LC Source " + Date.now();
    const [newItem] = await db.insert(inventoryItems).values({
        name: testItemName,
        type: "Liquid-Culture",
        quantity: 10,
        unit: "jars",
        notes: "Automated Test Item"
    }).returning();
    console.log(`Created test inventory item: ${newItem.name} (ID: ${newItem.id})`);

    // 2. Create a Test Batch using this source
    // We need a valid rack ID. Let's find one.
    const rack = await db.query.racks.findFirst();
    let rackId = rack?.id;
    if (!rackId) {
        const allRacks = await db.select().from(racks).limit(1);
        if (allRacks.length > 0) {
            rackId = allRacks[0].id;
        } else {
            console.log("No racks found. Verification incomplete.");
            return;
        }
    }

    const batchName = "Test Batch " + Date.now();
    const [newBatch] = await db.insert(batches).values({
        name: batchName,
        sourceId: testItemName,
        startDate: new Date().toISOString(),
        rackId: rackId,
        layer: 1,
        jarCount: 5,
        stage: "Incubation",
        status: "Active",
        type: "Base Culture"
    }).returning();
    console.log(`Created test batch: ${newBatch.name} (ID: ${newBatch.id}) on Rack ${rackId}`);

    // 3. Verify Batch Creation
    const verifyBatch = await db.query.batches.findFirst({
        where: eq(batches.id, newBatch.id)
    });
    if (!verifyBatch) throw new Error("Batch creation failed verification.");
    console.log("Batch creation verified.");

    // 4. Harvest the Batch (Simulate harvestBatch action logic)
    console.log("Simulating harvest...");

    // Update batch status
    await db.update(batches)
        .set({ status: 'Harvested', updatedAt: new Date().toISOString() })
        .where(eq(batches.id, newBatch.id));

    // Add to inventory
    const type = newBatch.type === 'Liquid Culture' ? 'Liquid-Culture' :
        newBatch.type === 'Base Culture' ? 'Base Culture' : 'Dried-Sealed';

    await db.insert(inventoryItems).values({
        name: newBatch.name,
        type: type,
        quantity: newBatch.jarCount,
        unit: 'jars',
        batchId: newBatch.id,
        notes: `Harvested from verify script`
    });

    // 5. Verify Harvest in Inventory
    const harvestedItem = await db.query.inventoryItems.findFirst({
        where: (items, { eq, and }) => and(
            eq(items.batchId, newBatch.id),
            eq(items.type, "Base Culture")
        )
    });

    if (!harvestedItem) throw new Error("Harvested item not found in inventory.");
    console.log(`Harvest verified: Found ${harvestedItem.name} in inventory (Qty: ${harvestedItem.quantity})`);

    // 6. Cleanup
    console.log("Cleaning up test data...");
    await db.delete(inventoryItems).where(eq(inventoryItems.id, newItem.id));
    await db.delete(inventoryItems).where(eq(inventoryItems.id, harvestedItem.id));
    await db.delete(batches).where(eq(batches.id, newBatch.id));
    console.log("Cleanup complete.");

    console.log("Verification checks passed successfully!");
}

main().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
});
