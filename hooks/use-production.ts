import { saveDatabase } from "@/lib/db/client";
import { useDb } from "@/components/providers/db-provider";
import { useCallback } from "react";
import {
    startBatchService,
    harvestBatchService,
    discardBatchService,
    deleteBatchService,
    updateBatchService,
    logBatchActionService,
    discardPartialBatchService
} from "@/lib/services/production";

export function useProduction() {
    const { db } = useDb();

    const startBatch = useCallback(async (formData: FormData | any) => {
        if (!db) throw new Error("Database not initialized");

        const get = (key: string) => {
            if (formData instanceof FormData) return formData.get(key);
            return formData[key];
        }

        const name = get("name") as string;
        const type = get("type") as string;
        const sourceId = get("sourceId") as string;
        const startDate = get("startDate") as string;
        const rackId = Number(get("rackId"));
        const jarCount = Number(get("jarCount"));
        const locationsStr = get("locations") as string;
        const providedLayer = Number(get("layer"));

        const res = await startBatchService(db, {
            name, type, sourceId, startDate, rackId, jarCount, locationsStr, providedLayer
        });

        await saveDatabase();
        return res;
    }, [db]);

    const harvestBatch = useCallback(async (batchId: number) => {
        if (!db) return;
        await harvestBatchService(db, batchId);
        await saveDatabase();
    }, [db]);

    const discardBatch = useCallback(async (batchId: number) => {
        if (!db) return;
        await discardBatchService(db, batchId);
        await saveDatabase();
    }, [db]);

    const deleteBatch = useCallback(async (id: number) => {
        if (!db) return;
        await deleteBatchService(db, id);
        await saveDatabase();
    }, [db]);

    const discardPartialBatch = useCallback(async (batchId: number, rackId: number, layer: number, quantity: number) => {
        if (!db) return;
        await discardPartialBatchService(db, batchId, rackId, layer, quantity);
        await saveDatabase();
    }, [db]);

    const updateBatch = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const get = (key: string) => (formData instanceof FormData ? formData.get(key) : formData[key]);

        await updateBatchService(db, {
            id: Number(get("id")),
            name: get("name") as string,
            sourceId: get("sourceId") as string,
            startDate: get("startDate") as string,
            jarCount: Number(get("jarCount")),
            status: get("status") as string
        });
        await saveDatabase();
    }, [db]);

    const logBatchAction = useCallback(async (batchId: number, actionType: string) => {
        if (!db) return;
        await logBatchActionService(db, batchId, actionType);
        await saveDatabase();
    }, [db]);

    return { startBatch, updateBatch, harvestBatch, discardBatch, deleteBatch, logBatchAction, discardPartialBatch };
}
