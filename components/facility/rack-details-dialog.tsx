import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useFacility } from "@/hooks/use-facility";
import { cn } from "@/lib/utils";
import { LayerDetailsDialog } from "./layer-details-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Lightbulb, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RackDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rackId: number | null;
}

interface Batch {
    id: number;
    name: string;
    startDate: string;
    jarCount: number;
    layer: number;
    status: string;
    type: string;
    stage: string;
    sourceId?: string;
}

interface RackDetails {
    id: number;
    name: string;
    material: string;
    totalLayers: number;
    capacity: number;
    currentUsage: number;
    batches: Batch[];
    layers: { layer: number, color: string }[];
}

import { useFacilityData } from "@/components/providers/facility-provider";

export function RackDetailsDialog({ open, onOpenChange, rackId }: RackDetailsDialogProps) {
    const [rack, setRack] = useState<RackDetails | null>(null);
    const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
    const { getRackDetails, updateLayerColor, updateRackLayerCount } = useFacility();
    const { refresh } = useFacilityData();

    const refreshRack = () => {
        if (rackId) {
            getRackDetails(rackId).then((data) => {
                if (data) {
                    setRack(data as unknown as RackDetails);
                    refresh(false); // Update global state (rack cards) without resetting view
                }
            });
        }
    };

    useEffect(() => {
        if (open) refreshRack();
    }, [open, rackId, getRackDetails]);

    const handleColorChange = async (layerNum: number, color: string) => {
        if (!rack) return;
        await updateLayerColor(rack.id, layerNum, color);
        refreshRack();
    };

    const handleLayerResize = async (increment: number) => {
        if (!rack) return;
        try {
            await updateRackLayerCount(rack.id, increment);
            refreshRack();
        } catch (error) {
            console.error("Failed to update layers", error);
            alert(error instanceof Error ? error.message : "Failed to update");
        }
    };

    if (!rack) return null;

    const layers = Array.from({ length: rack.totalLayers }, (_, i) => i + 1).reverse(); // Top to bottom

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>{rack.name} - Detailed View</DialogTitle>
                                <DialogDescription>
                                    Type: {rack.material} | Layers: {rack.totalLayers} | Capacity: {rack.currentUsage || 0} / {rack.capacity}
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleLayerResize(1)}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Layer
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleLayerResize(-1)} disabled={rack.totalLayers <= 1}>
                                    <Minus className="w-4 h-4 mr-1" /> Remove Layer
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex justify-end gap-2 px-4">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 text-xs bg-orange-100 text-orange-800 hover:bg-orange-200"
                            onClick={() => window.location.reload()}
                        >
                            Force Reload Page
                        </Button>
                    </div>

                    <div className="flex flex-col gap-4 py-4 items-center">
                        <div className="w-full max-w-md border-x-4 border-t-4 border-stone-400 bg-stone-100 dark:bg-stone-900 p-4 rounded-t-lg min-h-[400px] flex flex-col justify-end gap-2 relative">
                            {/* Rack Frame Visuals */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-stone-400" />

                            {layers.map((layerNum) => {
                                const layerBatches = rack.batches.filter(b => b.layer === layerNum);
                                const hasBatches = layerBatches.length > 0;
                                const jarCount = layerBatches.reduce((acc, b) => acc + b.jarCount, 0);

                                // Determine content type(s)
                                const types = Array.from(new Set(layerBatches.map(b => b.type)));
                                const isLC = types.includes("Liquid Culture");
                                const isBC = types.includes("Base Culture");
                                const isJars = types.some(t => !["Liquid Culture", "Base Culture"].includes(t));

                                // Find layer color (Custom overrides)
                                const layerData = rack.layers?.find(l => l.layer === layerNum);
                                const layerColor = layerData?.color || "White"; // Default

                                let glowClass = "";
                                if (layerColor === 'Blue') glowClass = "shadow-[inset_0_0_20px_rgba(59,130,246,0.3)] border-blue-300";
                                if (layerColor === 'Pink') glowClass = "shadow-[inset_0_0_20px_rgba(236,72,153,0.3)] border-pink-300";
                                if (layerColor === 'White') glowClass = "shadow-[inset_0_0_20px_rgba(255,255,255,0.3)] border-stone-300";

                                // Content-based Styling overrides (if active batches exist)
                                let bgClass = hasBatches ? "bg-emerald-100/50 dark:bg-emerald-900/20" : "bg-transparent";
                                let textClass = "text-emerald-600 dark:text-emerald-400";
                                let countLabel = "Jars";

                                if (hasBatches) {
                                    if (isLC && !isJars && !isBC) {
                                        bgClass = "bg-cyan-100/50 dark:bg-cyan-900/20";
                                        glowClass = "border-cyan-300"; // Override border
                                        textClass = "text-cyan-600 dark:text-cyan-400";
                                        countLabel = "LC";
                                    } else if (isBC && !isJars && !isLC) {
                                        bgClass = "bg-rose-100/50 dark:bg-rose-900/20";
                                        glowClass = "border-rose-300";
                                        textClass = "text-rose-600 dark:text-rose-400";
                                        countLabel = "Plates";
                                    } else if (types.length > 1) {
                                        // Mixed
                                        bgClass = "bg-slate-100/50 dark:bg-slate-900/20";
                                        textClass = "text-slate-600 dark:text-slate-400";
                                        countLabel = "Items";
                                    }
                                }


                                return (
                                    <div
                                        key={layerNum}
                                        className={cn(
                                            "w-full h-12 border-b-4 flex items-center justify-between px-4 transition-all relative group",
                                            bgClass,
                                            glowClass || (layerColor === 'Off' ? "border-stone-800 bg-black/5" : "border-stone-300")
                                        )}
                                    >
                                        <div
                                            className="flex-1 h-full flex items-center cursor-pointer"
                                            onClick={() => setSelectedLayer(layerNum)}
                                        >
                                            <span className="font-mono text-sm text-stone-500 mr-4">L-{layerNum}</span>
                                            {hasBatches ? (
                                                <div className="flex gap-2 text-xs">
                                                    <span className={cn("font-bold", textClass)}>{jarCount} {countLabel}</span>
                                                    <span className="text-muted-foreground">({layerBatches.length} Batches)</span>
                                                    {isLC && <span className="text-[10px] bg-cyan-200 text-cyan-800 px-1 rounded self-center">LC</span>}
                                                    {isBC && <span className="text-[10px] bg-rose-200 text-rose-800 px-1 rounded self-center">BC</span>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-stone-400 italic">Empty</span>
                                            )}
                                        </div>

                                        {/* Light Control */}
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[10px] uppercase font-bold mr-2 hidden group-hover:block",
                                                layerColor === 'Off' ? "text-stone-400" : "text-stone-600"
                                            )}>
                                                {layerColor === 'Off' ? "Lights: OFF" : `Light: ${layerColor}`}
                                            </span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className={cn(
                                                        "p-1 rounded-full transition-all",
                                                        layerColor === 'Off' ? "bg-stone-200 hover:bg-stone-300 dark:bg-stone-800" : "bg-white hover:bg-stone-100 dark:bg-stone-700 shadow-sm"
                                                    )}>
                                                        <Lightbulb
                                                            className={cn(
                                                                "w-4 h-4",
                                                                layerColor === 'Blue' ? "text-blue-500 fill-blue-500" :
                                                                    layerColor === 'Pink' ? "text-pink-500 fill-pink-500" :
                                                                        layerColor === 'White' ? "text-yellow-500 fill-yellow-500" :
                                                                            "text-stone-400" // Off
                                                            )}
                                                        />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleColorChange(layerNum, "Off")}>
                                                        <div className="w-3 h-3 rounded-full bg-stone-400 border mr-2" /> Off
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleColorChange(layerNum, "White")}>
                                                        <div className="w-3 h-3 rounded-full bg-yellow-100 border mr-2" /> White
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleColorChange(layerNum, "Blue")}>
                                                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" /> Blue
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleColorChange(layerNum, "Pink")}>
                                                        <div className="w-3 h-3 rounded-full bg-pink-500 mr-2" /> Pink
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="w-full max-w-md h-4 bg-stone-400 rounded-b-lg" />
                    </div>
                </DialogContent>
            </Dialog >

            <LayerDetailsDialog
                open={!!selectedLayer}
                onOpenChange={(isOpen: boolean) => !isOpen && setSelectedLayer(null)}
                layerNumber={selectedLayer}
                rack={rack}
                onUpdate={refreshRack}
            />
        </>
    );
}
