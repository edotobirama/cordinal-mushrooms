import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../lib/db/schema';
import path from 'path';
import fs from 'fs';

async function backfill() {
    // We run this locally against the dev DB. The production DB will run this when we deploy.
    let dbPath = path.resolve(process.cwd(), "sqlite.db");
    
    // If not found locally, try the data/ dir
    if (!fs.existsSync(dbPath)) {
        dbPath = path.resolve(process.cwd(), "data", "sqlite.db");
    }

    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, { schema });

    const allBatches = await db.select().from(schema.batches);
    let createdJars = 0;

    for (const batch of allBatches) {
        // Check if jars already exist
        const existingJars = await db.select().from(schema.batchJars).where(
            (schema.batchJars.batchId, 'eq', batch.id)
        ); // Wait, drizzle where needs eq()
        
        // Let's do raw query for simplicity
        const stmt = sqlite.prepare(`SELECT count(*) as count FROM batch_jars WHERE batch_id = ?`);
        const { count } = stmt.get(batch.id) as { count: number };
        
        if (count === 0 && batch.jarCount > 0) {
            console.log(`Backfilling ${batch.jarCount} jars for batch ${batch.name}...`);
            
            const insertStmt = sqlite.prepare(`INSERT INTO batch_jars (batch_id, jar_index, status) VALUES (?, ?, ?)`);
            
            const insertMany = sqlite.transaction(() => {
                for (let i = 1; i <= batch.jarCount; i++) {
                    insertStmt.run(batch.id, i, batch.status === 'Discarded' ? 'Discarded' : (batch.status === 'Harvested' ? 'Harvested' : 'Active'));
                }
            });
            
            insertMany();
            createdJars += batch.jarCount;
        }
    }

    console.log(`Successfully backfilled ${createdJars} jars across ${allBatches.length} batches.`);
}

backfill().catch(console.error);
