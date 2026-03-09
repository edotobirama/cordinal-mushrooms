"use client";

import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useFacility } from '@/hooks/use-facility';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { RackDetailsDialog } from './rack-details-dialog';
import { useFacilityData } from '@/components/providers/facility-provider';

interface Rack {
    id: number;
    name: string;
    x: number;
    y: number;
    capacity: number;
    currentUsage: number;
    status: string;
    width?: number;
    height?: number;
    rotation?: number;
    material?: string;
    totalLayers?: number;
    lightType?: string;
    shakeNeeded?: boolean;
}

const GRID_SIZE = 40; // Size of grid squares in pixels

function DraggableRack({ rack, style, mode, onSelect, activeFilter }: { rack: Rack, style?: React.CSSProperties, mode: 'edit' | 'access', onSelect: () => void, activeFilter: string | null }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: Number(rack.id),
        data: { x: Number(rack.x), y: Number(rack.y), width: Number(rack.width), height: Number(rack.height) },
        disabled: mode === 'access'
    });

    const draggableStyle = {
        transform: CSS.Translate.toString(transform),
        left: Number(rack.x) * GRID_SIZE,
        top: Number(rack.y) * GRID_SIZE,
        width: Number(rack.width || 2) * GRID_SIZE,
        height: Number(rack.height || 1) * GRID_SIZE,
        zIndex: isDragging ? 50 : 10,
        touchAction: 'none',
        ...style,
    };

    const usagePercent = Math.round((Number(rack.currentUsage) / Number(rack.capacity)) * 100);
    const isCement = rack.material === 'Cement';

    // Light Color Logic
    let lightColorClass = "bg-slate-400"; // Default
    if (rack.lightType === 'Blue') lightColorClass = "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
    if (rack.lightType === 'Pink') lightColorClass = "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]";
    if (rack.lightType === 'White') lightColorClass = "bg-yellow-100 shadow-[0_0_10px_rgba(253,224,71,0.5)] border-yellow-200";

    const { actionMap } = useFacilityData();
    const rackActions = actionMap?.[rack.id] || {};

    let hasActiveFilter = false;
    let hasAnyAction = false;

    Object.values(rackActions).forEach(layerActions => {
        if (activeFilter && layerActions[activeFilter] && layerActions[activeFilter].length > 0) {
            hasActiveFilter = true;
        }
        if (Object.keys(layerActions).length > 0) {
            hasAnyAction = true;
        }
    });

    let filterGlowClass = "";
    if (hasActiveFilter && activeFilter) {
        if (activeFilter === 'red') filterGlowClass = "ring-4 ring-offset-1 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] z-20 scale-[1.02] border-red-500";
        if (activeFilter === 'purple') filterGlowClass = "ring-4 ring-offset-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-20 scale-[1.02] border-purple-500";
        if (activeFilter === 'green') filterGlowClass = "ring-4 ring-offset-1 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-20 scale-[1.02] border-emerald-500";
        if (activeFilter === 'yellow') filterGlowClass = "ring-4 ring-offset-1 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] z-20 scale-[1.02] border-amber-500";
        if (activeFilter === 'orange') filterGlowClass = "ring-4 ring-offset-1 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] z-20 scale-[1.02] border-orange-500";
        if (activeFilter === 'blue') filterGlowClass = "ring-4 ring-offset-1 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20 scale-[1.02] border-blue-500";
    }

    return (
        <div
            ref={setNodeRef}
            style={draggableStyle}
            {...(mode === 'edit' ? listeners : {})}
            {...(mode === 'edit' ? attributes : {})}
            onClick={(e) => {
                if (mode === 'access') {
                    e.stopPropagation();
                    onSelect();
                }
            }}
            className={cn(
                "absolute border-2 rounded-md flex flex-col items-center justify-center text-xs font-bold shadow-sm transition-all select-none overflow-hidden",
                mode === 'edit' ? "cursor-move hover:border-primary" : "cursor-pointer hover:scale-105 active:scale-95 pointer-events-auto",
                rack.status === 'Maintenance' ? 'border-destructive bg-destructive/10' : 'border-border',
                isCement ? 'bg-stone-300 dark:bg-stone-800' : 'bg-slate-200 dark:bg-slate-900',
                rack.shakeNeeded && !hasActiveFilter && "border-orange-500 border-4 animate-pulse",
                isDragging && "shadow-xl opacity-80 ring-2 ring-primary",
                filterGlowClass
            )}
            title={`${rack.name} (${rack.material}, ${rack.totalLayers} layers) - ${rack.lightType} Light`}
        >
            <span className="truncate max-w-full px-1">{rack.name}</span>
            <div className="w-[90%] h-1 bg-secondary mt-1 overflow-hidden rounded-full">
                <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5">{rack.currentUsage}/{rack.capacity}</span>

            {/* Visual helper for material */}
            <div className={cn("absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full", isCement ? "bg-stone-500" : "bg-blue-400")} />

            {/* Light Indicator */}
            <div className={cn("absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-white/20", lightColorClass)} />

            {/* Warning Icon */}
            {hasAnyAction && (
                <div className={cn("absolute -top-2 -left-2 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center shadow-md",
                    hasActiveFilter ? "bg-primary animate-bounce ring-2 ring-white" : "bg-orange-500"
                )}>
                    A
                </div>
            )}
        </div>
    );
}

export function BlueprintEditor({ racks, roomWidth = 20, roomHeight = 15, activeFilter = null }: { racks: Rack[], roomWidth?: number, roomHeight?: number, activeFilter?: string | null }) {
    const [items, setItems] = useState<Rack[]>(racks);
    const [isSaving, setIsSaving] = useState(false);
    const [mode, setMode] = useState<'edit' | 'access'>('access');
    const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
    const [scale, setScale] = useState(1);
    const { updateRackPositions } = useFacility();
    const { refresh } = useFacilityData(); // Use the global refresh

    useEffect(() => {
        // Sync items with props, ensuring all numbers are numbers
        const sanitizedRacks = racks.map(r => ({
            ...r,
            id: Number(r.id),
            x: Number(r.x),
            y: Number(r.y),
            width: Number(r.width) || 2,
            height: Number(r.height) || 1,
            capacity: Number(r.capacity),
            currentUsage: Number(r.currentUsage),
            totalLayers: Number(r.totalLayers) || 7,
            rotation: Number(r.rotation) || 0
        }));
        setItems(sanitizedRacks);
    }, [racks]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 2, // Lower distance for easier drag start
            },
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        if (mode === 'access') return;

        const { active, delta } = event;
        const rackId = Number(active.id);

        setItems((prev) => {
            return prev.map((item) => {
                if (item.id === rackId) {
                    const itemXPx = Number(item.x) * GRID_SIZE;
                    const itemYPx = Number(item.y) * GRID_SIZE;

                    const newXPx = itemXPx + (delta.x / scale);
                    const newYPx = itemYPx + (delta.y / scale);

                    const newX = Math.max(0, Math.round(newXPx / GRID_SIZE));
                    const newY = Math.max(0, Math.round(newYPx / GRID_SIZE));

                    return { ...item, x: newX, y: newY };
                }
                return item;
            });
        });
    }

    async function handleSave() {
        setIsSaving(true);
        try {
            const positions = items.map(r => ({ id: r.id, x: Number(r.x), y: Number(r.y) }));
            await updateRackPositions(positions);
            await refresh(false); // Refresh global state silently
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Facility Blueprint</h2>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'edit' ? 'Drag racks to arrange. Click Save when done.' : 'Click a rack to view details.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-secondary rounded-lg p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                                className="h-8 w-8 p-0"
                            >
                                -
                            </Button>
                            <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setScale(s => Math.min(1.5, s + 0.1))}
                                className="h-8 w-8 p-0"
                            >
                                +
                            </Button>
                        </div>

                        <div className="flex items-center bg-secondary rounded-lg p-1">
                            <Button
                                variant={mode === 'access' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setMode('access')}
                                className="text-xs"
                            >
                                Access
                            </Button>
                            <Button
                                variant={mode === 'edit' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setMode('edit')}
                                className="text-xs"
                            >
                                Edit
                            </Button>
                        </div>
                        {mode === 'edit' && (
                            <Button onClick={handleSave} disabled={isSaving} size="sm">
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? "Saving..." : "Save Layout"}
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="bg-background border-2 border-dashed border-border">
                    <CardContent
                        className="p-0 relative w-full overflow-auto touch-pan-x touch-pan-y bg-muted/20"
                        style={{ height: '70vh' }}
                    >
                        <div
                            style={{
                                width: Math.max(roomWidth * GRID_SIZE * scale, 800) + 'px', // Ensure min width for scrolling on tiny screens
                                minHeight: '100%',
                                position: 'relative',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <div
                                style={{
                                    width: `${roomWidth * GRID_SIZE}px`,
                                    height: `${roomHeight * GRID_SIZE}px`,
                                    position: 'relative',
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'center center',
                                    transition: 'transform 0.2s ease-out',
                                    backgroundColor: 'var(--background)',
                                    boxShadow: '0 0 40px rgba(0,0,0,0.1)',
                                    margin: 'auto'
                                }}
                            >
                                {/* Grid Background */}
                                <div
                                    className="absolute inset-x-0 top-0 pointer-events-none opacity-20"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                                        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                                        borderRight: '1px solid currentColor',
                                        borderBottom: '1px solid currentColor',
                                    }}
                                />

                                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                    {items.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <p className="text-muted-foreground bg-background/80 p-2 rounded">No racks to display in blueprint</p>
                                        </div>
                                    )}
                                    {items.map((rack) => (
                                        <DraggableRack
                                            key={Number(rack.id)}
                                            rack={rack}
                                            mode={mode}
                                            activeFilter={activeFilter}
                                            onSelect={() => {
                                                if (mode === 'access') {
                                                    setSelectedRack(rack);
                                                }
                                            }}
                                        />
                                    ))}
                                </DndContext>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Rack Details Modal */}
            <RackDetailsDialog
                open={!!selectedRack}
                onOpenChange={(open) => !open && setSelectedRack(null)}
                rackId={selectedRack?.id || null}
                activeFilter={activeFilter}
            />
        </div>
    );
}
