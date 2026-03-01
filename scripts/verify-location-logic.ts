
import { db } from "../lib/db";
import { batches, batchLocations, racks } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { startBatch } from "../app/production/actions";
import { getRackDetails } from "../app/facility/actions";

async function verify() {
    console.log("Starting Multi-Location Verification...");

    // 1. Setup: Ensure we have 2 racks
    let rackA = await db.query.racks.findFirst({ where: eq(racks.name, "Test Rack A") });
    if (!rackA) {
        const res = await db.insert(racks).values({
            name: "Test Rack A", capacity: 100, currentUsage: 0,
            totalLayers: 7, lightType: "White", material: "Steel"
        }).returning();
        rackA = res[0];
    }

    let rackB = await db.query.racks.findFirst({ where: eq(racks.name, "Test Rack B") });
    if (!rackB) {
        const res = await db.insert(racks).values({
            name: "Test Rack B", capacity: 100, currentUsage: 0,
            x: 5, totalLayers: 7, lightType: "White", material: "Steel"
        }).returning();
        rackB = res[0];
    }

    // 2. Simulate Form Submission for Multi-Location Batch
    const locations = [
        { rackId: rackA.id, layer: 1, quantity: 25 },
        { rackId: rackB.id, layer: 3, quantity: 30 }
    ];

    const formData = new FormData();
    formData.append("name", "Test-Multi-Loc-Batch");
    formData.append("type", "Liquid Culture"); // Should derive LC
    formData.append("sourceId", "New Source");
    formData.append("startDate", new Date().toISOString().split('T')[0]);
    formData.append("locations", JSON.stringify(locations));

    // Simulate legacy fields being set by UI
    formData.append("rackId", locations[0].rackId.toString());
    formData.append("layer", locations[0].layer.toString());
    formData.append("jarCount", "55"); // Total

    console.log("Creating batch...");
    try {
        await startBatch(formData);
    } catch (e: any) {
        if (e.message.includes("static generation store missing")) {
            console.log("Ignoring revalidatePath error (expected in script)");
        } else {
            throw e;
        }
    }

    // 3. Verify Database Records
    // The batch name logic uses "Master" if source is not found, but "External" for sourceId field.
    // Let's just key off the specific name we observed in logs or generally latest.
    const batch = await db.query.batches.findFirst({
        orderBy: (batches, { desc }) => [desc(batches.id)]
    });

    if (!batch) {
        console.error("Batch creation failed: Batch not found.");
        return;
    }
    console.log(`Batch Created: ID ${batch.id}, Name ${batch.name}, Total ${batch.jarCount}`);

    const locs = await db.select().from(batchLocations).where(eq(batchLocations.batchId, batch.id));
    console.log("Locations found:", locs.length);
    locs.forEach(l => console.log(`- Rack ${l.rackId}, Layer ${l.layer}, Qty ${l.quantity}`));

    if (locs.length !== 2) throw new Error("Expected 2 location records");

    // 4. Verify getRackDetails
    console.log("Checking Rack A Details...");
    const detailsA = await getRackDetails(rackA.id);
    const batchInA = detailsA?.batches.find(b => b.id === batch.id);
    console.log(`Batch in Rack A: Quantity ${batchInA?.jarCount} (Expected 25)`);

    if (batchInA?.jarCount !== 25) throw new Error("Incorrect quantity in Rack A");

    console.log("Checking Rack B Details...");
    const detailsB = await getRackDetails(rackB.id);
    const batchInB = detailsB?.batches.find(b => b.id === batch.id);
    console.log(`Batch in Rack B: Quantity ${batchInB?.jarCount} (Expected 30)`);

    if (batchInB?.jarCount !== 30) throw new Error("Incorrect quantity in Rack B");

    console.log("Verification Successful!");
}

verify().catch(console.error);
