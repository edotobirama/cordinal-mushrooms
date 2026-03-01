
import { db } from "@/lib/db";
import { batches, processingBatches, inventoryItems, inventoryChecks, racks } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

async function resetData() {
    console.log("Starting data reset...");

    try {
        // 1. Clear transactional tables
        console.log("Clearing inventory checks...");
        await db.delete(inventoryChecks);

        console.log("Clearing inventory items (products)...");
        await db.delete(inventoryItems);

        console.log("Clearing processing batches...");
        await db.delete(processingBatches);

        console.log("Clearing batches...");
        await db.delete(batches);

        // 3. Reset Rack Usage
        console.log("Resetting rack usage...");
        await db.update(racks).set({
            currentUsage: 0
        });

        console.log("✅ Data reset complete! Facility blueprint and raw materials preserved.");
    } catch (error) {
        console.error("❌ Error resetting data:", error);
    }
}

resetData();
