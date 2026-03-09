"use client";

import { DataManagement } from "@/components/settings/data-management";
import { TimelineSettings } from "@/components/settings/timeline-settings";
import { FacilityProvider } from "@/components/providers/facility-provider";

export default function SettingsPage() {
    return (
        <FacilityProvider>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 flex-col">
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-4">
                        <TimelineSettings />
                        <DataManagement />
                    </div>
                </div>
            </div>
        </FacilityProvider>
    );
}
