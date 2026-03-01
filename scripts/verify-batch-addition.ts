
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite, { schema });

async function verifyBatchAddition() {
    console.log("Starting verification...");

    // 1. Create a test rack
    const rackName = "Test Rack " + Date.now();
    const rackResult = await db.insert(schema.racks).values({
        name: rackName,
        capacity: 100,
        currentUsage: 0,
        totalLayers: 5,
        status: "Active"
    }).returning({ id: schema.racks.id });

    const rackId = rackResult[0].id;
    console.log(`Created Rack: ${rackName} (ID: ${rackId})`);

    // 2. Simulate startBatch
    const batchName = "Test-Batch-" + Date.now();
    const batchResult = await db.insert(schema.batches).values({
        name: batchName,
        type: "Liquid Culture",
        sourceId: "Test Source",
        startDate: new Date().toISOString(),
        rackId: rackId,
        layer: 1,
        jarCount: 10,
        status: "Active",
        stage: "Incubation"
    }).returning({ id: schema.batches.id });

    const batchId = batchResult[0].id;
    console.log(`Created Batch: ${batchName} (ID: ${batchId})`);

    // 3. Simulate process locations (single location)
    await db.insert(schema.batchLocations).values({
        batchId: batchId,
        rackId: rackId,
        layer: 1,
        quantity: 10
    });
    console.log("Inserted into batchLocations");

    // 4. Verify data via getRackDetails query logic
    const locs = await db.select({
        id: schema.batches.id,
        name: schema.batches.name,
        jarCount: schema.batchLocations.quantity,
        layer: schema.batchLocations.layer,
        status: schema.batches.status
    })
        .from(schema.batchLocations)
        .leftJoin(schema.batches, eq(schema.batchLocations.batchId, schema.batches.id))
        .where(eq(schema.batchLocations.rackId, rackId));

    console.log(`Query result for Rack ${rackId}:`, locs);

    if (locs.length === 1 && locs[0].id === batchId) {
        console.log("SUCCESS: Batch found in rack details query.");
    } else {
        console.error("FAILURE: Batch NOT found in rack details query.");
    }

    // Cleanup
    // await db.delete(schema.batchLocations).where(eq(schema.batchLocations.batchId, batchId));
    // await db.delete(schema.batches).where(eq(schema.batches.id, batchId));
    // await db.delete(schema.racks).where(eq(schema.racks.id, rackId));
}

verifyBatchAddition().catch(console.error);
