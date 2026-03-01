import { db } from "@/lib/db";
import { batches, racks } from "@/lib/db/schema";
import { getActionsService, getPendingActionCountsService } from "@/lib/services/dashboard";
import { subDays } from "date-fns";

async function testDashboardActions() {
    console.log("--- Seeding Test Data for Dashboard Actions ---");

    // Get a rack to assign batches to
    const testRack = await db.query.racks.findFirst();
    if (!testRack) {
        console.error("No rack found to create test batches on.");
        return;
    }

    const today = new Date();

    // Create a 3-day old LC batch (Should trigger Shaking)
    const lc3Days = await db.insert(batches).values({
        name: "Test-LC-Shake-Alert",
        type: "Liquid Culture",
        sourceId: "Test",
        startDate: subDays(today, 3).toISOString(), // 3 days ago
        rackId: testRack.id,
        layer: 1,
        jarCount: 15,
        stage: "Incubation",
        status: "Active"
    }).returning();
    console.log("Created 3-day old LC Batch (Should need shaking if time passed)");

    // Create a 14-day old Spawn batch (Should trigger Remove Cloth)
    const spawn14Days = await db.insert(batches).values({
        name: "Test-Spawn-Cloth-Alert",
        type: "Spawn",
        sourceId: "Test",
        startDate: subDays(today, 14).toISOString(), // exactly 14 days ago
        rackId: testRack.id,
        layer: 1,
        jarCount: 20,
        stage: "Incubation",
        status: "Active"
    }).returning();
    console.log("Created 14-day old Spawn Batch (Should need Cloth removal)");

    // Create a 21-day old LC batch (Should trigger Switch Lights)
    const lc21Days = await db.insert(batches).values({
        name: "Test-LC-Light-Alert",
        type: "Liquid Culture",
        sourceId: "Test",
        startDate: subDays(today, 21).toISOString(), // 21 days ago
        rackId: testRack.id,
        layer: 1,
        jarCount: 10,
        stage: "Incubation",
        status: "Active"
    }).returning();
    console.log("Created 21-day old LC Batch (Should need Lights ON)");

    // Create a 62-day old Base Culture batch (Should trigger Harvest)
    const bc62Days = await db.insert(batches).values({
        name: "Test-BC-Harvest-Alert",
        type: "Base Culture",
        sourceId: "Test",
        startDate: subDays(today, 62).toISOString(), // 62 days ago
        rackId: testRack.id,
        layer: 1,
        jarCount: 5,
        stage: "Incubation",
        status: "Active"
    }).returning();
    console.log("Created 62-day old Base Culture Batch (Should need Harvesting)");

    console.log("\n--- Fetching Dashboard Actions ---");

    const counts = await getPendingActionCountsService(db);
    console.log("\nPending Action Jar Counts:");
    console.log("- Remove Cloth:", counts.removeCloth);
    console.log("- Switch Lights:", counts.switchLights);
    console.log("- Harvest Ready:", counts.harvestReady);
    console.log("- Shaking Needed (LC):", counts.shakingNeeded);

    const actionsList = await getActionsService(db);
    console.log(`\nAction Required Today List (${actionsList.length} items):`);
    for (const a of actionsList) {
        console.log(`- [${a.type}] ${a.message}`);
    }
}

testDashboardActions().catch(console.error);
