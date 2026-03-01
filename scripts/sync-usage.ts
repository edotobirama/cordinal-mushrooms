
import { db } from "@/lib/db";
import { racks, batches } from "@/lib/db/schema";
import { eq, ne, and, sql } from "drizzle-orm";

async function syncUsage() {
    console.log("Syncing rack usage data...");

    const allRacks = await db.select().from(racks);

    for (const rack of allRacks) {
        // Calculate usage from active batches
        const activeBatches = await db.select().from(batches).where(
            and(
                eq(batches.rackId, rack.id),
                ne(batches.status, 'Harvested'),
                ne(batches.status, 'Contaminated')
            )
        );

        const calculatedUsage = activeBatches.reduce((acc, batch) => acc + batch.jarCount, 0);

        if (calculatedUsage !== rack.currentUsage) {
            console.log(`Updating Rack ${rack.name} (ID: ${rack.id}): ${rack.currentUsage} -> ${calculatedUsage}`);
            await db.update(racks)
                .set({ currentUsage: calculatedUsage })
                .where(eq(racks.id, rack.id));
        }
    }

    console.log("✅ Usage Sync Complete.");
    process.exit(0);
}

syncUsage().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
});
