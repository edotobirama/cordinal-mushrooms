
import { db } from "@/lib/db";
import { racks, batches, inventoryItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { harvestBatchService, discardBatchService } from "@/lib/services/production";

async function verifyInventoryFlow() {
    console.log("Starting Inventory Flow Verification...");

    // 1. Setup: Get a rack and create two batches
    const rack = await db.query.racks.findFirst();
    if (!rack) {
        console.error("No rack found!");
        return;
    }

    console.log("Creating test batches...");
    const [batch1] = await db.insert(batches).values({
        name: "Test-Harvest-Batch",
        sourceId: "LC-001",
        startDate: new Date().toISOString(),
        rackId: rack.id,
        layer: 1,
        jarCount: 10,
        stage: "Fruiting",
        status: "Active"
    }).returning();

    const [batch2] = await db.insert(batches).values({
        name: "Test-Discard-Batch",
        sourceId: "LC-001",
        startDate: new Date().toISOString(),
        rackId: rack.id,
        layer: 1,
        jarCount: 5,
        stage: "Incubation",
        status: "Active"
    }).returning();

    // 2. Test Harvest Flow
    console.log(`Harvesting batch ${batch1.id}...`);
    await harvestBatchService(db, batch1.id);

    const inventoryItem = await db.query.inventoryItems.findFirst({
        where: eq(inventoryItems.batchId, batch1.id),
        orderBy: desc(inventoryItems.id)
    });

    if (inventoryItem && inventoryItem.type !== 'Waste') {
        console.log(`✅ Harvest completed and moved to Inventory as ${inventoryItem.type}`);
    } else {
        console.error("❌ Harvest processing failed to reach inventory (or is waste)");
    }

    // 3. Test Discard Flow
    console.log(`Discarding batch ${batch2.id}...`);
    await discardBatchService(db, batch2.id);

    // After discard, batch status should be Discarded, but let's check inventory or batch depending on new logic.
    // discardBatchService just changes status to Discarded and frees rack usage. It doesn't move to Waste inventory now?
    // Wait, let's verify discardBatchService behavior.
    const discardedBatch = await db.query.batches.findFirst({
        where: eq(batches.id, batch2.id)
    });

    if (discardedBatch?.status === 'Discarded') {
        console.log("✅ Discarded batch status changed to Discarded");
    } else {
        console.error("❌ Discard failed");
    }

    console.log("Verification Complete.");
}

verifyInventoryFlow().catch(console.error);
