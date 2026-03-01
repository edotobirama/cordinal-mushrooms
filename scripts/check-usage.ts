
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite, { schema });

async function checkUsageDiscrepancy() {
    console.log("Checking Rack Usage Discrepancies...");

    const racks = await db.select().from(schema.racks);
    const issues = [];

    for (const rack of racks) {
        // Calculate actual usage from batchLocations
        // Note: We need to filter out Culture batches if they don't count?
        // Wait, schema says: "currentUsage"
        // And use-production.ts says: 
        // if (!["Liquid Culture", "Base Culture", "Basal Medium"].includes(type)) { update usage }

        // So we need to join batches to check type
        const locs = await db.select({
            qty: schema.batchLocations.quantity,
            type: schema.batches.type
        })
            .from(schema.batchLocations)
            .leftJoin(schema.batches, eq(schema.batchLocations.batchId, schema.batches.id))
            .where(eq(schema.batchLocations.rackId, rack.id));

        let calculatedUsage = 0;
        for (const loc of locs) {
            // Logic must match use-production.ts: ALL types now count.
            calculatedUsage += loc.qty;
        }

        if (rack.currentUsage !== calculatedUsage) {
            console.log(`[MISMATCH] Rack ${rack.id} (${rack.name}): stored=${rack.currentUsage}, calculated=${calculatedUsage}`);
            issues.push({ rackId: rack.id, correct: calculatedUsage });
        } else {
            // console.log(`[OK] Rack ${rack.id}: ${rack.currentUsage}`);
        }
    }

    if (issues.length > 0) {
        console.log(`Found ${issues.length} racks with usage mismatches.`);
        console.log("Fixing...");
        for (const issue of issues) {
            await db.update(schema.racks)
                .set({ currentUsage: issue.correct })
                .where(eq(schema.racks.id, issue.rackId));
            console.log(`Updated Rack ${issue.rackId} to ${issue.correct}`);
        }
        console.log("Fix Complete.");
    } else {
        console.log("All rack usage counts are correct.");
    }
}

checkUsageDiscrepancy().catch(console.error);
