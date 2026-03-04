/**
 * Show all racks + all active batches + all batchLocations for inspection.
 * Run: npx tsx scripts/inspect-racks.ts
 */
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const racks = await db.select().from(schema.racks);
    const batches = await db.select().from(schema.batches);
    const locs = await db.select().from(schema.batchLocations);

    console.log("\n=== RACKS ===");
    for (const r of racks) {
        console.log(`id=${r.id} name="${r.name}" currentUsage=${r.currentUsage} capacity=${r.capacity}`);
    }

    console.log("\n=== ACTIVE BATCHES ===");
    const active = batches.filter(b => b.status === "Active");
    for (const b of active) {
        console.log(`id=${b.id} name="${b.name}" rackId=${b.rackId} layer=${b.layer} jarCount=${b.jarCount} status=${b.status}`);
    }

    console.log(`\n  Total active: ${active.length}`);

    console.log("\n=== ALL batchLocations ===");
    for (const l of locs) {
        const rackName = racks.find(r => r.id === l.rackId)?.name ?? `?`;
        const batch = batches.find(b => b.id === l.batchId);
        console.log(`locId=${l.id} batchId=${l.batchId}("${batch?.name}" ${batch?.status}) rack="${rackName}" layer=${l.layer} qty=${l.quantity}`);
    }

    console.log(`\n  Total locations: ${locs.length}`);
}

main().catch(console.error);
