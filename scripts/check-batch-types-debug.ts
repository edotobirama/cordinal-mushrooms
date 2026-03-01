
import { db } from "@/lib/db";
import { batches, inventoryItems } from "@/lib/db/schema";
import { count, eq, sql } from "drizzle-orm";

async function checkTypes() {
    const types = await db
        .select({
            type: batches.type,
            count: count(),
        })
        .from(batches)
        .groupBy(batches.type);

    console.log("Distinct Batch Types:", types);

    const inventoryTypes = await db
        .select({
            type: inventoryItems.type,
            count: count()
        })
        .from(inventoryItems)
        .groupBy(inventoryItems.type);

    console.log("Distinct Inventory Types:", inventoryTypes);
}

checkTypes();
