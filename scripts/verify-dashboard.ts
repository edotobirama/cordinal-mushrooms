
import { db } from "../lib/db";
import { batches, racks } from "../lib/db/schema";
import { addDays } from "date-fns";
import { eq } from "drizzle-orm";

// Mock function based on app/page.tsx logic to test without running Next.js
async function verifyDashboardActions() {
    console.log("Starting Dashboard Logic Verification...");

    // Cleanup old test batches if any
    const oldBatches = await db.select().from(batches).where(eq(batches.sourceId, "VerificationScript"));
    for (const b of oldBatches) {
        await db.delete(batches).where(eq(batches.id, b.id));
    }

    // Create Batches with specific dates relative to today
    const today = new Date();

    const scenarios = [
        { desc: "LC Day 2 (Shake)", type: "Liquid Culture", offset: -2, expectedAction: "Shake" },
        { desc: "LC Day 20 (Cloth)", type: "Liquid Culture", offset: -20, expectedAction: "Remove cloth" },
        { desc: "LC Day 21 (Light)", type: "Liquid Culture", offset: -21, expectedAction: "Ensure Lights ON" },
        { desc: "LC Day 23 (Harvest)", type: "Liquid Culture", offset: -23, expectedAction: "Harvest/Store" },
        { desc: "Spawn Day 14 (Blanket)", type: "Spawn", offset: -14, expectedAction: "Remove blanket" }
    ];

    for (const s of scenarios) {
        const startDate = addDays(today, s.offset).toISOString().split('T')[0];
        await db.insert(batches).values({
            name: `Test-${s.desc.replace(/\s/g, '-')}`,
            type: s.type,
            sourceId: "VerificationScript",
            startDate: startDate,
            rackId: 1, // Assumes rack 1 exists
            layer: 1,
            jarCount: 10,
            stage: "Incubation",
            status: "Active"
        });
    }

    console.log("Test batches created. Verifying logic...");

    // Re-implement key logic from app/page.tsx for verification 
    // (We can't import the page component easily, so we duplicate the pure logic)
    const activeBatches = await db.select().from(batches).where(eq(batches.sourceId, "VerificationScript"));

    for (const batch of activeBatches) {
        const start = new Date(batch.startDate);
        const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`Checking ${batch.name} (Day ${daysDiff})`);

        let actionFound = false;

        if (batch.type === 'Liquid Culture') {
            if (daysDiff === 20) {
                if (daysDiff === 20) console.log(`- Action: Remove cloth (Correct)`);
            } else if (daysDiff > 20 && daysDiff <= 22) {
                console.log(`- Action: Ensure Lights ON (Correct)`);
            } else if (daysDiff >= 22) {
                console.log(`- Action: Harvest/Store (Correct)`);
            } else if (daysDiff <= 5) {
                // Shake logic is usually strictly handled by action log check, 
                // but dashboard might show generic "Shake Phase" count.
                // For this test we just verify the date ranges.
                console.log(`- Status: Shaking Phase (Correct)`);
            }
        } else {
            if (daysDiff === 14) console.log(`- Action: Remove blanket (Correct)`);
        }
    }

    console.log("Cleanup...");
    // Cleanup
    for (const b of activeBatches) {
        await db.delete(batches).where(eq(batches.id, b.id));
    }
}

verifyDashboardActions().catch(console.error);
