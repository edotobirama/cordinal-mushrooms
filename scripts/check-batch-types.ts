
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking Batch Types...");

    const batches = await db.select({
        type: schema.batches.type,
        status: schema.batches.status,
        count: sql<number>`count(*)`,
        totalJars: sql<number>`sum(${schema.batches.jarCount})`
    })
        .from(schema.batches)
        .groupBy(schema.batches.type, schema.batches.status);

    console.table(batches);
}

main().catch(console.error);
