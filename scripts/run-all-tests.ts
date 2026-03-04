/**
 * CORDINAL MUSHROOMS — Full Backend Service Test Suite
 * Run: npx tsx scripts/run-all-tests.ts
 *
 * Tests every service function against sqlite.db.
 * Seeds test data fresh on each run then cleans up.
 */

import { db, sqlite } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Colors ───────────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// ─── Test runner ──────────────────────────────────────────────────────────────
const results: { name: string; status: "PASS" | "FAIL"; error?: string }[] = [];

async function test(name: string, fn: () => Promise<void>) {
    process.stdout.write(`  ${YELLOW}▷${RESET} ${name} … `);
    try {
        await fn();
        results.push({ name, status: "PASS" });
        console.log(`${GREEN}PASS${RESET}`);
    } catch (e: any) {
        results.push({ name, status: "FAIL", error: e.message });
        console.log(`${RED}FAIL${RESET} — ${e.message}`);
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

// ─── Service imports ──────────────────────────────────────────────────────────
import {
    startBatchService,
    harvestBatchService,
    discardBatchService,
    deleteBatchService,
    updateBatchService,
    logBatchActionService,
    discardPartialBatchService
} from "../lib/services/production";

import {
    addToInventoryService,
    updateInventoryItemService,
    deleteInventoryItemService,
    addMaterialService,
    updateStockService,
    deleteMaterialService,
    convertJarToDriedService,
    getInventoryItemsByTypeService
} from "../lib/services/inventory";

import {
    addRackService,
    updateRackService,
    updateRackLightStatusService,
    deleteRackService,
    duplicateRackService,
    getAllRacksService,
    getRackDetailsService,
    moveBatchItemsService,
    updateLayerColorService,
    updateRackLayerCountService,
    repairRackUsageService,
    getFacilitySettingsService,
    updateFacilitySettingsService
} from "../lib/services/facility";

import {
    getStatsService,
    getActionsService,
    getRecentActivityService,
    getPendingActionCountsService,
    getDashboardGridStatsService
} from "../lib/services/dashboard";

// ─── Shared test state ────────────────────────────────────────────────────────
let testRackId: number;
let testRackId2: number;
let testBatchId: number;
let testInventoryItemId: number;
let testMaterialId: number;

// ─── Helper: offset a date string ─────────────────────────────────────────────
function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

// ═════════════════════════════════════════════════════════════════════════════
async function main() {
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}${CYAN}  CORDINAL MUSHROOMS — BACKEND TEST SUITE${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}\n`);

    // ──────────────────────────────────────────────────────────────────────────
    console.log(`${BOLD}[1] FACILITY — Racks & Settings${RESET}`);

    await test("addRackService — creates a rack", async () => {
        await addRackService(db, {
            name: "Test-Rack-A",
            capacity: 50,
            lightType: "White",
            width: 2,
            height: 1,
            material: "Steel",
            totalLayers: 7
        });
        const racks = await db.select().from(schema.racks).where(eq(schema.racks.name, "Test-Rack-A"));
        assert(racks.length > 0, "Rack not found after insert");
        testRackId = racks[0].id;
    });

    await test("addRackService — creates second rack (for move test)", async () => {
        await addRackService(db, {
            name: "Test-Rack-B",
            capacity: 50,
            lightType: "White",
            width: 2,
            height: 1,
            material: "Steel",
            totalLayers: 7
        });
        const racks = await db.select().from(schema.racks).where(eq(schema.racks.name, "Test-Rack-B"));
        assert(racks.length > 0, "Rack-B not found after insert");
        testRackId2 = racks[0].id;
    });

    await test("updateRackService — updates rack name and capacity", async () => {
        await updateRackService(db, {
            id: testRackId,
            name: "Test-Rack-A-Updated",
            capacity: 60,
            lightType: "White",
            width: 2,
            height: 1,
            material: "Steel",
            totalLayers: 7,
            status: "Active"
        });
        const rack = await db.select().from(schema.racks).where(eq(schema.racks.id, testRackId));
        assert(rack[0].name === "Test-Rack-A-Updated", "Name not updated");
        assert(Number(rack[0].capacity) === 60, "Capacity not updated");
    });

    await test("updateRackLightStatusService — toggles light on", async () => {
        await updateRackLightStatusService(db, testRackId, true);
        const rack = await db.select().from(schema.racks).where(eq(schema.racks.id, testRackId));
        assert(!!rack[0].lightStatus, "Light status not set to true");
    });

    await test("updateLayerColorService — sets layer color", async () => {
        await updateLayerColorService(db, testRackId, 1, "Green");
        const layers = await db.select().from(schema.rackLayers).where(
            and(eq(schema.rackLayers.rackId, testRackId), eq(schema.rackLayers.layer, 1))
        );
        assert(layers.length > 0 && layers[0].color === "Green", "Layer color not set");
    });

    await test("updateRackLayerCountService — adds a layer", async () => {
        const before = await db.select().from(schema.racks).where(eq(schema.racks.id, testRackId));
        const countBefore = Number(before[0].totalLayers);
        await updateRackLayerCountService(db, testRackId, 1);
        const after = await db.select().from(schema.racks).where(eq(schema.racks.id, testRackId));
        assert(Number(after[0].totalLayers) === countBefore + 1, "Layer count not incremented");
    });

    await test("getAllRacksService — returns array with test racks", async () => {
        const racks = await getAllRacksService(db);
        assert(Array.isArray(racks), "Should return array");
        assert(racks.some((r: any) => r.id === testRackId), "Test rack not in result");
    });

    await test("duplicateRackService — creates a copy", async () => {
        const before = (await getAllRacksService(db)).length;
        await duplicateRackService(db, testRackId);
        const after = (await getAllRacksService(db)).length;
        assert(after === before + 1, "Duplicate rack not created");
        // Cleanup the duplicate immediately
        const copies = await db.select().from(schema.racks).where(eq(schema.racks.name, "Test-Rack-A-Updated (Copy)"));
        if (copies.length > 0) await deleteRackService(db, copies[0].id);
    });

    await test("updateFacilitySettingsService — upserts settings", async () => {
        await updateFacilitySettingsService(db, {
            roomWidth: 20,
            roomHeight: 15,
            shakeMorningTime: "09:00",
            shakeEveningTime: "21:00"
        });
        const settings = await getFacilitySettingsService(db);
        assert(settings !== null, "Settings not found");
        assert(Number(settings!.roomWidth) === 20, "Room width mismatch");
    });

    await test("getFacilitySettingsService — returns settings", async () => {
        const s = await getFacilitySettingsService(db);
        assert(s !== null, "Settings should exist");
        assert("shakeMorningTime" in s!, "Missing shakeMorningTime field");
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${BOLD}[2] PRODUCTION — Batches & Actions${RESET}`);

    await test("startBatchService — creates an active LC batch (Day 0)", async () => {
        await startBatchService(db, {
            name: "Test-LC-Batch-01",
            type: "Liquid Culture",
            sourceId: "Master-LC-001",
            startDate: daysAgo(0),
            rackId: testRackId,
            jarCount: 10,
            locationsStr: JSON.stringify([{ rackId: testRackId, layer: 2, count: 10 }]),
            providedLayer: 2
        });
        const batch = await db.select().from(schema.batches).where(eq(schema.batches.name, "Test-LC-Batch-01"));
        assert(batch.length > 0, "Batch not found");
        assert(batch[0].status === "Active", "Batch not active");
        testBatchId = batch[0].id;
    });

    await test("startBatchService — creates an old Jar batch (Day 22, ready to harvest)", async () => {
        await startBatchService(db, {
            name: "Test-Jar-Batch-Old",
            type: "Jars",
            sourceId: "Master-LC-001",
            startDate: daysAgo(22),
            rackId: testRackId,
            jarCount: 5,
            locationsStr: JSON.stringify([{ rackId: testRackId, layer: 3, count: 5 }]),
            providedLayer: 3
        });
        const batch = await db.select().from(schema.batches).where(eq(schema.batches.name, "Test-Jar-Batch-Old"));
        assert(batch.length > 0, "Old batch not found");
    });

    await test("logBatchActionService — logs a Shake action", async () => {
        await logBatchActionService(db, testBatchId, "Shake");
        const actions = await db.select().from(schema.batchActions).where(eq(schema.batchActions.batchId, testBatchId));
        assert(actions.length > 0, "No action logged");
        assert(actions[0].actionType === "Shake", "Wrong action type");
    });

    await test("logBatchActionService — logs a Mist action", async () => {
        await logBatchActionService(db, testBatchId, "Mist");
        const actions = await db.select().from(schema.batchActions).where(eq(schema.batchActions.batchId, testBatchId));
        assert(actions.some((a: any) => a.actionType === "Mist"), "Mist action not found");
    });

    await test("updateBatchService — updates batch name and jar count", async () => {
        await updateBatchService(db, {
            id: testBatchId,
            name: "Test-LC-Batch-01-Renamed",
            sourceId: "Master-LC-001",
            startDate: daysAgo(0),
            jarCount: 12,
            status: "Active"
        });
        const b = await db.select().from(schema.batches).where(eq(schema.batches.id, testBatchId));
        assert(b[0].name === "Test-LC-Batch-01-Renamed", "Name not updated");
        assert(Number(b[0].jarCount) === 12, "Jar count not updated");
    });

    await test("getRackDetailsService — returns rack with batch locations", async () => {
        const detail = await getRackDetailsService(db, testRackId);
        assert(detail !== null, "Rack detail null");
        assert(Array.isArray(detail!.batches), "Batches should be array");
    });

    await test("moveBatchItemsService — moves batch items to second rack", async () => {
        // Find a batchLocation entry for our batch
        const locs = await db.select().from(schema.batchLocations)
            .where(eq(schema.batchLocations.batchId, testBatchId));
        if (locs.length === 0) {
            console.log(" (skipped — no batchLocations found)");
            return;
        }
        const loc = locs[0];
        await moveBatchItemsService(db, [{
            batchId: testBatchId,
            sourceRackId: testRackId,
            sourceLayer: loc.layer,
            count: 2
        }], testRackId2, 1);
        const newLocs = await db.select().from(schema.batchLocations)
            .where(and(eq(schema.batchLocations.batchId, testBatchId), eq(schema.batchLocations.rackId, testRackId2)));
        assert(newLocs.length > 0, "Move did not create new batchLocation");
    });

    await test("repairRackUsageService — recalculates usage without error", async () => {
        const corrections = await repairRackUsageService(db);
        assert(typeof corrections === "number", "Should return a number");
    });

    await test("discardPartialBatchService — discards partial quantity", async () => {
        const locs = await db.select().from(schema.batchLocations).where(eq(schema.batchLocations.batchId, testBatchId));
        if (locs.length === 0) return; // skip if nothing to discard
        const loc = locs[0];
        await discardPartialBatchService(db, testBatchId, loc.rackId, loc.layer, 1);
        // Verify a Waste item was added to inventory
        const waste = await db.select().from(schema.inventoryItems)
            .where(and(eq(schema.inventoryItems.batchId, testBatchId), eq(schema.inventoryItems.type, "Waste")));
        assert(waste.length > 0, "Waste item not created");
    });

    // Create a fresh batch for harvest test
    let harvestBatchId: number;
    await test("harvestBatchService — harvests a batch and adds to inventory", async () => {
        await startBatchService(db, {
            name: "Test-Harvest-Batch",
            type: "Liquid Culture",
            sourceId: "Master-LC-001",
            startDate: daysAgo(25),
            rackId: testRackId,
            jarCount: 8,
            locationsStr: JSON.stringify([{ rackId: testRackId, layer: 5, count: 8 }]),
            providedLayer: 5
        });
        const b = await db.select().from(schema.batches).where(eq(schema.batches.name, "Test-Harvest-Batch"));
        harvestBatchId = b[0].id;

        await harvestBatchService(db, harvestBatchId);

        const harvested = await db.select().from(schema.batches).where(eq(schema.batches.id, harvestBatchId));
        assert(harvested[0].status === "Harvested", "Batch not marked Harvested");

        // Service merges into existing row if same name+type exists (accumulate-by-name design).
        // Query by name+type to verify the inventory contains the harvest output.
        const inv = await db.select().from(schema.inventoryItems).where(
            and(
                eq(schema.inventoryItems.name, "Test-Harvest-Batch"),
                eq(schema.inventoryItems.type, "Liquid-Culture")
            )
        );
        assert(inv.length > 0, "No inventory item found for harvest output");
    });

    await test("discardBatchService — discards a batch", async () => {
        await startBatchService(db, {
            name: "Test-Discard-Batch",
            type: "Jars",
            sourceId: "Master-LC-001",
            startDate: daysAgo(5),
            rackId: testRackId,
            jarCount: 3,
            locationsStr: JSON.stringify([{ rackId: testRackId, layer: 6, count: 3 }]),
            providedLayer: 6
        });
        const b = await db.select().from(schema.batches).where(eq(schema.batches.name, "Test-Discard-Batch"));
        const discardId = b[0].id;
        await discardBatchService(db, discardId);
        const after = await db.select().from(schema.batches).where(eq(schema.batches.id, discardId));
        assert(after[0].status === "Discarded", "Batch not marked Discarded");
        // Cleanup
        await deleteBatchService(db, discardId);
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${BOLD}[3] INVENTORY — Items & Materials${RESET}`);

    await test("addToInventoryService — inserts new item", async () => {
        await addToInventoryService(db, {
            name: "Test-LC-Stock",
            type: "Liquid-Culture",
            quantity: 5,
            unit: "jars",
            isPreserved: false,
            notes: "Test item"
        });
        const items = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.name, "Test-LC-Stock"));
        assert(items.length > 0, "Item not inserted");
        testInventoryItemId = items[0].id;
    });

    await test("addToInventoryService — stacks quantity on duplicate name+type", async () => {
        await addToInventoryService(db, {
            name: "Test-LC-Stock",
            type: "Liquid-Culture",
            quantity: 3,
            unit: "jars",
            isPreserved: false,
            notes: "Stacked"
        });
        const items = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.name, "Test-LC-Stock"));
        // Should still be 1 row with quantity 8
        assert(items.length === 1, "Should not create duplicate row");
        assert(Number(items[0].quantity) === 8, `Expected qty=8 but got ${items[0].quantity}`);
    });

    await test("updateInventoryItemService — updates quantity", async () => {
        await updateInventoryItemService(db, { id: testInventoryItemId, quantity: 10, notes: "Updated" });
        const item = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, testInventoryItemId));
        assert(Number(item[0].quantity) === 10, "Quantity not updated");
    });

    await test("getInventoryItemsByTypeService — returns filtered items", async () => {
        const items = await getInventoryItemsByTypeService(db, "Liquid-Culture");
        assert(Array.isArray(items), "Should be array");
        assert(items.some((i: any) => i.id === testInventoryItemId), "Test item not in result");
    });

    await test("convertJarToDriedService — converts 1 jar to Dried entry", async () => {
        // First add a Jars item
        await addToInventoryService(db, {
            name: "Test-Fresh-Jar",
            type: "Jars",
            quantity: 3,
            unit: "jars",
            isPreserved: false,
            notes: ""
        });
        const jarItems = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.name, "Test-Fresh-Jar"));
        const jarId = jarItems[0].id;

        await convertJarToDriedService(db, jarId);

        const updated = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, jarId));
        assert(Number(updated[0].quantity) === 2, "Jar qty should decrease by 1");

        const dried = await db.select().from(schema.inventoryItems)
            .where(and(eq(schema.inventoryItems.name, "Test-Fresh-Jar"), eq(schema.inventoryItems.type, "Dried")));
        assert(dried.length > 0, "Dried item not created");

        // cleanup
        await deleteInventoryItemService(db, jarId);
        await deleteInventoryItemService(db, dried[0].id);
    });

    await test("addMaterialService — inserts a supply material", async () => {
        await addMaterialService(db, { name: "Test-Rye-Grain", quantity: 100, unit: "kg", lowStockThreshold: 10 });
        const mats = await db.select().from(schema.materials).where(eq(schema.materials.name, "Test-Rye-Grain"));
        assert(mats.length > 0, "Material not inserted");
        testMaterialId = mats[0].id;
    });

    await test("updateStockService — updates material quantity", async () => {
        await updateStockService(db, testMaterialId, 80);
        const mat = await db.select().from(schema.materials).where(eq(schema.materials.id, testMaterialId));
        assert(Number(mat[0].quantity) === 80, "Quantity not updated");
    });

    await test("deleteInventoryItemService — removes item", async () => {
        await deleteInventoryItemService(db, testInventoryItemId);
        const items = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, testInventoryItemId));
        assert(items.length === 0, "Item not deleted");
    });

    await test("deleteMaterialService — removes material", async () => {
        await deleteMaterialService(db, testMaterialId);
        const mats = await db.select().from(schema.materials).where(eq(schema.materials.id, testMaterialId));
        assert(mats.length === 0, "Material not deleted");
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${BOLD}[4] DASHBOARD — Stats & Actions${RESET}`);

    await test("getStatsService — returns incubation and storage stats", async () => {
        const stats = await getStatsService(db);
        assert("incubation" in stats, "Missing incubation stats");
        assert("storage" in stats, "Missing storage stats");
        assert("totalCapacity" in stats, "Missing totalCapacity");
    });

    await test("getActionsService — returns pending action list", async () => {
        const actions = await getActionsService(db);
        assert(Array.isArray(actions), "Should return array");
    });

    await test("getRecentActivityService — returns recent batches", async () => {
        const activity = await getRecentActivityService(db);
        assert(Array.isArray(activity), "Should return array");
        assert(activity.length > 0, "No recent activity found (was data seeded?)");
    });

    await test("getPendingActionCountsService — returns counts object", async () => {
        const counts = await getPendingActionCountsService(db);
        assert("removeCloth" in counts, "Missing removeCloth");
        assert("switchLights" in counts, "Missing switchLights");
        assert("harvestReady" in counts, "Missing harvestReady");
        assert("shakingNeeded" in counts, "Missing shakingNeeded");
    });

    await test("getDashboardGridStatsService — returns room grid stats", async () => {
        const grid = await getDashboardGridStatsService(db);
        assert("fruitingRoom" in grid, "Missing fruitingRoom");
        assert("storageRoom" in grid, "Missing storageRoom");
        assert("baseCulture" in grid.fruitingRoom, "Missing fruitingRoom.baseCulture");
        assert("liquidCulture" in grid.fruitingRoom, "Missing fruitingRoom.liquidCulture");
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${BOLD}[5] CLEANUP${RESET}`);

    await test("deleteRackService — refuses to delete rack with active batches", async () => {
        try {
            await deleteRackService(db, testRackId);
            assert(false, "Should have thrown");
        } catch (e: any) {
            assert(e.message.includes("active batches"), `Wrong error: ${e.message}`);
        }
    });

    await test("deleteBatchService — deletes test batch and cleans cascade", async () => {
        await deleteBatchService(db, testBatchId);
        const b = await db.select().from(schema.batches).where(eq(schema.batches.id, testBatchId));
        assert(b.length === 0, "Batch not deleted");
    });

    await test("deleteRackService — deletes rack after no active batches", async () => {
        // Clean up old batch first
        const oldBatch = await db.select().from(schema.batches).where(eq(schema.batches.name, "Test-Jar-Batch-Old"));
        if (oldBatch.length > 0) await deleteBatchService(db, oldBatch[0].id);
        // Clean up harvest batch (already harvested, just delete the record)
        const harvestBatch = await db.select().from(schema.batches).where(eq(schema.batches.name, "Test-Harvest-Batch"));
        if (harvestBatch.length > 0) await deleteBatchService(db, harvestBatch[0].id);
        // Now delete both test racks
        await deleteRackService(db, testRackId);
        await deleteRackService(db, testRackId2);
        const r1 = await db.select().from(schema.racks).where(eq(schema.racks.id, testRackId));
        assert(r1.length === 0, "Rack-A not deleted");
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SUMMARY
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}  RESULTS${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`);

    const passed = results.filter(r => r.status === "PASS").length;
    const failed = results.filter(r => r.status === "FAIL").length;

    for (const r of results) {
        const icon = r.status === "PASS" ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
        console.log(`  ${icon} ${r.name}`);
        if (r.error) console.log(`      ${RED}→ ${r.error}${RESET}`);
    }

    console.log(`\n  ${GREEN}${passed} passed${RESET}  ${failed > 0 ? RED : ""}${failed} failed${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}\n`);

    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error(`${RED}FATAL:${RESET}`, err);
    process.exit(1);
});
