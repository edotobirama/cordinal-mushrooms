
import { db } from "../lib/db";
import { racks, batches, batchLocations } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";
import { addBatch, moveBatchItems, addRack } from "../app/facility/actions";
import { revalidatePath } from "next/cache";

// Mock revalidatePath - manually if needed, or ignore
// jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

async function main() {
    console.log("Starting Move Verification...");

    // 1. Create Test Racks
    // We can't use `addRack` easily because it takes FormData and doesn't return ID.
    // We'll direct insert.
    const rack1 = await db.insert(racks).values({
        name: "Source Rack", capacity: 50, lightType: "None", totalLayers: 5, currentUsage: 0, status: "Active"
    }).returning().get();

    const rack2 = await db.insert(racks).values({
        name: "Target Rack", capacity: 50, lightType: "LED", totalLayers: 5, currentUsage: 0, status: "Active"
    }).returning().get();

    console.log(`Created Racks: ${rack1.id}, ${rack2.id}`);

    // 2. Create a Batch on Rack 1, Layer 1
    const batch = await db.insert(batches).values({
        name: "Move Test Batch",
        type: "Spawn",
        sourceId: "Test Source",
        startDate: new Date().toISOString(),
        jarCount: 10,
        rackId: rack1.id,
        layer: 1,
        status: "Active",
        stage: "Incubation"
    }).returning().get();

    console.log(`Created Batch: ${batch.id} with 10 jars on Rack ${rack1.id} Layer 1`);

    // Update usage
    await db.update(racks).set({ currentUsage: 10 }).where(eq(racks.id, rack1.id)).run();

    // 3. Move 5 jars to Rack 2, Layer 1
    console.log("Moving 5 jars to Rack 2, Layer 1...");
    try {
        await moveBatchItems([
            { batchId: batch.id, count: 5, sourceRackId: rack1.id, sourceLayer: 1 }
        ], rack2.id, 1);
    } catch (e: any) {
        if (e.message.includes("Invariant")) {
            console.log("Ignored revalidatePath error (expected in script env)");
        } else {
            throw e;
        }
    }

    // 4. Verify Results

    // Check Source Rack Usage (Should be 5)
    const r1 = await db.select().from(racks).where(eq(racks.id, rack1.id)).get();
    console.log(`Source Rack Usage: ${r1?.currentUsage} (Expected 5)`);
    if (r1?.currentUsage !== 5) console.error("FAILED: Source rack usage incorrect");

    // Check Target Rack Usage (Should be 5)
    const r2 = await db.select().from(racks).where(eq(racks.id, rack2.id)).get();
    console.log(`Target Rack Usage: ${r2?.currentUsage} (Expected 5)`);
    if (r2?.currentUsage !== 5) console.error("FAILED: Target rack usage incorrect");

    // Check Locations
    const locs = await db.select().from(batchLocations).where(eq(batchLocations.batchId, batch.id)).all();
    console.log("Batch Locations:", locs);

    // Should have:
    // 1. Rack 1, Layer 1: 5 jars (Migrated from legacy to location, or if partial move, checks logic)
    // 2. Rack 2, Layer 1: 5 jars

    const l1 = locs.find(l => l.rackId === rack1.id && l.layer === 1);
    const l2 = locs.find(l => l.rackId === rack2.id && l.layer === 1);

    if (l1?.quantity === 5 && l2?.quantity === 5) {
        console.log("SUCCESS: Locations verify correctly.");
    } else {
        console.error("FAILED: Locations incorrect.");
    }

    // Cleanup
    await db.delete(batches).where(eq(batches.id, batch.id)).run();
    await db.delete(racks).where(eq(racks.id, rack1.id)).run();
    await db.delete(racks).where(eq(racks.id, rack2.id)).run();
    console.log("Cleanup complete.");
}

main().catch(console.error);
