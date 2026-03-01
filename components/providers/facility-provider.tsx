"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useFacility as useFacilityHook } from "@/hooks/use-facility";

interface FacilityContextType {
    racks: any[];
    settings: any;
    isLoading: boolean;
    refresh: (showLoading?: boolean) => Promise<void>;
}

const FacilityContext = createContext<FacilityContextType | null>(null);

export function FacilityProvider({ children }: { children: React.ReactNode }) {
    const { getAllRacks, getFacilitySettings, repairRackUsage } = useFacilityHook();

    // Initial fetch should be triggered on mount
    const [racks, setRacks] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            await repairRackUsage();
            const [racksData, settingsData] = await Promise.all([
                getAllRacks(),
                getFacilitySettings()
            ]);
            setRacks(racksData || []);
            setSettings(settingsData || { roomWidth: 20, roomHeight: 15 });
        } catch (error) {
            console.error("Failed to refresh facility data:", error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [getAllRacks, getFacilitySettings]);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <FacilityContext.Provider value={{ racks, settings, isLoading, refresh }}>
            {children}
        </FacilityContext.Provider>
    );
}

export function useFacilityData() {
    const context = useContext(FacilityContext);
    if (!context) {
        throw new Error("useFacilityData must be used within a FacilityProvider");
    }
    return context;
}
