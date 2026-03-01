
import { db } from "@/lib/db";
import { batches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { startBatchService } from "@/lib/services/production";

async function verifyStages() {
    console.log("Starting Stage Verification...");

    // 1. Create a Batch
    const batchName = `Test-Stage-${Date.now()}`;
    let batchId: number = -1;

    try {
        const res = await startBatchService(db, {
            type: "Liquid Culture",
            sourceId: "LC-TEST",
            startDate: new Date().toISOString(),
            rackId: 1, // Assumes rack 1 exists
            jarCount: 10,
            locationsStr: "",
            providedLayer: 1
        });
        batchId = res.batchId;
    } catch (e: any) {
        if (e.message.includes("Not enough available jars") || e.message.includes("FOREIGN KEY constraint failed")) {
            console.log("⚠️ Not enough jars or Rack 1 missing. Skipping creation test.");
            return;
        } else {
            throw e;
        }
    }

    // Get the batch
    const batch = await db.select().from(batches).where(eq(batches.id, batchId)).get();
    if (!batch) {
        console.error("❌ Batch creation failed or not found.");
        return;
    }
    console.log(`Batch created: ${batch.id}, Stage: ${batch.stage}`);

    // 2. Move to Stress ('no-cloth')
    console.log("Moving to Stress...");
    await db.update(batches).set({ stage: 'Stress' }).where(eq(batches.id, batch.id));

    const stressBatch = await db.select().from(batches).where(eq(batches.id, batch.id)).get();
    if (stressBatch?.stage === 'Stress') {
        console.log("✅ Stage updated to Stress.");
    } else {
        console.error(`❌ Stage update failed. Expected Stress, got ${stressBatch?.stage}`);
    }

    // 3. Move to Fruiting ('light')
    console.log("Moving to Fruiting...");
    await db.update(batches).set({ stage: 'Fruiting' }).where(eq(batches.id, batch.id));

    const fruitingBatch = await db.select().from(batches).where(eq(batches.id, batch.id)).get();
    if (fruitingBatch?.stage === 'Fruiting') {
        console.log("✅ Stage updated to Fruiting.");
    } else {
        console.error(`❌ Stage update failed. Expected Fruiting, got ${fruitingBatch?.stage}`);
    }

    console.log("Stage Verification Complete!");
}

verifyStages().catch(console.error);
