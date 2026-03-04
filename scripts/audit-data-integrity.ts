/**
 * CORDINAL MUSHROOMS — Data Integrity Audit
 * Run: npx tsx scripts/audit-data-integrity.ts
 *
 * Checks for:
 * 1. Ghost batchLocations (for Harvested/Discarded batches)
 * 2. Rack currentUsage mismatches vs actual batchLocations sum
 * 3. Orphan inventoryItems (batchId points to non-existent batch)
 * 4. Orphan batchActions (batchId points to non-existent batch)
 * 5. Orphan rackLayers (rackId points to non-existent rack)
 * 6. Duplicate inventoryItems (same name+type+isPreserved, multiple rows)
 * 7. batches with rackId/layer out of sync vs batchLocations primary location
 * 8. Active batches with NO batchLocations entry
 *
 * Auto-fixes: ghost batchLocations, usage mismatches
 */

import { db, sqlite } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq, and, not, inArray, sql } from "drizzle-orm";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

let totalIssues = 0;
let totalFixed = 0;

function section(title: string) {
    console.log(`\n${BOLD}${CYAN}── ${title} ──${RESET}`);
}

function ok(msg: string) { console.log(`  ${GREEN}✓${RESET} ${msg}`); }
function warn(msg: string, count: number) {
    totalIssues += count;
    console.log(`  ${YELLOW}⚠${RESET} ${msg} ${YELLOW}(${count})${RESET}`);
}
function fixed(msg: string, count: number) {
    totalFixed += count;
    console.log(`  ${GREEN}🔧${RESET} Fixed: ${msg} ${GREEN}(${count})${RESET}`);
}
function issue(msg: string) {
    totalIssues++;
    console.log(`  ${RED}✗${RESET} ${msg}`);
}

async function main() {
    console.log(`\n${BOLD}${CYAN}════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}  CORDINAL MUSHROOMS — DATA INTEGRITY AUDIT${RESET}`);
    console.log(`${BOLD}${CYAN}════════════════════════════════════════${RESET}`);

    // ── 1. Ghost batchLocations ──────────────────────────────────────────────
    section("1. Ghost batchLocations (for Harvested/Discarded batches)");

    const allBatches = await db.select({ id: schema.batches.id, status: schema.batches.status, name: schema.batches.name }).from(schema.batches);
    const allBatchIds = new Set(allBatches.map(b => b.id));
    const harvestedDiscardedIds = new Set(allBatches.filter(b => b.status === "Harvested" || b.status === "Discarded").map(b => b.id));

    const allLocations = await db.select().from(schema.batchLocations);
    const ghostLocs = allLocations.filter(l => harvestedDiscardedIds.has(l.batchId));
    const orphanLocs = allLocations.filter(l => !allBatchIds.has(l.batchId));

    if (ghostLocs.length === 0) {
        ok("No ghost batchLocations for Harvested/Discarded batches");
    } else {
        warn(`Ghost batchLocations for Harvested/Discarded batches`, ghostLocs.length);
        for (const loc of ghostLocs) {
            const batch = allBatches.find(b => b.id === loc.batchId);
            console.log(`     → location id=${loc.id}, batch="${batch?.name}" (${batch?.status}), rack=${loc.rackId}, layer=${loc.layer}, qty=${loc.quantity}`);
        }
        // Auto-fix
        for (const loc of ghostLocs) {
            await db.delete(schema.batchLocations).where(eq(schema.batchLocations.id, loc.id));
        }
        fixed("Deleted ghost batchLocations", ghostLocs.length);
    }

    if (orphanLocs.length === 0) {
        ok("No orphan batchLocations (batchId pointing to deleted batch)");
    } else {
        warn(`Orphan batchLocations (no matching batch)`, orphanLocs.length);
        for (const loc of orphanLocs) {
            console.log(`     → location id=${loc.id}, batchId=${loc.batchId} (MISSING)`);
        }
        for (const loc of orphanLocs) {
            await db.delete(schema.batchLocations).where(eq(schema.batchLocations.id, loc.id));
        }
        fixed("Deleted orphan batchLocations", orphanLocs.length);
    }

    // ── 2. Rack currentUsage mismatches ─────────────────────────────────────
    section("2. Rack currentUsage vs actual batchLocations sum");

    const allRacks = await db.select().from(schema.racks);
    let usageMismatches = 0;

    for (const rack of allRacks) {
        // Sum only active-batch locations
        const activeBatchIds = new Set(allBatches.filter(b => b.status === "Active").map(b => b.id));
        const rackLocs = allLocations.filter(l => l.rackId === rack.id && activeBatchIds.has(l.batchId));
        const actualUsage = rackLocs.reduce((s, l) => s + l.quantity, 0);
        const storedUsage = Number(rack.currentUsage);

        if (storedUsage !== actualUsage) {
            warn(`Rack "${rack.name}" (id=${rack.id}): stored usage=${storedUsage}, actual=${actualUsage}`, 1);
            await db.update(schema.racks).set({ currentUsage: actualUsage }).where(eq(schema.racks.id, rack.id));
            fixed(`Corrected rack "${rack.name}" usage to ${actualUsage}`, 1);
            usageMismatches++;
        }
    }

    if (usageMismatches === 0) ok("All rack currentUsage values match actual batchLocations sums");

    // ── 3. Orphan inventoryItems ─────────────────────────────────────────────
    section("3. Orphan inventoryItems (batchId pointing to non-existent batch)");

    const allInventory = await db.select().from(schema.inventoryItems);
    const orphanInv = allInventory.filter(i => i.batchId !== null && i.batchId !== undefined && !allBatchIds.has(i.batchId!));

    if (orphanInv.length === 0) {
        ok("No orphan inventoryItems");
    } else {
        for (const item of orphanInv) {
            issue(`inventoryItem id=${item.id} name="${item.name}" references missing batch id=${item.batchId}`);
        }
    }

    // ── 4. Orphan batchActions ───────────────────────────────────────────────
    section("4. Orphan batchActions (batchId pointing to non-existent batch)");

    const allActions = await db.select().from(schema.batchActions);
    const orphanActions = allActions.filter(a => !allBatchIds.has(a.batchId));

    if (orphanActions.length === 0) {
        ok("No orphan batchActions");
    } else {
        warn(`Orphan batchActions`, orphanActions.length);
        for (const a of orphanActions) {
            console.log(`     → action id=${a.id}, batchId=${a.batchId} (MISSING), type=${a.actionType}`);
        }
    }

    // ── 5. Orphan rackLayers ─────────────────────────────────────────────────
    section("5. Orphan rackLayers (rackId pointing to non-existent rack)");

    const allRackIds = new Set(allRacks.map(r => r.id));
    const allRackLayers = await db.select().from(schema.rackLayers);
    const orphanLayers = allRackLayers.filter(l => !allRackIds.has(l.rackId));

    if (orphanLayers.length === 0) {
        ok("No orphan rackLayers");
    } else {
        warn(`Orphan rackLayers`, orphanLayers.length);
        for (const l of orphanLayers) {
            console.log(`     → rackLayer id=${l.id}, rackId=${l.rackId} (MISSING), layer=${l.layer}`);
        }
        for (const l of orphanLayers) {
            await db.delete(schema.rackLayers).where(eq(schema.rackLayers.id, l.id));
        }
        fixed("Deleted orphan rackLayers", orphanLayers.length);
    }

    // ── 6. Duplicate inventoryItems ──────────────────────────────────────────
    section("6. Duplicate inventoryItems (same name + type + isPreserved, separate rows)");

    // Group by name+type+isPreserved and flag groups with >1 row
    const invMap = new Map<string, typeof allInventory>();
    for (const item of allInventory) {
        const key = `${item.name}|${item.type}|${item.isPreserved}`;
        if (!invMap.has(key)) invMap.set(key, []);
        invMap.get(key)!.push(item);
    }

    let dupCount = 0;
    for (const [key, items] of invMap.entries()) {
        if (items.length > 1) {
            dupCount++;
            const totalQty = items.reduce((s, i) => s + Number(i.quantity), 0);
            warn(`Duplicate inventoryItem rows for key "${key}"`, items.length - 1);
            for (const item of items) {
                console.log(`     → id=${item.id}, qty=${item.quantity}, batchId=${item.batchId ?? "null"}`);
            }
            console.log(`     → Total combined qty would be: ${totalQty}`);
            // Note: We do NOT auto-merge here because batchId tracking might be intentional on separate rows
            console.log(`     ${YELLOW}Note: Not auto-merged — check if batchId distinction is intentional${RESET}`);
        }
    }
    if (dupCount === 0) ok("No duplicate inventoryItem rows");

    // ── 7. batches.rackId/layer out of sync with batchLocations ─────────────
    section("7. batches.rackId/layer vs batchLocations — canonical location check");

    const activeBatches = allBatches.filter(b => b.status === "Active");
    const allLocsAfterFix = await db.select().from(schema.batchLocations); // re-fetch after ghost deletions

    let syncIssues = 0;
    for (const batch of activeBatches) {
        const batchLocs = allLocsAfterFix.filter(l => l.batchId === batch.id);
        if (batchLocs.length === 0) {
            issue(`Active batch "${(batch as any).name}" (id=${batch.id}) has NO batchLocations entry — not placed on any rack!`);
            syncIssues++;
        } else if (batchLocs.length > 1) {
            const locList = batchLocs.map(l => `rack=${l.rackId} layer=${l.layer} qty=${l.quantity}`).join(", ");
            const batchName = (batch as any).name ?? `id=${batch.id}`;
            console.log(`  ${CYAN}ℹ${RESET} Batch "${batchName}" spans multiple locations: [${locList}] — multi-rack placement (OK)`);
        }
    }

    if (syncIssues === 0) ok("All active batches have at least one batchLocations entry");

    // ── 8. Duplicate batch names ─────────────────────────────────────────────
    section("8. Duplicate batch names (Active batches only)");

    const nameMap = new Map<string, number[]>();
    for (const b of activeBatches) {
        const name = (b as any).name;
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name)!.push(b.id);
    }

    let dupBatches = 0;
    for (const [name, ids] of nameMap.entries()) {
        if (ids.length > 1) {
            dupBatches++;
            warn(`Duplicate active batch name "${name}"`, ids.length - 1);
            console.log(`     → ids: ${ids.join(", ")}`);
        }
    }
    if (dupBatches === 0) ok("No duplicate active batch names");

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log(`\n${BOLD}${CYAN}════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}  AUDIT SUMMARY${RESET}`);
    console.log(`${BOLD}${CYAN}════════════════════════════════════════${RESET}`);
    console.log(`  Issues found : ${totalIssues > 0 ? RED : GREEN}${totalIssues}${RESET}`);
    console.log(`  Auto-fixed   : ${GREEN}${totalFixed}${RESET}`);
    const remaining = totalIssues - totalFixed;
    console.log(`  Remaining    : ${remaining > 0 ? YELLOW : GREEN}${remaining}${RESET}`);
    console.log(`${BOLD}${CYAN}════════════════════════════════════════${RESET}\n`);

    if (remaining > 0) {
        console.log(`${YELLOW}Action needed: Review the issues above. Some require manual decisions.${RESET}\n`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`${RED}FATAL:${RESET}`, err);
    process.exit(1);
});
