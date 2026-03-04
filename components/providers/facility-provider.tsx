"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useDb } from "@/components/providers/db-provider";
import { getFacilityActionMapService } from '@/lib/services/dashboard';
import * as schema from '@/lib/db/schema';

interface FacilityContextType {
    racks: any[];
    settings: any;
    actionMap: Record<number, Record<number, Record<string, number[]>>>;
    isLoading: boolean;
    refresh: (immediate?: boolean) => Promise<void>;
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

export function FacilityProvider({ children }: { children: React.ReactNode }) {
    const { db } = useDb();
    const [racks, setRacks] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [actionMap, setActionMap] = useState<Record<number, Record<number, Record<string, number[]>>>>({});
    const [isLoading, setIsLoading] = useState(true);

    const refreshInterval = useRef<NodeJS.Timeout | null>(null);
    const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

    const refresh = useCallback(async (isInitial = false) => {
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);

        refreshTimeout.current = setTimeout(async () => {
            if (!db) return;
            if (isInitial) setIsLoading(true);

            try {
                const [racksData, settingsData, mapData] = await Promise.all([
                    db.select().from(schema.racks),
                    db.select().from(schema.facilitySettings).then((res: any[]) => res[0] || null),
                    getFacilityActionMapService(db)
                ]);

                // Ensure timestamps are always complete for client-side sorting
                const mappedRacks = racksData.map((rack: any) => ({
                    ...rack,
                    createdAt: rack.createdAt || new Date().toISOString(),
                    updatedAt: rack.updatedAt || new Date().toISOString()
                }));

                setRacks(mappedRacks);
                if (settingsData) setSettings(settingsData);
                if (mapData) setActionMap(mapData);
            } catch (error) {
                console.error('Failed to parse facility data:', error);
            } finally {
                setIsLoading(false);
            }
        }, isInitial ? 0 : 300); // 300ms debounce
    }, [db]);


    // Initial load and periodic refresh
    useEffect(() => {
        if (!db) return;

        // Perform initial load
        refresh(true);

        // Set up polling (every 30 seconds)
        refreshInterval.current = setInterval(() => {
            refresh(false); // background refresh, don't show loading state
        }, 30000);

        return () => {
            if (refreshInterval.current) clearInterval(refreshInterval.current);
        };
    }, [db, refresh]);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (refreshInterval.current) clearInterval(refreshInterval.current);
            if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
        };
    }, []);

    return (
        <FacilityContext.Provider value={{ racks, settings, actionMap, isLoading, refresh }}>
            {children}
        </FacilityContext.Provider>
    );
}

export function useFacilityData() {
    const context = useContext(FacilityContext);
    if (context === undefined) {
        throw new Error('useFacilityData must be used within a FacilityProvider');
    }
    return context;
}
