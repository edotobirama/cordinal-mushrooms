import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { AddBatchDialog } from "./add-batch-dialog";
import { EditBatchDialog } from "./edit-batch-dialog";
import { useProduction } from "@/hooks/use-production";
import { useFacility } from "@/hooks/use-facility";

interface Batch {
    id: number;
    name: string;
    startDate: string;
    jarCount: number;
    layer: number;
    status: string;
    stage: string;
    sourceId?: string;
    type?: string;
    shakeStatus?: {
        needed: boolean;
        count: number;
        daysOld: number;
    };
    hasCloth?: boolean;
}

interface RackDetails {
    id: number;
    name: string;
    material: string;
    totalLayers: number;
    batches: Batch[];
    layers?: { layer: number, color: string }[];
}

interface LayerDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    layerNumber: number | null;
    rack: RackDetails;
    onUpdate?: () => void;
    activeFilter?: string | null;
}

import { MoveItemsDialog } from "./move-items-dialog";
import { useFacilityData } from "@/components/providers/facility-provider";

export function LayerDetailsDialog({ open, onOpenChange, layerNumber, rack, onUpdate, activeFilter }: LayerDetailsDialogProps) {
    const [selectedJar, setSelectedJar] = useState<{ id: string; batch: Batch; day: number } | null>(null);
    const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

    const [selectedJars, setSelectedJars] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState<'harvest' | 'discard' | 'cloth' | 'no-cloth' | 'move' | 'shake' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { harvestBatch, discardBatch, logBatchAction } = useProduction();
    const { updateLayerColor } = useFacility();
    const { actionMap } = useFacilityData();

    const isCement = rack.material === "Cement";
    const rows = isCement ? 6 : 5;
    const cols = isCement ? 12 : 10;
    const totalSlots = rows * cols;

    // Get batches for this layer
    const batches = rack.batches.filter(b => b.layer === layerNumber && b.status === "Active");

    const allJars: { id: string; batch: Batch; day: number; index: number; isActionMatched?: boolean }[] = [];
    batches.forEach(batch => {
        const startDate = new Date(batch.startDate);
        const today = new Date();
        const daysActive = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const layerActions = actionMap?.[rack.id]?.[layerNumber!] || {};
        const isActionable = activeFilter ? layerActions[activeFilter]?.includes(batch.id) : false;

        for (let i = 0; i < batch.jarCount; i++) {
            allJars.push({
                id: `${batch.id}-J${i + 1}`,
                batch: batch,
                day: daysActive,
                index: i,
                isActionMatched: !!isActionable
            });
        }
    });

    const handleSuccess = () => {
        if (onUpdate) onUpdate();
    };

    const toggleJarSelection = (jarId: string) => {
        if (!selectionMode) return;
        const newSet = new Set(selectedJars);
        if (newSet.has(jarId)) {
            newSet.delete(jarId);
        } else {
            newSet.add(jarId);
        }
        setSelectedJars(newSet);
    };

    const toggleBatchSelection = (batch: Batch) => {
        if (!selectionMode) return;
        const newSet = new Set(selectedJars);
        const batchJarIds = Array.from({ length: batch.jarCount }).map((_, i) => `${batch.id}-J${i + 1}`);
        const allSelected = batchJarIds.every(id => newSet.has(id));
        if (allSelected) {
            batchJarIds.forEach(id => newSet.delete(id));
        } else {
            batchJarIds.forEach(id => newSet.add(id));
        }
        setSelectedJars(newSet);
    };

    const handleApplyAction = async () => {
        if (!selectionMode || selectedJars.size === 0) return;

        if (selectionMode === 'move') {
            setIsMoveOpen(true);
            return;
        }

        setIsProcessing(true);
        try {
            // Group by Batch
            const batchIds = new Set<number>();
            selectedJars.forEach(jarId => {
                const batchId = parseInt(jarId.split('-')[0]);
                batchIds.add(batchId);
            });

            for (const batchId of Array.from(batchIds)) {
                if (selectionMode === 'harvest') {
                    await harvestBatch(batchId);
                } else if (selectionMode === 'discard') {
                    await discardBatch(batchId);
                } else if (selectionMode === 'shake') {
                    await logBatchAction(batchId, 'Shake');
                } else if (selectionMode === 'cloth') {
                    await logBatchAction(batchId, 'Put Cloth');
                } else if (selectionMode === 'no-cloth') {
                    await logBatchAction(batchId, 'Remove Cloth');
                }
            }

            setSelectionMode(null);
            setSelectedJars(new Set());
            handleSuccess();
        } catch (error) {
            console.error("Failed to process action", error);
            alert("Failed to apply action.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Calculate details for Move Dialog
    const getSelectedMoveItems = () => {
        const batchCounts = new Map<number, number>();
        const batchMap = new Map<number, Batch>();
        selectedJars.forEach(jarId => {
            const batchId = parseInt(jarId.split('-')[0]);
            batchCounts.set(batchId, (batchCounts.get(batchId) || 0) + 1);
            // find batch
            const jar = allJars.find(j => j.id === jarId);
            if (jar) batchMap.set(batchId, jar.batch);
        });

        return Array.from(batchCounts.entries()).map(([batchId, count]) => {
            const batch = batchMap.get(batchId);
            return {
                batchId,
                count,
                sourceRackId: rack.id,
                sourceLayer: layerNumber!,
                name: batch?.name || `Batch ${batchId}`
            };
        });
    };

    // Check if selected items need light (Smart Suggestion)
    const checkNeedsLight = () => {
        // Simple heuristic: If LC or BC, they usually benefit from light at later stages.
        // Or if the user IS moving them, maybe they want light?
        // Let's strictly follow: "intelligent suggestions for moving LC/BC batches from non-lighted top layers"
        // If current rack has no light (or layer light is off), and items are LC/BC => needsLight = true.
        if (selectedJars.size === 0) return false;

        // Check current light status
        const layerColor = rack.layers?.find(l => l.layer === layerNumber)?.color || "White"; // Default?
        // Actually, schema doesn't force default. 
        // If layerColor is 'Off', and items are LC/BC -> True.

        const hasLC = Array.from(selectedJars).some(id => {
            const jar = allJars.find(j => j.id === id);
            return jar?.batch.type === 'Liquid Culture' || jar?.batch.type === 'Base Culture';
        });

        return hasLC && (layerColor === 'Off' || layerColor === 'None'); // Assuming Off means no light.
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(open) => {
                if (!open) {
                    setSelectionMode(null);
                    setSelectedJars(new Set());
                }
                onOpenChange(open);
            }}>
                <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-col gap-4">
                        <div className="flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle className="flex items-center gap-2">
                                    {rack.name} - Layer {layerNumber}
                                    {(() => {
                                        const layerColor = rack.layers?.find(l => l.layer === layerNumber)?.color || "Off";
                                        const isLightOn = layerColor !== 'Off' && layerColor !== 'None';

                                        return (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className={cn(
                                                    "ml-2 h-6 text-xs gap-1 transition-all",
                                                    isLightOn ? "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200" : "text-muted-foreground"
                                                )}
                                                onClick={async () => {
                                                    const newColor = isLightOn ? "Off" : "White";
                                                    // Dynamic import to avoid cycle if possible, or just import at top
                                                    // const { updateLayerColor } = await import("@/app/facility/actions");
                                                    await updateLayerColor(rack.id, layerNumber!, newColor);
                                                    onUpdate?.();
                                                }}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", isLightOn ? "bg-yellow-500 animate-pulse" : "bg-stone-300")} />
                                                {isLightOn ? "Light ON" : "Light OFF"}
                                            </Button>
                                        );
                                    })()}
                                </DialogTitle>
                                <DialogDescription>
                                    {isCement ? "Cement Rack (72 Jars max)" : "Steel Rack (50 Jars max)"}
                                </DialogDescription>
                            </div>
                            <Button size="sm" onClick={() => setIsAddBatchOpen(true)} disabled={!!selectionMode}>
                                <Plus className="w-4 h-4 mr-1" /> Add Jars
                            </Button>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex flex-wrap gap-2 items-center bg-secondary/50 p-2 rounded-lg">
                            {!selectionMode ? (
                                <>
                                    <span className="text-sm font-medium mr-2">Actions:</span>
                                    <Button size="sm" variant="outline" onClick={() => setSelectionMode('harvest')} className="text-emerald-600 border-emerald-200 bg-emerald-50">Harvest</Button>
                                    <Button size="sm" variant="outline" onClick={() => setSelectionMode('discard')} className="text-red-600 border-red-200 bg-red-50">Discard</Button>
                                    <Button size="sm" variant="outline" onClick={() => setSelectionMode('move')} className="text-orange-600 border-orange-200 bg-orange-50">Move Cycle</Button>
                                    <Button size="sm" variant="outline" onClick={() => setSelectionMode('shake')} className="text-purple-600 border-purple-200 bg-purple-50">Shake</Button>
                                    <Button size="sm" variant="outline" onClick={() => setSelectionMode('no-cloth')}>Remove Cloth</Button>
                                </>
                            ) : (
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm uppercase text-primary">
                                            {selectionMode === 'cloth' ? "Putting Cloth" : selectionMode} Mode
                                        </span>
                                        <span className="text-xs text-muted-foreground p-1 bg-background rounded border">
                                            {selectedJars.size} Jars Selected
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => { setSelectionMode(null); setSelectedJars(new Set()); }}>Cancel</Button>
                                        <Button size="sm" onClick={handleApplyAction} disabled={selectedJars.size === 0 || isProcessing}>
                                            {isProcessing ? "Applying..." : (selectionMode === 'move' ? "Select Target..." : "Apply")}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex flex-col gap-6 py-4">
                        {/* Batch Selection List (Only in Selection Mode) */}
                        {selectionMode && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                <span className="text-sm font-medium self-center text-muted-foreground mr-2">Quick Select:</span>
                                {batches.map(batch => {
                                    const batchJarIds = Array.from({ length: batch.jarCount }).map((_, i) => `${batch.id}-J${i + 1}`);
                                    const allSelected = batchJarIds.every(id => selectedJars.has(id));
                                    const someSelected = batchJarIds.some(id => selectedJars.has(id));

                                    return (
                                        <Button
                                            key={batch.id}
                                            variant={allSelected ? "default" : (someSelected ? "secondary" : "outline")}
                                            size="sm"
                                            onClick={() => toggleBatchSelection(batch)}
                                            className="text-xs h-7"
                                        >
                                            {batch.name} ({batch.jarCount})
                                            {allSelected && <span className="ml-1">✓</span>}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Visual Grid */}
                        <div
                            className="grid gap-1 mx-auto bg-stone-100 p-2 sm:p-4 rounded-lg border-2 border-stone-300 max-w-full overflow-x-auto select-none"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                            }}
                        >
                            {Array.from({ length: totalSlots }).map((_, idx) => {
                                const jar = allJars[idx] as any;
                                const isSelected = jar && selectedJars.has(jar.id);
                                const isActionMatched = jar?.isActionMatched;

                                // Filter-specific glow
                                let glowClass = "";
                                if (isActionMatched && activeFilter) {
                                    if (activeFilter === 'red') glowClass = "ring-2 ring-offset-1 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20 scale-110 animate-pulse border-red-500";
                                    else if (activeFilter === 'purple') glowClass = "ring-2 ring-offset-1 ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] z-20 scale-110 animate-pulse border-purple-500";
                                    else if (activeFilter === 'green') glowClass = "ring-2 ring-offset-1 ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] z-20 scale-110 animate-pulse border-emerald-500";
                                    else if (activeFilter === 'yellow') glowClass = "ring-2 ring-offset-1 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] z-20 scale-110 animate-pulse border-amber-500";
                                    else if (activeFilter === 'blue') glowClass = "ring-2 ring-offset-1 ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] z-20 scale-110 animate-pulse border-blue-500";
                                }

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            if (selectionMode && jar) {
                                                toggleJarSelection(jar.id);
                                            } else if (jar) {
                                                setSelectedJar(jar);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center justify-center text-[8px] border transition-all",
                                            // Shape & Size
                                            jar?.batch.type === 'Liquid Culture' ? "w-8 h-8 rounded-md" : // LC: Rounded Square
                                                jar?.batch.type === 'Base Culture' ? "w-10 h-10 rounded-full" : // BC: Larger Circle (Petri)
                                                    "w-8 h-8 rounded-full", // Jars: Standard Circle

                                            selectionMode ? "cursor-pointer" : (jar ? "cursor-pointer hover:scale-110" : "cursor-default"),
                                            isSelected ? "ring-2 ring-offset-1 ring-primary z-10 scale-110" : "",

                                            // Color Logic
                                            jar
                                                ? jar.batch.hasCloth
                                                    ? "bg-slate-700 border-slate-900 border-2 text-slate-300 shadow-inner opacity-90"
                                                    : jar.batch.shakeStatus?.needed
                                                        ? "bg-purple-100 border-purple-500 text-purple-900 border-dashed border-2"
                                                        : (jar.batch.type === 'Liquid Culture'
                                                            ? "bg-cyan-100 border-cyan-500 text-cyan-900"
                                                            : jar.batch.type === 'Base Culture'
                                                                ? "bg-rose-100 border-rose-400 text-rose-900 shadow-sm"
                                                                : (jar.batch.stage === 'Incubation' ? "bg-amber-100 border-amber-600 text-amber-900"
                                                                    : jar.batch.stage === 'Fruiting' ? "bg-purple-100 border-purple-600 text-purple-900"
                                                                        : "bg-green-100 border-green-600 text-green-900"))
                                                : "bg-white border-stone-200 text-transparent",
                                            jar && !isSelected && selectionMode ? "opacity-70 hover:opacity-100" : "",
                                            glowClass,
                                            jar && activeFilter && !isActionMatched && "opacity-30 grayscale hover:opacity-100 transition-opacity"
                                        )}
                                        title={jar ? `ID: ${jar.id}\nType: ${jar.batch.type || 'Jar'}\nBatch: ${jar.batch.name}\nStage: ${jar.batch.stage}` : "Empty Slot"}
                                    >
                                        {jar ? (
                                            <span className="font-bold text-[10px] leading-none">
                                                {jar.batch.id}
                                            </span>
                                        ) : "•"}
                                        {/* Needs Action Indicator (Catch-all) */}
                                        {jar && (jar.batch.shakeStatus?.needed) && (
                                            <div className="absolute inset-0 rounded-full border-2 border-purple-500/50 animate-pulse z-20 pointer-events-none" />
                                        )}

                                        {/* Shake Icon specifically */}
                                        {jar && jar.batch.shakeStatus?.needed && !isSelected && (
                                            <div className="absolute -top-1 -right-1 z-30">
                                                <span className="relative flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500 border-2 border-white"></span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Jar Details Footer */}
                        {!selectionMode && (
                            <div className="min-h-[100px] bg-slate-50 dark:bg-slate-900 p-4 rounded-md border text-sm">
                                {selectedJar ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-primary">Selected Jar Details</p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingBatch(selectedJar.batch)}
                                            >
                                                Edit Batch
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="bg-background p-2 rounded border">
                                                <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">Jar ID</span>
                                                <span className="font-semibold text-foreground text-sm">{selectedJar.id}</span>
                                            </div>
                                            <div className="bg-background p-2 rounded border col-span-2">
                                                <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">Batch</span>
                                                <span className="font-semibold text-foreground text-sm truncate block" title={selectedJar.batch.name}>{selectedJar.batch.name}</span>
                                            </div>
                                            <div className="bg-background p-2 rounded border">
                                                <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">Type</span>
                                                <span className="font-semibold text-foreground text-sm">{selectedJar.batch.type}</span>
                                            </div>
                                            <div className="bg-background p-2 rounded border">
                                                <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">Source</span>
                                                <span className="font-semibold text-foreground text-sm truncate block">{selectedJar.batch.sourceId || "N/A"}</span>
                                            </div>
                                            <div className="bg-background p-2 rounded border">
                                                <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">Stage</span>
                                                <span className="font-medium text-foreground text-sm px-2 py-0.5 bg-secondary rounded-full inline-block mt-0.5">{selectedJar.batch.stage}</span>
                                            </div>
                                            <div className="bg-background p-2 rounded border">
                                                <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">Start Date</span>
                                                <span className="font-semibold text-foreground text-sm">{format(new Date(selectedJar.batch.startDate), 'MMM dd, yyyy')}</span>
                                            </div>
                                            <div className="bg-background p-2 rounded border">
                                                <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">Day Number</span>
                                                <span className="font-bold text-blue-600 text-sm">Day {selectedJar.day}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t">
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                onClick={async () => {
                                                    if (confirm("Harvest this batch?")) {
                                                        await harvestBatch(selectedJar.batch.id);
                                                        onUpdate?.();
                                                        setSelectedJar(null);
                                                    }
                                                }}
                                            >
                                                Harvest Batch
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={async () => {
                                                    if (confirm("Discard this batch?")) {
                                                        await discardBatch(selectedJar.batch.id);
                                                        onUpdate?.();
                                                        setSelectedJar(null);
                                                    }
                                                }}
                                            >
                                                Discard Batch
                                            </Button>

                                            {/* Shake Action */}
                                            {selectedJar.batch.shakeStatus && (selectedJar.batch.shakeStatus.daysOld >= 1 && selectedJar.batch.shakeStatus.daysOld <= 5) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={cn(
                                                        "border-purple-200 text-purple-700 hover:bg-purple-50",
                                                        selectedJar.batch.shakeStatus.needed ? "animate-pulse border-purple-400 font-bold" : "opacity-50"
                                                    )}
                                                    disabled={!selectedJar.batch.shakeStatus.needed && selectedJar.batch.shakeStatus.count >= 2}
                                                    onClick={async () => {
                                                        await logBatchAction(selectedJar.batch.id, "Shake");
                                                        onUpdate?.();
                                                    }}
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                    Shake ({selectedJar.batch.shakeStatus.count}/2)
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center italic mt-4">
                                        Click a jar to view details or select an action to process multiple jars.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Nested Dialogs */}
            {isAddBatchOpen && (
                <AddBatchDialog
                    open={isAddBatchOpen}
                    onOpenChange={setIsAddBatchOpen}
                    rackId={rack.id}
                    layer={layerNumber!}
                    onSuccess={handleSuccess}
                />
            )}

            {editingBatch && (
                <EditBatchDialog
                    open={!!editingBatch}
                    onOpenChange={(open) => !open && setEditingBatch(null)}
                    batch={editingBatch}
                    onSuccess={handleSuccess}
                />
            )}

            {isMoveOpen && (
                <MoveItemsDialog
                    open={isMoveOpen}
                    onOpenChange={(open) => {
                        setIsMoveOpen(open);
                        if (!open) {
                            setSelectionMode(null);
                            setSelectedJars(new Set());
                        }
                    }}
                    selectedItems={getSelectedMoveItems()}
                    onSuccess={handleSuccess}
                    needsLight={checkNeedsLight()}
                />
            )}
        </>
    );
}
