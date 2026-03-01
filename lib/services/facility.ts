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

export async function updateRackPositionsService(db: any, positions: { id: number; x: number; y: number }[]) {
    for (const pos of positions) {
        await db.update(schema.racks)
            .set({ x: pos.x, y: pos.y })
            .where(eq(schema.racks.id, pos.id));
    }
}

export async function deleteRackService(db: any, id: number) {
    const activeBatchCountRes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.batches)
        .where(and(eq(schema.batches.rackId, id), eq(schema.batches.status, "Active")));

    if (activeBatchCountRes[0]?.count > 0) {
        throw new Error("Cannot delete rack with active batches.");
    }
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
    roomWidth: number;
    roomHeight: number;
    shakeMorningTime: string;
    shakeEveningTime: string;
}) {
    const existing = await db.select().from(schema.facilitySettings).limit(1);
    const data = {
        roomWidth: params.roomWidth,
        roomHeight: params.roomHeight,
        shakeMorningTime: params.shakeMorningTime,
        shakeEveningTime: params.shakeEveningTime,
        updatedAt: new Date().toISOString()
    };

    if (existing.length === 0) {
        await db.insert(schema.facilitySettings).values(data);
    } else {
        await db.update(schema.facilitySettings).set(data).where(eq(schema.facilitySettings.id, existing[0].id));
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
    const result = await db.select().from(schema.racks);
    return result.map((r: any) => ({
        ...r,
        id: Number(r.id),
        capacity: Number(r.capacity),
        currentUsage: Number(r.currentUsage),
        width: Number(r.width),
        height: Number(r.height),
        totalLayers: Number(r.totalLayers),
        lightIntensity: Number(r.lightIntensity),
        x: Number(r.x),
        y: Number(r.y)
    }));
}

export async function updateLayerColorService(db: any, rackId: number, layer: number, color: string) {
    const existingRes = await db.select().from(schema.rackLayers).where(and(eq(schema.rackLayers.rackId, rackId), eq(schema.rackLayers.layer, layer))).limit(1);
    if (existingRes.length > 0) {
        await db.update(schema.rackLayers).set({ color }).where(eq(schema.rackLayers.id, existingRes[0].id));
    } else {
        await db.insert(schema.rackLayers).values({ rackId, layer, color });
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
