
import { db } from "@/lib/db";
import { batches, racks } from "@/lib/db/schema";
import { addDays, subDays } from "date-fns";

async function seed() {
    console.log("Seeding notification test data...");

    // Ensure we have a rack
    let rack = await db.select().from(racks).limit(1).get();
    if (!rack) {
        console.log("Creating default rack...");
        const result = await db.insert(racks).values({
            name: "Test Rack",
            capacity: 100,
            lightType: "White",
            width: 2,
            height: 1,
            material: "Steel",
            totalLayers: 5
        }).returning();
        rack = result[0];
    }

    const today = new Date();

    // Batch for Blanket Removal (Day 14) -> Started 14 days ago
    await db.insert(batches).values({
        name: "Test-Blanket-Batch",
        sourceId: "LC-TEST-1",
        startDate: subDays(today, 14).toISOString(),
        rackId: rack.id,
        layer: 1,
        jarCount: 10,
        stage: "Incubation",
        status: "Active"
    });

    // Batch for Lights On (Day 16) -> Started 16 days ago
    await db.insert(batches).values({
        name: "Test-Light-Batch",
        sourceId: "LC-TEST-2",
        startDate: subDays(today, 16).toISOString(),
        rackId: rack.id,
        layer: 2,
        jarCount: 10,
        stage: "Incubation",
        status: "Active"
    });

    // Batch for Harvest (Day 60) -> Started 60 days ago
    await db.insert(batches).values({
        name: "Test-Harvest-Batch",
        sourceId: "LC-TEST-3",
        startDate: subDays(today, 60).toISOString(),
        rackId: rack.id,
        layer: 3,
        jarCount: 10,
        stage: "Fruiting",
        status: "Active"
    });

    console.log("✅ Seeded 3 test batches!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
