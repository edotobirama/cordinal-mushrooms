
import { db } from "@/lib/db";
import { racks, rackLayers } from "@/lib/db/schema";
import { eq, inArray, notInArray } from "drizzle-orm";

async function main() {
    const targetRacks = await db.select().from(racks);

    // Filter out L4, L5, L6 (matching names or close variations just in case)
    // User said "L4,,5,6". Assuming L4, L5, L6.
    // Also check for "5" and "6" just in case named that way, but list showed L5, L6.
    const excludedNames = ["L4", "L5", "L6"];

    console.log(`Initial Rack Count: ${targetRacks.length}`);

    let updatedCount = 0;

    for (const rack of targetRacks) {
        if (excludedNames.includes(rack.name)) {
            console.log(`Skipping Rack ${rack.name} (ID: ${rack.id})`);
            continue;
        }

        const newLayerIndex = rack.totalLayers + 1;
        console.log(`Updating Rack ${rack.name} (ID: ${rack.id}): Adding Layer ${newLayerIndex} (Dark)`);

        try {
            await db.transaction(async (tx) => {
                // 1. Update Rack Total Layers
                await tx.update(racks)
                    .set({ totalLayers: newLayerIndex })
                    .where(eq(racks.id, rack.id));

                // 2. Add Rack Layer Entry
                await tx.insert(rackLayers).values({
                    rackId: rack.id,
                    layer: newLayerIndex,
                    color: "Dark"
                });
            });
            updatedCount++;
        } catch (e) {
            console.error(`Failed to update Rack ${rack.name}:`, e);
        }
    }

    console.log(`\nOperation Complete. Updated ${updatedCount} racks.`);
}

main();
