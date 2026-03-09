import { db } from "@/lib/db";
import { racks, rackLayers, batches, batchLocations } from "@/lib/db/schema";
import { subDays, formatISO } from "date-fns";

async function seedLightTestData() {
    console.log("Seeding Light Test Data...");

    // Create a new rack
    const rackRes = await db.insert(racks).values({
        name: "Light Test Rack",
        capacity: 100,
        status: "Active",
        width: 3,
        height: 1,
        material: "Steel",
        totalLayers: 5,
        currentUsage: 50,
        lightType: "White"
    }).returning();
    const rack = rackRes[0];
    console.log(`Created Rack: ${rack.name} (ID: ${rack.id})`);

    // Create Layers 1 and 2 with Light 1 On, Light 2 On
    await db.insert(rackLayers).values([
        { rackId: rack.id, layer: 1, light1: true, light2: false, color: 'White' },
        { rackId: rack.id, layer: 2, light1: false, light2: true, color: 'White' },
        { rackId: rack.id, layer: 3, light1: false, light2: false, color: 'Off' }
    ]);

    const today = new Date();

    // Seed Batches
    // 1. Day 13 - No actions yet
    // 2. Day 14 - Remove Cloth
    // 3. Day 15 - Light 1
    // 4. Day 18 - Light 2
    // 5. Day 62 - Harvest

    const testCases = [
        { name: 'Day 13 Batch', days: 13, layer: 3 },
        { name: 'Day 14 (Remove Cloth)', days: 14, layer: 3 },
        { name: 'Day 15 (Light 1)', days: 15, layer: 3 },
        { name: 'Day 18 (Light 2)', days: 18, layer: 3 },
        { name: 'Day 62 (Harvest)', days: 62, layer: 3 },
    ];

    for (const tc of testCases) {
        const startDate = formatISO(subDays(today, tc.days));
        const batchRes = await db.insert(batches).values({
            name: tc.name,
            sourceId: "TEST-L1",
            startDate: startDate,
            rackId: rack.id,
            layer: tc.layer,
            type: "Jars",
            jarCount: 10,
            stage: "Incubation"
        }).returning();

        await db.insert(batchLocations).values({
            batchId: batchRes[0].id,
            rackId: rack.id,
            layer: tc.layer,
            quantity: 10
        });

        console.log(`Seeded Batch: ${tc.name} [Age: ${tc.days} days]`);
    }

    console.log("Done! You can verify these on the Dashboard and Facility Blueprint.");
}

seedLightTestData().catch(console.error);
