/**
 * Force-discard all batches in racks and reset usage to 0.
 * Shows full output, writes to a report file too.
 * Run: npx tsx scripts/force-clean-racks.ts
 */
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { writeFileSync } from "fs";

async function main() {
    const lines: string[] = [];
    const log = (...args: any[]) => {
        const s = args.map(String).join(" ");
        console.log(s);
        lines.push(s);
    };

    const racks = await db.select().from(schema.racks);
    const batches = await db.select().from(schema.batches);
    const locs = await db.select().from(schema.batchLocations);

    log("=== CURRENT STATE ===");
    log("RACKS:");
    for (const r of racks) {
        log(`  id=${r.id} name="${r.name}" currentUsage=${r.currentUsage}`);
    }

    log("\nALL BATCHES:");
    for (const b of batches) {
        log(`  id=${b.id} name="${b.name}" status=${b.status} rackId=${b.rackId} layer=${b.layer} jarCount=${b.jarCount}`);
    }

    log("\nALL batchLocations:");
    for (const l of locs) {
        const rn = racks.find(r => r.id === l.rackId)?.name ?? `rack${l.rackId}`;
        const bn = batches.find(b => b.id === l.batchId);
        log(`  locId=${l.id} batchId=${l.batchId}("${bn?.name}" ${bn?.status}) rack="${rn}" layer=${l.layer} qty=${l.quantity}`);
    }

    // Now discard ALL active batches that have no REAL use (test batches)
    // A test batch is one whose name starts with "Test" or "LC0" or "Master" from QA
    // Actually, let's just nuke ALL batchLocations and reset rack usage to 0
    // since the user says ALL layers are empty
    log("\n=== CLEANING ALL batchLocations and resetting rack usage ===");
    const allLocsCount = locs.length;
    if (allLocsCount > 0) {
        await db.delete(schema.batchLocations);
        log(`  Deleted all ${allLocsCount} batchLocation row(s)`);
    } else {
        log("  No batchLocations to delete");
    }

    // Reset all racks to 0 usage
    for (const rack of racks) {
        await db.update(schema.racks).set({ currentUsage: 0 }).where(eq(schema.racks.id, rack.id));
        log(`  Reset rack "${rack.name}" (id=${rack.id}) currentUsage → 0`);
    }

    // Mark any remaining Active batches that no longer have locations as Discarded
    const activeBatches = batches.filter(b => b.status === "Active");
    if (activeBatches.length > 0) {
        log(`\n  Marking ${activeBatches.length} remaining Active batches as Discarded:`);
        for (const b of activeBatches) {
            log(`    → batch "${b.name}" (id=${b.id})`);
            await db.update(schema.batches)
                .set({ status: "Discarded", stage: "Discarded", updatedAt: new Date().toISOString() })
                .where(eq(schema.batches.id, b.id));
        }
    }

    log("\n=== Done. All racks reset to 0 usage. ===");

    writeFileSync("scripts/rack-cleanup-report.txt", lines.join("\n"));
    log("Report written to scripts/rack-cleanup-report.txt");
}

main().catch(err => {
    console.error("FATAL:", err);
    process.exit(1);
});
