
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../lib/db/schema';
import { eq, isNull, leftJoin } from 'drizzle-orm';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite, { schema });

async function checkOrphans() {
    console.log("Checking for orphaned batches...");

    // Find batches that have NO entry in batch_locations
    // We can do this by getting all batches and checking if they have locations

    // Drizzle query: Select batches left join locations, where location.id is null

    /* 
       NOTE: Drizzle's join syntax with simple select can be tricky for "orphans".
       Let's just fetch all matches and filter in JS for simplicity/reliability in this script.
    */

    const allBatches = await db.select().from(schema.batches);
    const allLocations = await db.select().from(schema.batchLocations);

    console.log(`Total Batches: ${allBatches.length}`);
    console.log(`Total Locations: ${allLocations.length}`);

    const locationBatchIds = new Set(allLocations.map(l => l.batchId));

    const orphans = allBatches.filter(b => !locationBatchIds.has(b.id));

    if (orphans.length > 0) {
        console.log(`FOUND ${orphans.length} ORPHANED BATCHES!`);
        orphans.forEach(b => {
            console.log(` - ID: ${b.id}, Name: ${b.name}, Rack: ${b.rackId}, Layer: ${b.layer}, Qty: ${b.jarCount}, Status: ${b.status}`);
        });

        // Attempt Repair?
        // logic: Insert into batchLocations based on batch data
        console.log("\nAttempting Repair...");
        for (const b of orphans) {
            if (b.status !== 'Discarded' && b.status !== 'Harvested') {
                console.log(`Refilling location for Batch ${b.id}...`);
                await db.insert(schema.batchLocations).values({
                    batchId: b.id,
                    rackId: b.rackId,
                    layer: b.layer || 1,
                    quantity: b.jarCount
                });
            } else {
                console.log(`Skipping Batch ${b.id} because status is ${b.status}`);
            }
        }
        console.log("Repair Complete.");

    } else {
        console.log("No orphaned batches found. Data integrity looks okay regarding batch->location mapping.");
    }
}

checkOrphans().catch(console.error);
