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


    const incubation = { jars: 0, lc: 0, agar: 0 };
    incubationStats.forEach((stat: any) => {
        if (stat.type === "Jars" || stat.type === "Spawn" || stat.type === "Grain" || stat.type === "Basal Medium") incubation.jars += stat.totalItems || 0;
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

    const storage = { lc: 0, agar: 0, jars: 0 };
    storageStats.forEach((stat: any) => {
        if (stat.type === "Liquid-Culture") storage.lc = stat.count || 0;
        else if (stat.type === "Base Culture") storage.agar = stat.count || 0;
        else if (stat.type === "Jars" || stat.type === "Spawn") storage.jars = stat.count || 0;
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

    const settingsRes = await db.select().from(schema.facilitySettings).limit(1);
    const settings = settingsRes.length > 0 ? settingsRes[0] : { removeClothDay: 14, light1Day: 15, light2Day: 17 };
    const { removeClothDay, light1Day, light2Day } = settings as any;

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
            if (daysDiff === removeClothDay) {
                actions.push({
                    type: 'Blanket',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Remove blanket for ${batch.name} in ${batch.rackName} (Day ${removeClothDay})`,
                    icon: CheckCircle2,
                    color: "text-blue-500"
                });
            } else if (daysDiff === light1Day) {
                actions.push({
                    type: 'Light',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Switch on Light 1 for ${batch.name} in ${batch.rackName} (Day ${light1Day})`,
                    icon: Lightbulb,
                    color: "text-amber-500"
                });
            } else if (daysDiff === light2Day) {
                actions.push({
                    type: 'Light',
                    batch: batch.name,
                    rack: batch.rackName,
                    message: `Switch on Light 2 for ${batch.name} in ${batch.rackName} (Day ${light2Day})`,
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
        id: schema.batches.id,
        startDate: schema.batches.startDate,
        type: schema.batches.type,
        jarCount: schema.batches.jarCount,
    })
        .from(schema.batches)
        .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])));

    // Determine which batches have already had cloth removed
    const removeClothActions = await db.select({
        batchId: schema.batchActions.batchId
    })
        .from(schema.batchActions)
        .where(eq(schema.batchActions.actionType, "Remove Cloth"));

    const batchesWithoutCloth = new Set(removeClothActions.map((a: any) => a.batchId));

    const settingsRes = await db.select().from(schema.facilitySettings).limit(1);
    const settings = settingsRes.length > 0 ? settingsRes[0] : { removeClothDay: 14, light1Day: 15, light2Day: 17 };
    const { removeClothDay, light1Day, light2Day } = settings as any;

    const today = new Date();
    let removeClothJars = 0;
    let switchLightsJars = 0;
    let harvestReadyJars = 0;

    for (const batch of activeBatches) {
        const start = parseISO(batch.startDate);
        const daysDiff = differenceInCalendarDays(today, start);
        const hasCloth = !batchesWithoutCloth.has(batch.id);

        if (batch.type === 'Liquid Culture') {
            if (daysDiff >= 20 && hasCloth) {
                removeClothJars += batch.jarCount;
            } else if (daysDiff >= 20 && daysDiff <= 22) {
                switchLightsJars += batch.jarCount;
            } else if (daysDiff >= 22) {
                harvestReadyJars += batch.jarCount;
            }
        } else {
            if (daysDiff >= removeClothDay && hasCloth) {
                removeClothJars += batch.jarCount;
            } else if (daysDiff === light1Day || daysDiff >= light2Day) {
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

export async function getDashboardGridStatsService(db: any) {
    const today = new Date();

    // Initialize the structure matching the UI
    const gridStats = {
        fruitingRoom: {
            baseCulture: { total: 0, inDarkness: 0, inLight: 0, toKeepInLight: 0, toHarvest: 0, toDiscard: 0 },
            liquidCulture: { total: 0, inDarkness: 0, inLight: 0, toShake: 0, toKeepInLight: 0, toHarvest: 0 },
            jars: { total: 0, inDarkness: 0, inLight: 0, removeCloth: 0, toKeepInLight: 0, toHarvest: 0 },
        },
        storageRoom: {
            baseCulture: { total: 0, preserved: 0, aboutToExpire: 0, expired: 0, preservedExpired: 0, preservedAboutToExpire: 0 },
            liquidCulture: { total: 0, aboutToExpire: 0, expired: 0 },
            jars: {
                fresh: { total: 0, aboutToExpire: 0, expired: 0 },
                dry: { total: 0, aboutToExpire: 0, expired: 0 }
            }
        }
    };

    // --- 1. FRUITING ROOM (Active Batches) ---
    // Fetch active batches and their associated rack light setting to determine darkness/light
    const activeBatches = await db.select({
        id: schema.batches.id,
        type: schema.batches.type,
        jarCount: schema.batches.jarCount,
        startDate: schema.batches.startDate,
        lightStatus: schema.racks.lightStatus
    })
        .from(schema.batches)
        .leftJoin(schema.racks, eq(schema.batches.rackId, schema.racks.id))
        .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])));

    const pendingLcShakes = await getPendingLcShakesService(db);
    const batchesNeedingShake = new Set(pendingLcShakes.map((b: any) => b.id));

    const settingsRes = await db.select().from(schema.facilitySettings).limit(1);
    const settings = settingsRes.length > 0 ? settingsRes[0] : { removeClothDay: 14, light1Day: 15, light2Day: 17 };
    const { removeClothDay, light1Day, light2Day } = settings as any;

    activeBatches.forEach((batch: any) => {
        const start = parseISO(batch.startDate);
        const age = differenceInCalendarDays(today, start);
        const inLight = batch.lightStatus === true || batch.lightStatus === 1;
        const inDarkness = !inLight;

        if (batch.type === 'Base Culture') {
            const stats = gridStats.fruitingRoom.baseCulture;
            stats.total += batch.jarCount;
            if (inDarkness) stats.inDarkness += batch.jarCount;
            else stats.inLight += batch.jarCount;

            if (age >= 18 && age < 23) stats.toHarvest += batch.jarCount;
            if (age >= 23 || age > 60) stats.toDiscard += batch.jarCount;
        }
        else if (batch.type === 'Liquid Culture') {
            const stats = gridStats.fruitingRoom.liquidCulture;

            stats.total += batch.jarCount;
            if (inDarkness) stats.inDarkness += batch.jarCount;
            else stats.inLight += batch.jarCount;

            if (batchesNeedingShake.has(batch.id)) stats.toShake += batch.jarCount;
            if (age >= 20 && inDarkness) stats.toKeepInLight += batch.jarCount;
            if (age >= 22) stats.toHarvest += batch.jarCount;
        }
        else if (batch.type === 'Jars' || batch.type === 'Spawn' || batch.type === 'Grain') {
            const stats = gridStats.fruitingRoom.jars;
            stats.total += batch.jarCount;
            if (inDarkness) stats.inDarkness += batch.jarCount;
            else stats.inLight += batch.jarCount;

            if (age === removeClothDay) stats.removeCloth += batch.jarCount;
            if ((age === light1Day || age >= light2Day) && inDarkness) stats.toKeepInLight += batch.jarCount;
            if (age >= 60) stats.toHarvest += batch.jarCount;
        }
    });

    // --- 2. STORAGE ROOM (Inventory) ---
    const storedItems = await db.select().from(schema.inventoryItems);

    storedItems.forEach((item: any) => {
        const createdDate = parseISO(item.createdAt);
        const storageAgeDays = differenceInCalendarDays(today, createdDate);

        if (item.type === 'Base Culture') {
            const stats = gridStats.storageRoom.baseCulture;
            const isPreserved = item.isPreserved;

            stats.total += item.quantity;
            if (isPreserved) {
                const pExpired = storageAgeDays >= 730; // 2 years
                const pAbout = storageAgeDays >= 700 && storageAgeDays < 730; // ~1 month before
                stats.preserved += item.quantity;
                if (pAbout) stats.preservedAboutToExpire += item.quantity;
                if (pExpired) stats.preservedExpired += item.quantity;
            } else {
                const uExpired = storageAgeDays >= 180; // 6 months
                const uAbout = storageAgeDays >= 150 && storageAgeDays < 180; // ~1 month before
                if (uAbout) stats.aboutToExpire += item.quantity;
                if (uExpired) stats.expired += item.quantity;
            }
        }
        else if (item.type === 'Liquid-Culture') {
            const stats = gridStats.storageRoom.liquidCulture;
            const lcExpired = storageAgeDays >= 90; // 3 months
            const lcAbout = storageAgeDays >= 60 && storageAgeDays < 90; // 1 month before
            stats.total += item.quantity;
            if (lcAbout) stats.aboutToExpire += item.quantity;
            if (lcExpired) stats.expired += item.quantity;
        }
        else if (item.type === 'Jars') {
            const stats = gridStats.storageRoom.jars.fresh;
            const fExpired = storageAgeDays >= 60; // 2 months
            const fAbout = storageAgeDays >= 46 && storageAgeDays < 60; // 2 weeks before
            stats.total += item.quantity;
            if (fAbout) stats.aboutToExpire += item.quantity;
            if (fExpired) stats.expired += item.quantity;
        }
        else if (item.type === 'Dried') {
            const stats = gridStats.storageRoom.jars.dry;
            const dExpired = storageAgeDays >= 730; // 2 years
            const dAbout = storageAgeDays >= 670 && storageAgeDays < 730; // 2 months before
            stats.total += item.quantity;
            if (dAbout) stats.aboutToExpire += item.quantity;
            if (dExpired) stats.expired += item.quantity;
        }
    });

    return gridStats;
}

export async function getFacilityActionMapService(db: any) {
    const today = new Date();

    // ActionMap Structure:
    // actionMap[rackId][layerId][actionColor] = [batchIds...]
    // Color Mapping: Red(Discard), Purple(Shake), Green(Harvest), Yellow(Light), Blue(Cloth)
    const actionMap: Record<number, Record<number, Record<string, number[]>>> = {};

    const activeBatches = await db.select({
        id: schema.batches.id,
        name: schema.batches.name,
        type: schema.batches.type,
        startDate: schema.batches.startDate,
        rackId: schema.batches.rackId,
        lightStatus: schema.racks.lightStatus
    })
        .from(schema.batches)
        .leftJoin(schema.racks, eq(schema.batches.rackId, schema.racks.id))
        .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])));

    const pendingLcShakes = await getPendingLcShakesService(db);
    const batchesNeedingShake = new Set(pendingLcShakes.map((b: any) => b.id));

    const batchLocations = await db.select().from(schema.batchLocations);
    const locationsByBatch = batchLocations.reduce((acc: any, loc: any) => {
        if (!acc[loc.batchId]) acc[loc.batchId] = [];
        acc[loc.batchId].push(loc);
        return acc;
    }, {});

    // Fetch Remove Cloth actions to determine true hasCloth state
    const removeClothActions = await db.select({
        batchId: schema.batchActions.batchId
    })
        .from(schema.batchActions)
        .where(eq(schema.batchActions.actionType, "Remove Cloth"));

    const batchesWithoutCloth = new Set(removeClothActions.map((a: any) => a.batchId));

    const settingsRes = await db.select().from(schema.facilitySettings).limit(1);
    const settings = settingsRes.length > 0 ? settingsRes[0] : { removeClothDay: 14, light1Day: 15, light2Day: 17 };
    const { removeClothDay, light1Day, light2Day } = settings as any;

    for (const batch of activeBatches) {
        if (!batch.rackId) continue;

        const start = parseISO(batch.startDate);
        const age = differenceInCalendarDays(today, start);
        const inLight = batch.lightStatus === true || batch.lightStatus === 1;
        const inDarkness = !inLight;

        let requiredActionColor = null;

        const hasCloth = !batchesWithoutCloth.has(batch.id);

        if (batch.type === 'Base Culture') {
            if (age >= 23 || age > 60) requiredActionColor = 'red'; // Discard
            else if (age >= 18 && age < 23) requiredActionColor = 'green'; // Harvest
        }
        else if (batch.type === 'Liquid Culture') {
            if (batchesNeedingShake.has(batch.id)) requiredActionColor = 'purple'; // Shake
            else if (age >= 20 && hasCloth) requiredActionColor = 'blue'; // Priority: Remove Cloth
            else if (age >= 20 && inDarkness) requiredActionColor = 'yellow'; // Light On
            else if (age >= 22) requiredActionColor = 'green'; // Harvest
        }
        else if (batch.type === 'Jars' || batch.type === 'Spawn' || batch.type === 'Grain' || batch.type === 'Basal Medium') {
            if (age >= removeClothDay && hasCloth) requiredActionColor = 'blue'; // Remove Cloth
            else if ((age === light1Day || age >= light2Day) && inDarkness) requiredActionColor = 'yellow'; // Light 1 and Light 2 Triggers
            else if (age >= 60) requiredActionColor = 'green'; // Harvest
        }

        if (requiredActionColor) {
            if (!actionMap[batch.rackId]) actionMap[batch.rackId] = {};

            const locations = locationsByBatch[batch.id] || [{ layer: 1 }]; // Fallback

            for (const loc of locations) {
                const layerId = loc.layer || 1;
                if (!actionMap[batch.rackId][layerId]) actionMap[batch.rackId][layerId] = {};
                if (!actionMap[batch.rackId][layerId][requiredActionColor]) actionMap[batch.rackId][layerId][requiredActionColor] = [];

                actionMap[batch.rackId][layerId][requiredActionColor].push(batch.id);
            }
        }
    }

    return actionMap;
}
