
import { db } from "../lib/db";
import { batches, batchActions, inventoryItems, racks } from "../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getPendingLcShakes, logBatchAction } from "../app/production/actions";
import { addDays } from "date-fns";

async function main() {
    console.log("Starting Shaking Logic Verification...");

    // 1. Setup Data
    // Need a rack
    const rack = await db.query.racks.findFirst();
    let rackId = rack?.id;
    if (!rackId) {
        // Create dummy rack if none
        const [newRack] = await db.insert(racks).values({
            name: "Test Rack",
            capacity: 50,
            currentUsage: 0
        }).returning();
        rackId = newRack.id;
    }

    // Create a Test LC Batch started 2 days ago
    const startDate = addDays(new Date(), -2).toISOString();
    const batchName = "Test LC Shake " + Date.now();

    // Ensure unique name
    const [newBatch] = await db.insert(batches).values({
        name: batchName,
        sourceId: "Test Source",
        startDate: startDate,
        rackId: rackId,
        layer: 1,
        jarCount: 5,
        stage: "Incubation",
        status: "Active",
        type: "Liquid Culture"
    }).returning();

    console.log(`Created test batch: ${newBatch.name} (ID: ${newBatch.id}, Start: ${startDate})`);

    // 2. Initial Check
    console.log("Checking pending shakes (Expect: Needed)...");
    let pending = await getPendingLcShakes();
    let target = pending.find(b => b.id === newBatch.id);

    if (!target) {
        throw new Error("Batch not found in pending list!");
    }
    if (target.shakeCount !== 0) {
        throw new Error(`Expected shakeCount 0, got ${target.shakeCount}`);
    }
    console.log("Verified: Shake needed (0/2)");

    // 3. Log First Shake
    console.log("Logging 1st shake...");
    await logBatchAction(newBatch.id, "Shake", "Tester");

    // 4. Check Again
    pending = await getPendingLcShakes();
    target = pending.find(b => b.id === newBatch.id);

    if (!target) {
        throw new Error("Batch disappeared from pending list after 1 shake (Should still need 1 more)!");
    }
    if (target.shakeCount !== 1) {
        throw new Error(`Expected shakeCount 1, got ${target.shakeCount}`);
    }
    console.log("Verified: Shake needed (1/2)");

    // 5. Log Second Shake
    console.log("Logging 2nd shake...");
    await logBatchAction(newBatch.id, "Shake", "Tester");

    // 6. Check Final Status
    pending = await getPendingLcShakes();
    target = pending.find(b => b.id === newBatch.id);

    if (target) {
        throw new Error("Batch still in pending list after 2 shakes!");
    }
    console.log("Verified: Batch removed from pending list (2/2 completed)");

    // 7. Cleanup
    console.log("Cleaning up...");
    await db.delete(batchActions).where(eq(batchActions.batchId, newBatch.id));
    await db.delete(batches).where(eq(batches.id, newBatch.id));
    if (rack?.name === "Test Rack") {
        await db.delete(racks).where(eq(racks.id, rackId));
    }

    console.log("Verification Successful!");
}

main().catch(err => {
    console.error("Verification Failed:", err);
    process.exit(1);
});
