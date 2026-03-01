import { db } from "@/lib/db";
import { batches, racks, inventoryItems } from "@/lib/db/schema";
import { sql, inArray, not } from "drizzle-orm";

async function verifyDashboardData() {
    console.log("--- Checking Database Totals for Dashboard ---");

    // Incubation Room (Active Batches)
    const activeBatches = await db.select().from(batches).where(not(inArray(batches.status, ["Harvested", "Discarded", "Processing", "Complete"])));

    let spawnCount = 0;
    let lcCount = 0;
    let agarCount = 0;

    for (const b of activeBatches) {
        if (b.type === "Spawn" || b.type === "Grain" || b.type === "Basal Medium") spawnCount += b.jarCount;
        else if (b.type === "Liquid Culture") lcCount += b.jarCount;
        else if (b.type === "Base Culture") agarCount += b.jarCount;
    }

    console.log(`Incubation Spawn: ${spawnCount}`);
    console.log(`Incubation LC: ${lcCount}`);
    console.log(`Incubation Base Culture: ${agarCount}`);

    // Storage
    const storageItem = await db.select().from(inventoryItems);
    let sLc = 0;
    let sSpawn = 0;
    let sAgar = 0;
    let sFruit = 0;

    for (const item of storageItem) {
        if (item.type === "Liquid-Culture") sLc += item.quantity;
        else if (item.type === "Base Culture") sAgar += item.quantity;
        else if (item.type === "Spawn") sSpawn += item.quantity;
        else if (item.type === "Dried-Sealed" || item.type === "Dried-Capsule") sFruit += item.quantity;
    }

    console.log(`Storage LC: ${sLc}`);
    console.log(`Storage Spawn: ${sSpawn}`);
    console.log(`Storage Base Culture: ${sAgar}`);
    console.log(`Storage Fruit: ${sFruit}`);

    // Capacity
    const allRacks = await db.select().from(racks);
    const cap = allRacks.reduce((sum, r) => sum + r.capacity, 0);
    console.log(`Total Capacity: ${cap}`);
}

verifyDashboardData().catch(console.error);
