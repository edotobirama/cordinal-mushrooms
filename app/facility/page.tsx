"use client";

import { useEffect, useState } from "react";
import { AddRackDialog } from "@/components/facility/add-rack-dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, LayoutGrid, Map, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlueprintEditor } from "@/components/facility/blueprint-editor";
import { RackActions } from "@/components/facility/rack-actions";
import { RoomSettingsDialog } from "@/components/facility/room-settings-dialog";
import { FacilityProvider, useFacilityData } from "@/components/providers/facility-provider";

function FacilityContent() {
    const { racks: allRacks, settings, isLoading } = useFacilityData();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Facility</h1>
                    <p className="text-muted-foreground">
                        Manage racks, lighting, and layout.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <RoomSettingsDialog />
                    <AddRackDialog />
                </div>
            </div>

            <Tabs defaultValue="grid" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="grid">
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        Grid View
                    </TabsTrigger>
                    <TabsTrigger value="blueprint">
                        <Map className="w-4 h-4 mr-2" />
                        Blueprint
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="grid" className="space-y-4">
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {allRacks.map((rack) => (
                            <Card key={rack.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{rack.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <RackActions rack={rack} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {rack.lightType === 'Blue' && <div className="h-3 w-3 rounded-full bg-blue-500" />}
                                        {rack.lightType === 'Pink' && <div className="h-3 w-3 rounded-full bg-pink-500" />}
                                        {rack.lightType === 'White' && <div className="h-3 w-3 rounded-full bg-slate-200 border" />}
                                        <Badge className={rack.status === 'Active' ? 'bg-primary' : 'bg-destructive'}>
                                            {rack.status}
                                        </Badge>
                                    </div>
                                    <CardDescription className="mt-1">
                                        Capacity: {rack.currentUsage} / {rack.capacity} Jars
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                                        <div className="flex items-center gap-1">
                                            <Zap className="h-4 w-4" />
                                            <span>{rack.lightIntensity} Lux</span>
                                        </div>
                                        <div>
                                            {rack.lightType} Light
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {allRacks.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                                <p>No racks found. Add one to get started.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>


                <TabsContent value="blueprint" className="overflow-auto">
                    <BlueprintEditor racks={allRacks} roomWidth={settings?.roomWidth || 20} roomHeight={settings?.roomHeight || 15} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function FacilityPage() {
    return (
        <FacilityProvider>
            <FacilityContent />
        </FacilityProvider>
    );
}
