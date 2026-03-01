
import { db } from "@/lib/db";
import { batches, batchActions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logBatchActionService } from "@/lib/services/production";

async function verifyShake() {
    console.log("Starting Shake Verification...");

    // 1. Find or Create a Test Batch (LC)
    let batch = await db.query.batches.findFirst({
        where: and(
            eq(batches.type, "Liquid Culture"),
            eq(batches.status, "Active")
        )
    });

    if (!batch) {
        console.log("No active LC batch found. Creating one...");
        const result = await db.insert(batches).values({
            name: "Test-LC-Shake-Verify",
            type: "Liquid Culture",
            sourceId: "Test Source",
            startDate: new Date().toISOString(),
            rackId: 1,
            layer: 1,
            jarCount: 10,
            stage: "Incubation",
            status: "Active"
        }).returning();
        batch = result[0];
    }

    console.log(`Using batch: ${batch.name} (ID: ${batch.id})`);

    // 2. Perform Shake Action
    console.log("Performing Shake action...");
    await logBatchActionService(db, batch.id, "Shake");

    // 3. Verify Batch Action Record
    console.log("Verifying action record...");
    const actions = await db.select().from(batchActions).where(
        and(
            eq(batchActions.batchId, batch.id),
            eq(batchActions.actionType, "Shake")
        )
    );

    if (actions.length > 0) {
        const latest = actions[actions.length - 1];
        console.log("✅ Shake action recorded:", latest);

        // Check if performed recently (within last minute)
        const perfTime = new Date(latest.performedAt).getTime();
        const now = new Date().getTime();
        if (now - perfTime < 60000) {
            console.log("✅ Action timestamp is recent.");
        } else {
            console.error("❌ Action timestamp depends on implementation, might be old if we didn't insert new?");
        }

    } else {
        console.error("❌ No shake action found!");
        process.exit(1);
    }

    console.log("Shake Verification Complete!");
}

verifyShake().catch(e => {
    console.error(e);
    process.exit(1);
});
