import { useDb } from "@/components/providers/db-provider";
import { useCallback } from "react";
import {
    getStatsService,
    getActionsService,
    getRecentActivityService,
    getPendingActionCountsService,
    getDashboardGridStatsService
} from "@/lib/services/dashboard";

export function useDashboard() {
    const { db } = useDb();

    const getStats = useCallback(async () => {
        if (!db) return { incubation: { jars: 0, lc: 0, agar: 0 }, storage: { lc: 0, agar: 0, jars: 0 }, totalCapacity: 0 };
        return await getStatsService(db);
    }, [db]);

    const getActions = useCallback(async () => {
        if (!db) return [];
        return await getActionsService(db);
    }, [db]);

    const getRecentActivity = useCallback(async () => {
        if (!db) return [];
        return await getRecentActivityService(db);
    }, [db]);

    const getPendingActionCounts = useCallback(async () => {
        if (!db) return { removeCloth: 0, switchLights: 0, harvestReady: 0, shakingNeeded: 0 };
        return await getPendingActionCountsService(db);
    }, [db]);

    const getDashboardGridStats = useCallback(async () => {
        if (!db) return null;
        return await getDashboardGridStatsService(db);
    }, [db]);

    return { getStats, getActions, getRecentActivity, getPendingActionCounts, getDashboardGridStats };
}
