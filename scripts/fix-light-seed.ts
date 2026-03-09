import { db } from "@/lib/db";
import { batches, batchActions } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

async function fixSeed() {
    console.log("Fixing cloth removal for Light Test Batches...");

    const targetNames = ["Day 15 (Light 1)", "Day 18 (Light 2)", "Day 62 (Harvest)"];

    const targetBatches = await db.select()
        .from(batches)
        .where(inArray(batches.name, targetNames));

    for (const batch of targetBatches) {
        await db.insert(batchActions).values({
            batchId: batch.id,
            actionType: "Remove Cloth",
            performedBy: "Seeder",
        });
        console.log(`Removed cloth from ${batch.name}`);
    }
    console.log("Done!");
}

fixSeed().catch(console.error);
