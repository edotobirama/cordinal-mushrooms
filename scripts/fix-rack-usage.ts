/**
 * Fix rack currentUsage by recalculating from actual active batchLocations.
 * Run: npx tsx scripts/fix-rack-usage.ts
 */
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
    console.log("\n── Fix Rack Usage Counts ──\n");

    // 1. Get all racks
    const racks = await db.select().from(schema.racks);

    // 2. Get all active batch IDs
    const activeBatches = await db.select({ id: schema.batches.id })
        .from(schema.batches)
        .where(eq(schema.batches.status, "Active"));
    const activeIds = new Set(activeBatches.map(b => b.id));

    // 3. Get all batchLocations
    const allLocations = await db.select().from(schema.batchLocations);

    // 4. For each rack, compute the true usage from locations where batch is Active
    for (const rack of racks) {
        const activeLocs = allLocations.filter(l => l.rackId === rack.id && activeIds.has(l.batchId));
        const trueUsage = activeLocs.reduce((s, l) => s + Number(l.quantity), 0);
        const storedUsage = Number(rack.currentUsage);

        console.log(`Rack "${rack.name}" (id=${rack.id}): stored=${storedUsage}, actual=${trueUsage}`);

        if (storedUsage !== trueUsage) {
            await db.update(schema.racks)
                .set({ currentUsage: trueUsage })
                .where(eq(schema.racks.id, rack.id));
            console.log(`  ✓ Fixed → set to ${trueUsage}`);
        } else {
            console.log(`  ✓ OK`);
        }
    }

    // 5. Also clean any ghost batchLocations for non-active batches
    const ghostLocs = allLocations.filter(l => !activeIds.has(l.batchId));
    if (ghostLocs.length > 0) {
        console.log(`\nFound ${ghostLocs.length} ghost batchLocation(s) for non-active batches:`);
        for (const loc of ghostLocs) {
            console.log(`  → id=${loc.id}, batchId=${loc.batchId}, rack=${loc.rackId}, layer=${loc.layer}, qty=${loc.quantity}`);
            await db.delete(schema.batchLocations).where(eq(schema.batchLocations.id, loc.id));
        }
        console.log(`  ✓ Deleted all ${ghostLocs.length} ghost batchLocations`);
    } else {
        console.log(`\n✓ No ghost batchLocations found`);
    }

    console.log("\n── Done ──\n");
}

main().catch(err => {
    console.error("FATAL:", err);
    process.exit(1);
});
