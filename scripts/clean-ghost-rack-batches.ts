/**
 * Diagnose and clean ghost test batches from racks named L1 and L2.
 * Run: npx tsx scripts/clean-ghost-rack-batches.ts
 */
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function main() {
    console.log("\n── Clean Ghost Rack Batches ──\n");

    // 1. Get all racks
    const racks = await db.select().from(schema.racks);
    console.log("All racks:");
    for (const r of racks) {
        console.log(`  id=${r.id} name="${r.name}" currentUsage=${r.currentUsage}`);
    }

    // 2. Get all batchLocations with batch info
    const allLocs = await db.select({
        locId: schema.batchLocations.id,
        batchId: schema.batchLocations.batchId,
        rackId: schema.batchLocations.rackId,
        layer: schema.batchLocations.layer,
        quantity: schema.batchLocations.quantity,
        batchName: schema.batches.name,
        batchStatus: schema.batches.status,
        batchType: schema.batches.type,
    })
        .from(schema.batchLocations)
        .leftJoin(schema.batches, eq(schema.batchLocations.batchId, schema.batches.id));

    console.log("\nAll batchLocations:");
    for (const l of allLocs) {
        const rackName = racks.find(r => r.id === l.rackId)?.name || `id=${l.rackId}`;
        console.log(`  locId=${l.locId} batch="${l.batchName}" (${l.batchStatus}) rack="${rackName}" layer=${l.layer} qty=${l.quantity}`);
    }

    // 3. Find ALL non-active locations (Discarded, Harvested, null)
    const stale = allLocs.filter(l => l.batchStatus !== "Active");
    if (stale.length > 0) {
        console.log(`\nFound ${stale.length} stale batchLocation(s) to clean:`);
        for (const loc of stale) {
            const rackName = racks.find(r => r.id === loc.rackId)?.name || `id=${loc.rackId}`;
            console.log(`  → Deleting loc ${loc.locId} (batch="${loc.batchName}" ${loc.batchStatus}, rack="${rackName}", qty=${loc.quantity})`);
            await db.delete(schema.batchLocations).where(eq(schema.batchLocations.id, loc.locId));
        }
    }

    // 4. Recompute usage for ALL racks from scratch
    const freshLocs = await db.select().from(schema.batchLocations);
    const freshBatches = await db.select({ id: schema.batches.id, status: schema.batches.status }).from(schema.batches);
    const activeIds = new Set(freshBatches.filter(b => b.status === "Active").map(b => b.id));

    console.log("\nRecalculating rack usage:");
    for (const rack of racks) {
        const activeLocs = freshLocs.filter(l => l.rackId === rack.id && activeIds.has(l.batchId));
        const trueUsage = activeLocs.reduce((s, l) => s + Number(l.quantity), 0);
        console.log(`  Rack "${rack.name}": setting currentUsage = ${trueUsage}`);
        await db.update(schema.racks).set({ currentUsage: trueUsage }).where(eq(schema.racks.id, rack.id));
    }

    console.log("\n── Done ──\n");
}

main().catch(err => {
    console.error("FATAL:", err);
    process.exit(1);
});
