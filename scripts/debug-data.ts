
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

async function main() {
    console.log("--- RACKS ---");
    const racks = await db.select().from(schema.racks);
    console.table(racks);

    console.log("\n--- BATCHES ---");
    const batches = await db.select().from(schema.batches);
    console.table(batches);

    console.log("\n--- BATCH LOCATIONS ---");
    const locations = await db.select().from(schema.batchLocations);
    console.table(locations);

    console.log("\n--- INVENTORY ITEMS ---");
    const items = await db.select().from(schema.inventoryItems);
    console.table(items);
}

main().catch(console.error);
