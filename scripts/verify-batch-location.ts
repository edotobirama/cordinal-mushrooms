
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

async function verifyLastBatch() {
    console.log("Verifying last created batch...");

    const lastBatch = await db.query.batches.findFirst({
        orderBy: [desc(schema.batches.id)],
    });

    if (!lastBatch) {
        console.log("No batches found.");
        return;
    }

    console.log("Last Batch:", lastBatch);

    const locations = await db.select().from(schema.batchLocations).where(eq(schema.batchLocations.batchId, lastBatch.id));
    console.log("Batch Locations:", locations);

    if (locations.length === 0) {
        console.error("❌ No batch locations found for this batch! This explains why it's not showing in the rack.");
    } else {
        console.log("✅ Batch locations exist.");
        // Check if query in getRackDetails handles this
        // getRackDetails joins batches on batchLocations.batchId
    }
}

verifyLastBatch();
