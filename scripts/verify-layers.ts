
import { db } from "@/lib/db";
import { racks, rackLayers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

async function verifyLayers() {
    console.log("Verifying rack layers...");

    // 1. Check E1, E2, E3 6th layer
    const eRacks = await db.select().from(racks).where(inArray(racks.name, ["E1", "E2", "E3"]));
    for (const rack of eRacks) {
        const layer = await db.select().from(rackLayers).where(
            and(eq(rackLayers.rackId, rack.id), eq(rackLayers.layer, 6))
        ).limit(1);

        if (layer.length > 0) {
            console.log(`Rack ${rack.name} Layer 6 Color: ${layer[0].color} (Expected: Pink)`);
        } else {
            console.log(`Rack ${rack.name} Layer 6: NOT FOUND`);
        }
    }

    // 2. Test update persistence
    if (eRacks.length > 0) {
        const testRack = eRacks[0];
        const testLayer = 1;
        const newColor = "Blue";

        console.log(`Testing update on Rack ${testRack.name} Layer ${testLayer} to ${newColor}...`);

        // Update logic from actions.ts
        const existing = await db.select().from(rackLayers).where(
            and(
                eq(rackLayers.rackId, testRack.id),
                eq(rackLayers.layer, testLayer)
            )
        ).limit(1);

        if (existing.length === 0) {
            await db.insert(rackLayers).values({
                rackId: testRack.id,
                layer: testLayer,
                color: newColor,
            });
            console.log("Inserted new layer record.");
        } else {
            await db.update(rackLayers)
                .set({ color: newColor, updatedAt: new Date().toISOString() })
                .where(eq(rackLayers.id, existing[0].id));
            console.log("Updated existing layer record.");
        }

        // Verify
        const updatedLayer = await db.select().from(rackLayers).where(
            and(eq(rackLayers.rackId, testRack.id), eq(rackLayers.layer, testLayer))
        ).limit(1);

        if (updatedLayer.length > 0 && updatedLayer[0].color === newColor) {
            console.log("✅ Persistence Test PASSED");
        } else {
            console.log("❌ Persistence Test FAILED. Got: " + (updatedLayer.length > 0 ? updatedLayer[0].color : "Nothing"));
        }

        // Cleanup (set back to White)
        await db.update(rackLayers)
            .set({ color: "White", updatedAt: new Date().toISOString() })
            .where(and(eq(rackLayers.rackId, testRack.id), eq(rackLayers.layer, testLayer)));
    }

    process.exit(0);
}

verifyLayers().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
});
