import * as schema from "@/lib/db/schema";
import { eq, sql, and, not, inArray } from "drizzle-orm";

export async function addRackService(db: any, params: {
    name: string;
    capacity: number;
    lightType: string;
    width: number;
    height: number;
    material: string;
    totalLayers: number;
}) {
    await db.insert(schema.racks).values({
        name: params.name,
        capacity: params.capacity,
        lightType: params.lightType,
        width: params.width || 2,
        height: params.height || 1,
        material: params.material || "Steel",
        totalLayers: params.totalLayers || 7,
        currentUsage: 0,
        status: "Active",
    });
}

export async function updateRackService(db: any, params: {
    id: number;
    name: string;
    capacity: number;
    lightType: string;
    width: number;
    height: number;
    material: string;
    totalLayers: number;
    status: string;
}) {
    await db.update(schema.racks)
        .set({
            name: params.name,
            capacity: params.capacity,
            lightType: params.lightType,
            width: params.width,
            height: params.height,
            material: params.material,
            totalLayers: params.totalLayers,
            status: params.status,
        })
        .where(eq(schema.racks.id, params.id));
}

export async function updateRackLightStatusService(db: any, id: number, lightStatus: boolean) {
    await db.update(schema.racks)
        .set({ lightStatus })
        .where(eq(schema.racks.id, id));
}

export async function updateRackPositionsService(db: any, positions: { id: number; x: number; y: number }[]) {
    for (const pos of positions) {
        await db.update(schema.racks)
            .set({ x: pos.x, y: pos.y })
            .where(eq(schema.racks.id, pos.id));
    }
}

export async function deleteRackService(db: any, id: number) {
    // Check if rack is primary rack for active batches
    const activeBatchCountRes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.batches)
        .where(and(eq(schema.batches.rackId, id), eq(schema.batches.status, "Active")));

    // Check if rack is a secondary location in batchLocations for active batches
    const activeBatchLocs = await db.select({ id: schema.batchLocations.batchId })
        .from(schema.batchLocations)
        .leftJoin(schema.batches, eq(schema.batchLocations.batchId, schema.batches.id))
        .where(and(eq(schema.batchLocations.rackId, id), eq(schema.batches.status, "Active")));

    if (Number(activeBatchCountRes[0]?.count) > 0 || activeBatchLocs.length > 0) {
        throw new Error("Cannot delete rack with active batches.");
    }

    // Safely delete cascaded relations to prevent SQLite FK constraint errors
    await db.delete(schema.rackLayers).where(eq(schema.rackLayers.rackId, id));
    await db.delete(schema.batchLocations).where(eq(schema.batchLocations.rackId, id));

    const inactiveBatches = await db.select({ id: schema.batches.id }).from(schema.batches).where(eq(schema.batches.rackId, id));
    for (const b of inactiveBatches) {
        await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.batchId, b.id));
        await db.delete(schema.batchActions).where(eq(schema.batchActions.batchId, b.id));
        await db.delete(schema.processingBatches).where(eq(schema.processingBatches.batchId, b.id));
    }

    await db.delete(schema.batches).where(eq(schema.batches.rackId, id));
    await db.delete(schema.racks).where(eq(schema.racks.id, id));
}

export async function duplicateRackService(db: any, id: number) {
    const rackRes = await db.select().from(schema.racks).where(eq(schema.racks.id, id)).limit(1);
    const r = rackRes[0];
    if (!r) return;

    await db.insert(schema.racks).values({
        name: `${r.name} (Copy)`,
        capacity: r.capacity,
        currentUsage: 0,
        width: r.width,
        height: r.height,
        material: r.material,
        totalLayers: r.totalLayers,
        lightType: r.lightType,
        status: "Active"
    });
}

export async function getFacilitySettingsService(db: any) {
    const settings = await db.select().from(schema.facilitySettings).limit(1);
    if (settings.length === 0) return null;
    return settings[0];
}

export async function updateFacilitySettingsService(db: any, params: {
    roomWidth?: number;
    roomHeight?: number;
    shakeMorningTime?: string;
    shakeEveningTime?: string;
    removeClothDay?: number;
    light1Day?: number;
    light2Day?: number;
    harvestDay?: number;
}) {
    const existingRes = await db.select().from(schema.facilitySettings).limit(1);
    const existing = existingRes.length > 0 ? existingRes[0] : null;

    const data: any = {
        updatedAt: new Date().toISOString()
    };

    if (params.roomWidth !== undefined) data.roomWidth = params.roomWidth;
    if (params.roomHeight !== undefined) data.roomHeight = params.roomHeight;
    if (params.shakeMorningTime !== undefined) data.shakeMorningTime = params.shakeMorningTime;
    if (params.shakeEveningTime !== undefined) data.shakeEveningTime = params.shakeEveningTime;
    if (params.removeClothDay !== undefined) data.removeClothDay = params.removeClothDay;
    if (params.light1Day !== undefined) data.light1Day = params.light1Day;
    if (params.light2Day !== undefined) data.light2Day = params.light2Day;
    if (params.harvestDay !== undefined) data.harvestDay = params.harvestDay;

    if (!existing) {
        await db.insert(schema.facilitySettings).values({
            roomWidth: data.roomWidth ?? 20,
            roomHeight: data.roomHeight ?? 15,
            shakeMorningTime: data.shakeMorningTime ?? "09:00",
            shakeEveningTime: data.shakeEveningTime ?? "21:00",
            removeClothDay: data.removeClothDay ?? 14,
            light1Day: data.light1Day ?? 15,
            light2Day: data.light2Day ?? 17,
            harvestDay: data.harvestDay ?? 60,
            updatedAt: data.updatedAt
        });
    } else {
        await db.update(schema.facilitySettings).set(data).where(eq(schema.facilitySettings.id, existing.id));
    }
}

export async function moveBatchItemsService(db: any, items: any[], targetRackId: number, targetLayer: number) {
    // using select instead of query for raw compat. query should work but just in case.
    const targetRackRes = await db.select().from(schema.racks).where(eq(schema.racks.id, targetRackId)).limit(1);
    const targetRack = targetRackRes[0];
    if (!targetRack) throw new Error("Target rack not found");

    for (const item of items) {
        await db.insert(schema.batchLocations).values({
            batchId: item.batchId,
            rackId: targetRackId,
            layer: targetLayer,
            quantity: item.count
        });

        const locationRes = await db.select().from(schema.batchLocations).where(
            and(
                eq(schema.batchLocations.batchId, item.batchId),
                eq(schema.batchLocations.rackId, item.sourceRackId),
                eq(schema.batchLocations.layer, item.sourceLayer)
            )
        ).limit(1);

        const loc = locationRes[0];
        if (loc) {
            if (loc.quantity <= item.count) {
                await db.delete(schema.batchLocations).where(eq(schema.batchLocations.id, loc.id));
            } else {
                await db.update(schema.batchLocations)
                    .set({ quantity: loc.quantity - item.count })
                    .where(eq(schema.batchLocations.id, loc.id));
            }

            await db.update(schema.racks)
                .set({ currentUsage: sql`${schema.racks.currentUsage} - ${item.count}` })
                .where(eq(schema.racks.id, item.sourceRackId));

            await db.update(schema.racks)
                .set({ currentUsage: sql`${schema.racks.currentUsage} + ${item.count}` })
                .where(eq(schema.racks.id, targetRackId));
        }
    }
}

export async function getAllRacksService(db: any) {
    const racks = await db.select().from(schema.racks);
    const locs = await db.select({
        rackId: schema.batchLocations.rackId,
        layer: schema.batchLocations.layer,
        quantity: schema.batchLocations.quantity
    })
        .from(schema.batchLocations)
        .leftJoin(schema.batches, eq(schema.batchLocations.batchId, schema.batches.id))
        .where(eq(schema.batches.status, "Active"));

    const allRackLayers = await db.select().from(schema.rackLayers);

    return racks.map((r: any) => {
        const layerUsages: Record<number, number> = {};
        for (const loc of locs) {
            if (loc.rackId === r.id) {
                layerUsages[loc.layer] = (layerUsages[loc.layer] || 0) + loc.quantity;
            }
        }

        const layerInfo: Record<number, any> = {};
        for (const layer of allRackLayers) {
            if (layer.rackId === r.id) {
                layerInfo[layer.layer] = layer;
            }
        }

        // Also recalculate true currentUsage to be safe
        const trueUsage = Object.values(layerUsages).reduce((a, b) => a + b, 0);

        return {
            ...r,
            id: Number(r.id),
            capacity: Number(r.capacity),
            currentUsage: trueUsage,
            width: Number(r.width),
            height: Number(r.height),
            totalLayers: Number(r.totalLayers),
            lightIntensity: Number(r.lightIntensity),
            x: Number(r.x),
            y: Number(r.y),
            layerUsages,
            layerInfo
        };
    });
}

export async function updateLayerColorService(db: any, rackId: number, layer: number, color: string) {
    const existingRes = await db.select().from(schema.rackLayers).where(and(eq(schema.rackLayers.rackId, rackId), eq(schema.rackLayers.layer, layer))).limit(1);
    if (existingRes.length > 0) {
        await db.update(schema.rackLayers).set({ color }).where(eq(schema.rackLayers.id, existingRes[0].id));
    } else {
        await db.insert(schema.rackLayers).values({ rackId, layer, color });
    }
}

export async function updateLayerLightsService(db: any, rackId: number, layer: number, light1: boolean, light2: boolean) {
    const existingRes = await db.select().from(schema.rackLayers).where(and(eq(schema.rackLayers.rackId, rackId), eq(schema.rackLayers.layer, layer))).limit(1);
    if (existingRes.length > 0) {
        await db.update(schema.rackLayers).set({ light1, light2 }).where(eq(schema.rackLayers.id, existingRes[0].id));
    } else {
        await db.insert(schema.rackLayers).values({ rackId, layer, light1, light2 });
    }
}

export async function updateRackLayerCountService(db: any, rackId: number, increment: number) {
    const rackRes = await db.select().from(schema.racks).where(eq(schema.racks.id, rackId)).limit(1);
    if (rackRes.length === 0) return;
    const newCount = Number(rackRes[0].totalLayers) + increment;
    if (newCount < 1) return;
    await db.update(schema.racks).set({ totalLayers: newCount }).where(eq(schema.racks.id, rackId));
}

export async function getRackDetailsService(db: any, rackId: number) {
    const rackRes = await db.select().from(schema.racks).where(eq(schema.racks.id, rackId)).limit(1);
    if (rackRes.length === 0) return null;

    const locs = await db.select({
        id: schema.batches.id,
        name: schema.batches.name,
        startDate: schema.batches.startDate,
        jarCount: schema.batchLocations.quantity,
        layer: schema.batchLocations.layer,
        status: schema.batches.status,
        type: schema.batches.type,
        stage: schema.batches.stage,
        sourceId: schema.batches.sourceId
    })
        .from(schema.batchLocations)
        .leftJoin(schema.batches, eq(schema.batchLocations.batchId, schema.batches.id))
        .where(
            and(
                eq(schema.batchLocations.rackId, rackId),
                not(inArray(schema.batches.status, ["Harvested", "Discarded"]))
            )
        );

    // --- Action Status Logic --- //
    const batchIds = locs.map((l: any) => l.id);
    const enrichedLocs = [...locs];

    if (batchIds.length > 0) {
        const actions = await db.select().from(schema.batchActions).where(inArray(schema.batchActions.batchId, batchIds));

        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        let mostRecentThreshold = new Date(today);
        if (today.getHours() >= 21) {
            mostRecentThreshold.setHours(21, 0, 0, 0);
        } else if (today.getHours() >= 9) {
            mostRecentThreshold.setHours(9, 0, 0, 0);
        } else {
            mostRecentThreshold.setDate(mostRecentThreshold.getDate() - 1);
            mostRecentThreshold.setHours(21, 0, 0, 0);
        }

        // Must dynamically import differenceInCalendarDays to safely use in API
        const { differenceInCalendarDays, parseISO } = require("date-fns");

        for (const loc of enrichedLocs as any[]) {
            const batchActions = actions.filter((a: any) => a.batchId === loc.id);

            // Cloth Logic: check most recent 'Put Cloth' or 'Remove Cloth'
            const clothActions = batchActions.filter((a: any) => a.actionType === "Put Cloth" || a.actionType === "Remove Cloth");
            clothActions.sort((a: any, b: any) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

            loc.hasCloth = clothActions.length > 0 ? clothActions[0].actionType === "Put Cloth" : false;

            // Shake Logic: check against thresholds
            const startDate = parseISO(loc.startDate);
            const daysOld = differenceInCalendarDays(today, startDate);

            if (loc.type === "Liquid Culture" && daysOld >= 0 && daysOld <= 5) {
                const shakeActions = batchActions.filter((a: any) => a.actionType === "Shake");
                shakeActions.sort((a: any, b: any) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

                const shakesToday = shakeActions.filter((a: any) => new Date(a.performedAt) >= startOfDay);
                const lastShakeRaw = shakeActions[0]?.performedAt;
                const lastShake = lastShakeRaw ? new Date(lastShakeRaw) : null;

                const createdBeforeThreshold = startDate <= mostRecentThreshold;
                const notShakenSinceThreshold = !lastShake || lastShake < mostRecentThreshold;

                loc.shakeStatus = {
                    needed: createdBeforeThreshold && notShakenSinceThreshold,
                    count: shakesToday.length,
                    daysOld: daysOld
                };
            }
        }
    }

    const layers = await db.select().from(schema.rackLayers).where(eq(schema.rackLayers.rackId, rackId));

    return {
        ...rackRes[0],
        id: Number(rackRes[0].id),
        capacity: Number(rackRes[0].capacity),
        currentUsage: Number(rackRes[0].currentUsage),
        width: Number(rackRes[0].width),
        height: Number(rackRes[0].height),
        totalLayers: Number(rackRes[0].totalLayers),
        lightIntensity: Number(rackRes[0].lightIntensity),
        x: Number(rackRes[0].x),
        y: Number(rackRes[0].y),
        batches: enrichedLocs,
        layers: layers
    };
}

export async function repairRackUsageService(db: any) {
    const allRacks = await db.select().from(schema.racks);
    let corrections = 0;

    for (const rack of allRacks) {
        const locs = await db.select({
            qty: schema.batchLocations.quantity
        })
            .from(schema.batchLocations)
            .leftJoin(schema.batches, eq(schema.batchLocations.batchId, schema.batches.id))
            .where(
                and(
                    eq(schema.batchLocations.rackId, rack.id),
                    not(inArray(schema.batches.status, ["Harvested", "Discarded"]))
                )
            );

        const calculatedUsage = locs.reduce((acc: number, loc: any) => acc + (loc.qty || 0), 0);

        if (rack.currentUsage !== calculatedUsage) {
            await db.update(schema.racks)
                .set({ currentUsage: calculatedUsage })
                .where(eq(schema.racks.id, rack.id));
            corrections++;
        }
    }
    return corrections;
}
