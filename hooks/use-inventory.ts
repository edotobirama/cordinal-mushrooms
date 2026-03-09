import { saveDatabase } from "@/lib/db/client";
import { useDb } from "@/components/providers/db-provider";
import { useCallback } from "react";
import {
    addToInventoryService,
    updateInventoryItemService,
    deleteInventoryItemService,
    discardInventoryItemService,
    permanentlyDeleteBatchService,
    permanentlyDeleteWasteItemService,
    updateInventoryItemNotesService,
    addMaterialService,
    updateStockService,
    deleteMaterialService,
    performDailyCheckService,
    getInventoryItemsByTypeService,
    convertJarToDriedService
} from "@/lib/services/inventory";

export function useInventory() {
    const { db } = useDb();

    const addToInventory = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const get = (key: string) => (formData instanceof FormData ? formData.get(key) : formData[key]);

        await addToInventoryService(db, {
            name: get("name") as string,
            type: get("type") as string,
            quantity: Number(get("quantity")),
            unit: get("unit") as string,
            isPreserved: get("isPreserved") === "on",
            notes: get("notes") as string
        });
        await saveDatabase();
    }, [db]);

    const updateInventoryItem = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const get = (key: string) => (formData instanceof FormData ? formData.get(key) : formData[key]);

        await updateInventoryItemService(db, {
            id: Number(get("id")),
            quantity: Number(get("quantity")),
            notes: get("notes") as string
        });
        await saveDatabase();
    }, [db]);

    const deleteInventoryItem = useCallback(async (id: number) => {
        if (!db) return;
        await deleteInventoryItemService(db, id);
        await saveDatabase();
    }, [db]);

    const addMaterial = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const get = (key: string) => (formData instanceof FormData ? formData.get(key) : formData[key]);

        await addMaterialService(db, {
            name: get("name") as string,
            quantity: Number(get("quantity")),
            unit: get("unit") as string,
            lowStockThreshold: Number(get("lowStockThreshold"))
        });
        await saveDatabase();
    }, [db]);

    const updateStock = useCallback(async (id: number, newQuantity: number) => {
        if (!db) return;
        await updateStockService(db, id, newQuantity);
        await saveDatabase();
    }, [db]);

    const deleteMaterial = useCallback(async (id: number) => {
        if (!db) return;
        await deleteMaterialService(db, id);
        await saveDatabase();
    }, [db]);

    const performDailyCheck = useCallback(async (formData: FormData | any) => {
        if (!db) return;
        const entries = formData instanceof FormData ? Array.from(formData.entries()) : Object.entries(formData);

        await performDailyCheckService(db, entries as [string, any][]);
        await saveDatabase();
    }, [db]);

    const getInventoryItemsByType = useCallback(async (type: string) => {
        if (!db) return [];
        return await getInventoryItemsByTypeService(db, type);
    }, [db]);

    const convertToDried = useCallback(async (id: number) => {
        if (!db) return;
        await convertJarToDriedService(db, id);
        await saveDatabase();
    }, [db]);

    const discardInventoryItem = useCallback(async (id: number) => {
        if (!db) return;
        await discardInventoryItemService(db, id);
        await saveDatabase();
    }, [db]);

    const permanentlyDeleteBatch = useCallback(async (batchId: number) => {
        if (!db) return;
        await permanentlyDeleteBatchService(db, batchId);
        await saveDatabase();
    }, [db]);

    const permanentlyDeleteWasteItem = useCallback(async (id: number) => {
        if (!db) return;
        await permanentlyDeleteWasteItemService(db, id);
        await saveDatabase();
    }, [db]);

    const updateInventoryItemNotes = useCallback(async (id: number, notes: string) => {
        if (!db) return;
        await updateInventoryItemNotesService(db, id, notes);
        await saveDatabase();
    }, [db]);

    return {
        addToInventory, updateInventoryItem, deleteInventoryItem, discardInventoryItem,
        permanentlyDeleteBatch, permanentlyDeleteWasteItem, updateInventoryItemNotes,
        addMaterial, updateStock, deleteMaterial, performDailyCheck, getInventoryItemsByType,
        convertToDried
    };
}
