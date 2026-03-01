import { db } from "@/lib/db";
import { batches } from "@/lib/db/schema";
import { count, eq, sql, and, gte, lte } from "drizzle-orm";
import { differenceInCalendarDays, parseISO, subDays, format } from "date-fns";

async function verifyDashboardMetrics() {
    console.log("Verifying Dashboard Metrics...");

    // Seed Test Data
    console.log("Seeding test data...");
    const today = new Date();

    const testBatches = [
        {
            name: "Test-Cloth-14",
            sourceId: "Test",
            startDate: format(subDays(today, 14), "yyyy-MM-dd"),
            rackId: 1,
            jarCount: 10,
            status: "Active",
            type: "Spawn"
        },
        {
            name: "Test-Lights-16",
            sourceId: "Test",
            startDate: format(subDays(today, 16), "yyyy-MM-dd"),
            rackId: 1,
            jarCount: 20,
            status: "Active",
            type: "Spawn"
        },
        {
            name: "Test-Harvest-60",
            sourceId: "Test",
            startDate: format(subDays(today, 60), "yyyy-MM-dd"),
            rackId: 1,
            jarCount: 30,
            status: "Active",
            type: "Spawn"
        }
    ];

    const insertedIds = [];
    for (const b of testBatches) {
        const result = await db.insert(batches).values(b as any).returning({ insertedId: batches.id });
        insertedIds.push(result[0].insertedId);
    }

    const allActiveBatches = await db
        .select()
        .from(batches)
        .where(eq(batches.status, "Active"));

    let removeClothCount = 0;
    let switchLightsCount = 0;
    let harvestReadyCount = 0;

    console.log(`Total Active Batches: ${allActiveBatches.length}`);

    // Recalculate with the exact logic I plan to implement
    const removeClothJars = allActiveBatches
        .filter(b => differenceInCalendarDays(today, parseISO(b.startDate)) === 14)
        .reduce((sum, b) => sum + b.jarCount, 0);

    const switchLightsJars = allActiveBatches
        .filter(b => differenceInCalendarDays(today, parseISO(b.startDate)) === 16)
        .reduce((sum, b) => sum + b.jarCount, 0);

    const harvestReadyJars = allActiveBatches
        .filter(b => {
            const d = differenceInCalendarDays(today, parseISO(b.startDate));
            return d >= 60 && d < 65;
        })
        .reduce((sum, b) => sum + b.jarCount, 0);

    console.log("--- Metrics (With Seeded Data) ---");
    console.log(`Remove Cloth Jars (Day 14) [Expected 10]: ${removeClothJars}`);
    console.log(`Switch On Lights Jars (Day 16) [Expected 20]: ${switchLightsJars}`);
    console.log(`Harvest Ready Jars (Day 60-65) [Expected 30]: ${harvestReadyJars}`);

    // Cleanup
    console.log("Cleaning up test data...");
    for (const id of insertedIds) {
        await db.delete(batches).where(eq(batches.id, id));
    }
}

verifyDashboardMetrics();
