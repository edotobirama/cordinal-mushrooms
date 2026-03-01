
import { db } from "@/lib/db";
import { racks, rackLayers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateLayerColorService } from "@/lib/services/facility";

async function verifyLightToggle() {
    console.log("Starting Light Toggle Verification...");

    // 1. Get a test rack
    let rack = await db.query.racks.findFirst();
    if (!rack) {
        console.log("No rack found, creating one...");
        const res = await db.insert(racks).values({
            name: "Test-Light-Rack",
            capacity: 100,
            status: "Active",
            width: 2,
            height: 1,
            material: "Steel",
            totalLayers: 7,
            currentUsage: 0,
            lightType: "LED"
        }).returning();
        rack = res[0];
    }
    console.log(`Using Rack: ${rack.name} (ID: ${rack.id})`);

    const layerNum = 1;

    // 2. Set Light to Blue
    console.log("Setting Light to Blue...");
    await updateLayerColorService(db, rack.id, layerNum, "Blue");

    let layer = await db.query.rackLayers.findFirst({
        where: and(eq(rackLayers.rackId, rack.id), eq(rackLayers.layer, layerNum))
    });
    console.log("Layer color after Blue:", layer?.color);
    if (layer?.color !== "Blue") console.error("❌ Failed to set Blue");

    // 3. Set Light to Off
    console.log("Setting Light to Off...");
    await updateLayerColorService(db, rack.id, layerNum, "Off");

    layer = await db.query.rackLayers.findFirst({
        where: and(eq(rackLayers.rackId, rack.id), eq(rackLayers.layer, layerNum))
    });
    console.log("Layer color after Off:", layer?.color);
    if (layer?.color !== "Off") console.error("❌ Failed to set Off");

    console.log("Verification Complete!");
}

verifyLightToggle().catch(console.error);
