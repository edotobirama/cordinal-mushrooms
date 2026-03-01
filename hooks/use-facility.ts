import { saveDatabase } from "@/lib/db/client";
import { useDb } from "@/components/providers/db-provider";
import { useCallback } from "react";
import {
    addRackService,
    updateRackService,
    updateRackPositionsService,
    deleteRackService,
    duplicateRackService,
    getFacilitySettingsService,
    updateFacilitySettingsService,
    moveBatchItemsService,
    getAllRacksService,
    updateLayerColorService,
    updateRackLayerCountService,
    getRackDetailsService,
    repairRackUsageService
} from "@/lib/services/facility";

export function useFacility() {
    const { db } = useDb();

    // -- Rack Management --
    const addRack = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const get = (key: string) => (formData instanceof FormData ? formData.get(key) : formData[key]);

        await addRackService(db, {
            name: get("name") as string,
            capacity: Number(get("capacity")),
            lightType: get("lightType") as string,
            width: Number(get("width")) || 2,
            height: Number(get("height")) || 1,
            material: get("material") as string || "Steel",
            totalLayers: Number(get("totalLayers")) || 7
        });
        await saveDatabase();
    }, [db]);

    const updateRack = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const get = (key: string) => (formData instanceof FormData ? formData.get(key) : formData[key]);

        await updateRackService(db, {
            id: Number(get("id")),
            name: get("name") as string,
            capacity: Number(get("capacity")),
            lightType: get("lightType") as string,
            width: Number(get("width")),
            height: Number(get("height")),
            material: get("material") as string,
            totalLayers: Number(get("totalLayers")),
            status: get("status") as string
        });
        await saveDatabase();
    }, [db]);

    const updateRackPositions = useCallback(async (positions: { id: number; x: number; y: number }[]) => {
        if (!db) return;
        await updateRackPositionsService(db, positions);
        await saveDatabase();
    }, [db]);

    const deleteRack = useCallback(async (id: number) => {
        if (!db) return;
        await deleteRackService(db, id);
        await saveDatabase();
    }, [db]);

    const duplicateRack = useCallback(async (id: number) => {
        if (!db) return;
        await duplicateRackService(db, id);
        await saveDatabase();
    }, [db]);

    // -- Settings Management --
    const getFacilitySettings = useCallback(async () => {
        if (!db) return null;
        return await getFacilitySettingsService(db);
    }, [db]);

    const updateFacilitySettings = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const get = (key: string) => (formData instanceof FormData ? formData.get(key) : formData[key]);

        await updateFacilitySettingsService(db, {
            roomWidth: Number(get("roomWidth")),
            roomHeight: Number(get("roomHeight")),
            shakeMorningTime: get("shakeMorningTime") as string,
            shakeEveningTime: get("shakeEveningTime") as string
        });
        await saveDatabase();
    }, [db]);

    // -- Movement Logic --
    const moveBatchItems = useCallback(async (items: any[], targetRackId: number, targetLayer: number) => {
        if (!db) return;
        await moveBatchItemsService(db, items, targetRackId, targetLayer);
        await saveDatabase();
    }, [db]);

    // -- Queries --
    const getAllRacks = useCallback(async () => {
        if (!db) return [];
        return await getAllRacksService(db);
    }, [db]);

    // -- Layer Management --
    const updateLayerColor = useCallback(async (rackId: number, layer: number, color: string) => {
        if (!db) return;
        await updateLayerColorService(db, rackId, layer, color);
        await saveDatabase();
    }, [db]);

    const updateRackLayerCount = useCallback(async (rackId: number, increment: number) => {
        if (!db) return;
        await updateRackLayerCountService(db, rackId, increment);
        await saveDatabase();
    }, [db]);

    const getRackDetails = useCallback(async (rackId: number) => {
        if (!db) return null;
        return await getRackDetailsService(db, rackId);
    }, [db]);

    const repairRackUsage = useCallback(async () => {
        if (!db) return 0;
        const corrections = await repairRackUsageService(db);
        if (corrections > 0) {
            await saveDatabase();
        }
        return corrections;
    }, [db]);

    return {
        addRack, updateRack, deleteRack, duplicateRack,
        moveBatchItems, getAllRacks,
        getFacilitySettings, updateFacilitySettings,
        updateLayerColor, updateRackLayerCount, getRackDetails,
        updateRackPositions,
        repairRackUsage
    };
}
