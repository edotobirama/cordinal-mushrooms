
import { db } from "@/lib/db";
import { racks, rackLayers } from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

async function updateRacks() {
    console.log("Updating rack configurations...");

    // 1. Set 288 capacity racks to Concrete, 4 layers
    const res288 = await db.update(racks)
        .set({
            material: "Cement", // Schema says 'Cement' or 'Steel', user said 'Concrete' which likely maps to 'Cement'
            totalLayers: 4
        })
        .where(eq(racks.capacity, 288))
        .returning();
    console.log(`Updated ${res288.length} racks with capacity 288.`);

    // 2. Set 350 capacity racks to 7 layers
    const res350 = await db.update(racks)
        .set({ totalLayers: 7 })
        .where(eq(racks.capacity, 350))
        .returning();
    console.log(`Updated ${res350.length} racks with capacity 350.`);

    // 3. Set 300 capacity racks to 6 layers
    const res300 = await db.update(racks)
        .set({ totalLayers: 6 })
        .where(eq(racks.capacity, 300))
        .returning();
    console.log(`Updated ${res300.length} racks with capacity 300.`);

    // 4. Set E1, E2, E3 6th layer to pink
    const targetRacks = await db.select().from(racks).where(inArray(racks.name, ["E1", "E2", "E3"]));

    for (const rack of targetRacks) {
        // Ensure 6th layer is Pink
        // UPSERT logic manually since SQLite implementation in Drizzle might vary
        const existingLayer = await db.select().from(rackLayers).where(
            sql`${rackLayers.rackId} = ${rack.id} AND ${rackLayers.layer} = 6`
        ).get();

        if (existingLayer) {
            await db.update(rackLayers)
                .set({ color: "Pink", updatedAt: new Date().toISOString() })
                .where(eq(rackLayers.id, existingLayer.id));
            console.log(`Updated Rack ${rack.name} (ID: ${rack.id}) Layer 6 to Pink.`);
        } else {
            await db.insert(rackLayers).values({
                rackId: rack.id,
                layer: 6,
                color: "Pink"
            });
            console.log(`Inserted Pink color for Rack ${rack.name} (ID: ${rack.id}) Layer 6.`);
        }
    }

    console.log("✅ Rack Configuration Update Complete.");
    process.exit(0);
}

updateRacks().catch((err) => {
    console.error("Update failed:", err);
    process.exit(1);
});
