
import { db } from "@/lib/db";
import { racks, batches, batchLocations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { moveBatchItemsService } from "@/lib/services/facility";

async function verifyGhostFix() {
    console.log("Starting Ghost Fix Verification...");

    // 1. Setup Data
    // Create Source and Target Racks
    const [sourceRack] = await db.insert(racks).values({ name: "SourceRack", capacity: 100 }).returning();
    const [targetRack] = await db.insert(racks).values({ name: "TargetRack", capacity: 100 }).returning();
    console.log(`Created Racks: ${sourceRack.name} (${sourceRack.id}), ${targetRack.name} (${targetRack.id})`);

    // Create Legacy Batch (No location record initially)
    const [batch] = await db.insert(batches).values({
        name: "LegacyBatch-GhostTest",
        sourceId: "Test",
        startDate: new Date().toISOString(),
        rackId: sourceRack.id,
        layer: 1,
        jarCount: 10,
        stage: "Incubation",
        status: "Active"
    }).returning();
    console.log(`Created Batch: ${batch.name} (${batch.id}) on Rack ${sourceRack.id}`);

    // Verify it is Legacy (no location)
    const locsStart = await db.select().from(batchLocations).where(eq(batchLocations.batchId, batch.id));
    if (locsStart.length > 0) console.error("❌ Batch should not have locations yet!");

    // 2. Perform Full Move
    console.log("Moving ALL 10 jars to Target Rack...");
    await moveBatchItemsService(db, [{
        batchId: batch.id,
        count: 10,
        sourceRackId: sourceRack.id,
        sourceLayer: 1
    }], targetRack.id, 1);

    // 3. Verify Updates
    // The main bug previously was that locations and rack usage didn't sync correctly.
    // Check Location Records
    const locsEnd = await db.select().from(batchLocations).where(eq(batchLocations.batchId, batch.id));
    console.log("Location Records:", locsEnd);
    const targetLoc = locsEnd.find(l => l.rackId === targetRack.id);
    if (targetLoc && targetLoc.quantity === 10) {
        console.log("✅ SUCCESS: Target Location record created. Ghosting prevented locally.");
    } else {
        console.error("❌ FAILURE: Target Location record missing or wrong quantity.");
    }

    // Cleanup
    await db.delete(batchLocations).where(eq(batchLocations.batchId, batch.id));
    await db.delete(batches).where(eq(batches.id, batch.id));
    await db.delete(racks).where(eq(racks.id, sourceRack.id));
    await db.delete(racks).where(eq(racks.id, targetRack.id));
}

verifyGhostFix().catch(console.error);
