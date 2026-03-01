import * as schema from "@/lib/db/schema";
import { eq, sql, and, inArray, not, desc, count } from "drizzle-orm";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { CheckCircle2, Lightbulb, Package, UserCheck } from "lucide-react";

export async function getPendingLcShakesService(db: any) {
    const today = new Date();

    // Determine the most recent threshold (9 AM or 9 PM)
    let mostRecentThreshold = new Date(today);
    if (today.getHours() >= 21) {
        mostRecentThreshold.setHours(21, 0, 0, 0);
    } else if (today.getHours() >= 9) {
        mostRecentThreshold.setHours(9, 0, 0, 0);
    } else {
        mostRecentThreshold.setDate(mostRecentThreshold.getDate() - 1);
        mostRecentThreshold.setHours(21, 0, 0, 0);
    }

    const activeLcBatches = await db.select().from(schema.batches).where(
        and(
            eq(schema.batches.status, "Active"),
            eq(schema.batches.type, "Liquid Culture")
        )
    );

    const pendingShakes = [];

    if (activeLcBatches.length > 0) {
        const batchIds = activeLcBatches.map((b: any) => b.id);

        // 1. Get the absolute latest shake for each batch to see if they met the threshold
        const latestActions = await db.select({
            batchId: schema.batchActions.batchId,
            lastShake: sql<string>`max(${schema.batchActions.performedAt})`
        })
            .from(schema.batchActions)
            .where(
                and(
                    inArray(schema.batchActions.batchId, batchIds),
                    eq(schema.batchActions.actionType, "Shake")
                )
            )
            .groupBy(schema.batchActions.batchId);

        const latestActionMap = new Map<number, Date>();
        latestActions.forEach((a: any) => latestActionMap.set(a.batchId, new Date(a.lastShake)));

        // 2. Count shakes just today for the UI display message
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const actionsToday = await db.select({
            batchId: schema.batchActions.batchId,
            count: sql<number>`count(*)`
        })
            .from(schema.batchActions)
            .where(
                and(
                    inArray(schema.batchActions.batchId, batchIds),
                    eq(schema.batchActions.actionType, "Shake"),
                    sql`${schema.batchActions.performedAt} >= ${startOfDay.toISOString()}`
                )
            )
            .groupBy(schema.batchActions.batchId);

        const actionTodayMap = new Map<number, number>();
        actionsToday.forEach((a: any) => actionTodayMap.set(a.batchId, a.count));

        for (const batch of activeLcBatches) {
            const startDate = parseISO(batch.startDate);
            const daysOld = differenceInCalendarDays(today, startDate);

            // Shaking is required for the first 5 days
            if (daysOld >= 0 && daysOld <= 5) {
                const lastShake = latestActionMap.get(batch.id);
                const createdBeforeThreshold = startDate <= mostRecentThreshold;
                const notShakenSinceThreshold = !lastShake || lastShake < mostRecentThreshold;

                if (createdBeforeThreshold && notShakenSinceThreshold) {
                    const shakeCountToday = actionTodayMap.get(batch.id) || 0;
                    pendingShakes.push({
                        ...batch,
                        shakeCount: shakeCountToday,
                        daysOld
                    });
                }
            }
        }
    }
    return pendingShakes;
}

export async function getStatsService(db: any) {
    const incubationStats = await db
        .select({
            type: schema.batches.type,
            count: count(),
            totalItems: sql<number>`sum(${schema.batches.jarCount})`,
        })
        .from(schema.batches)
        .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])))
        .groupBy(schema.batches.type);


    const incubation = { spawn: 0, lc: 0, agar: 0 };
    incubationStats.forEach((stat: any) => {
        if (stat.type === "Spawn" || stat.type === "Grain" || stat.type === "Basal Medium") incubation.spawn += stat.totalItems || 0;
        else if (stat.type === "Liquid Culture") incubation.lc += stat.totalItems || 0;
        else if (stat.type === "Base Culture") incubation.agar += stat.totalItems || 0;
    });

    const storageStats = await db
        .select({
            type: schema.inventoryItems.type,
            count: sql<number>`sum(${schema.inventoryItems.quantity})`,
        })
        .from(schema.inventoryItems)
        .groupBy(schema.inventoryItems.type);

    const storage = { lc: 0, agar: 0, spawn: 0 };
    storageStats.forEach((stat: any) => {
        if (stat.type === "Liquid-Culture") storage.lc = stat.count || 0;
        else if (stat.type === "Base Culture") storage.agar = stat.count || 0;
        else if (stat.type === "Spawn") storage.spawn = stat.count || 0;
    });

    const [capacityStat] = await db
        .select({ totalCapacity: sql<number>`sum(${schema.racks.capacity})` })
        .from(schema.racks);

    return {
        incubation,
        storage,
        totalCapacity: capacityStat?.totalCapacity || 0,
    };
}

export async function getActionsService(db: any) {
    const activeBatches = await db.select({
        id: schema.batches.id,
        name: schema.batches.name,
        type: schema.batches.type,
        startDate: schema.batches.startDate,
        rackName: schema.racks.name,
    })
        .from(schema.batches)
        .leftJoin(schema.racks, eq(schema.batches.rackId, schema.racks.id))
        .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])));

    const today = new Date();
    const actions = [];

    for (const batch of activeBatches) {
        const start = parseISO(batch.startDate);
        const daysDiff = differenceInCalendarDays(today, start);

        if (batch.type === 'Liquid Culture') {
            if (daysDiff === 20) {
                actions.push({
                    type: 'Blanket',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Remove cloth for ${batch.name} (Day 20)`,
                    icon: CheckCircle2,
                    color: "text-blue-500"
                });
            } else if (daysDiff > 20 && daysDiff <= 22) {
                actions.push({
                    type: 'Light',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Ensure Lights ON for ${batch.name} (Day ${daysDiff})`,
                    icon: Lightbulb,
                    color: "text-amber-500"
                });
            } else if (daysDiff >= 22) {
                actions.push({
                    type: 'Harvest',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Harvest/Store ${batch.name} (Day ${daysDiff})`,
                    icon: Package,
                    color: "text-emerald-500"
                });
            }
        } else {
            if (daysDiff === 14) {
                actions.push({
                    type: 'Blanket',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Remove blanket for ${batch.name} in ${batch.rackName}`,
                    icon: CheckCircle2,
                    color: "text-blue-500"
                });
            } else if (daysDiff === 16) {
                actions.push({
                    type: 'Light',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Switch on lights for ${batch.name} in ${batch.rackName}`,
                    icon: Lightbulb,
                    color: "text-amber-500"
                });
            } else if (daysDiff >= 60 && daysDiff < 65) {
                actions.push({
                    type: 'Harvest',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Harvest ${batch.name} in ${batch.rackName} (Day ${daysDiff})`,
                    icon: Package,
                    color: "text-emerald-500"
                });
            }
        }
    }

    const pendingShakes = await getPendingLcShakesService(db);
    for (const batch of pendingShakes) {
        actions.push({
            type: 'Shake',
            batch: batch.name,
            rack: "Check Rack",
            message: `Shake ${batch.name} (Day ${batch.daysOld}, Shaken ${batch.shakeCount}/2)`,
            icon: UserCheck,
            color: "text-purple-500"
        });
    }
    return actions;
}

export async function getRecentActivityService(db: any) {
    return await db.select({
        id: schema.batches.id,
        name: schema.batches.name,
        created: schema.batches.createdAt,
        status: schema.batches.status
    })
        .from(schema.batches)
        .orderBy(desc(schema.batches.createdAt))
        .limit(5);
}

export async function getPendingActionCountsService(db: any) {
    const activeBatches = await db.select({
        startDate: schema.batches.startDate,
        type: schema.batches.type,
        jarCount: schema.batches.jarCount,
    })
        .from(schema.batches)
        .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])));

    const today = new Date();
    let removeClothJars = 0;
    let switchLightsJars = 0;
    let harvestReadyJars = 0;

    for (const batch of activeBatches) {
        const start = parseISO(batch.startDate);
        const daysDiff = differenceInCalendarDays(today, start);

        if (batch.type === 'Liquid Culture') {
            if (daysDiff === 20) {
                removeClothJars += batch.jarCount;
            } else if (daysDiff > 20 && daysDiff <= 22) {
                switchLightsJars += batch.jarCount;
            } else if (daysDiff >= 22) {
                harvestReadyJars += batch.jarCount;
            }
        } else {
            if (daysDiff === 14) {
                removeClothJars += batch.jarCount;
            } else if (daysDiff === 16) {
                switchLightsJars += batch.jarCount;
            } else if (daysDiff >= 60 && daysDiff < 65) {
                harvestReadyJars += batch.jarCount;
            }
        }
    }

    const pendingShakes = await getPendingLcShakesService(db);

    return {
        removeCloth: removeClothJars,
        switchLights: switchLightsJars,
        harvestReady: harvestReadyJars,
        shakingNeeded: pendingShakes.reduce((acc: number, b: any) => acc + (b.jarCount || 0), 0)
    };
}
