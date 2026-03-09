
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useFacility } from "@/hooks/use-facility";
import { Loader2 } from "lucide-react";

interface MoveItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedItems: { batchId: number; count: number; sourceRackId: number; sourceLayer: number; name: string }[];
    onSuccess: () => void;
    // Suggestion props
    suggestedRackId?: number;
    suggestedLayer?: number;
    needsLight?: boolean;
}

export function MoveItemsDialog({ open, onOpenChange, selectedItems, onSuccess, suggestedRackId, suggestedLayer }: MoveItemsDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [racks, setRacks] = useState<{ id: number; name: string; totalLayers: number; capacity: number; currentUsage: number }[]>([]);
    const [targetRackId, setTargetRackId] = useState<string>(suggestedRackId?.toString() || "");
    const [targetLayer, setTargetLayer] = useState<string>(suggestedLayer?.toString() || "");
    const { moveBatchItems, getAllRacks } = useFacility();

    useEffect(() => {
        if (open) {
            getAllRacks().then((data) => setRacks(data as any));
        }
    }, [open, getAllRacks]);

    // Pre-select suggestion if available and racks loaded
    useEffect(() => {
        if (suggestedRackId && racks.some(r => r.id === suggestedRackId)) {
            setTargetRackId(suggestedRackId.toString());
        }
        if (suggestedLayer) {
            setTargetLayer(suggestedLayer.toString());
        }
    }, [suggestedRackId, suggestedLayer, racks]);

    const handleMove = async () => {
        if (!targetRackId || !targetLayer) return;
        setIsLoading(true);
        try {
            // Validate layer
            const rack = racks.find(r => r.id.toString() === targetRackId);
            if (!rack) {
                setIsLoading(false);
                alert("Target rack not found.");
                return;
            }

            // Calculate total items being moved
            const totalMovingCount = selectedItems.reduce((acc, item) => acc + item.count, 0);

            // Calculate items that are *new* to the target rack (i.e., not already in this rack)
            const itemsMovingIntoNewRack = selectedItems.filter(item => item.sourceRackId !== Number(targetRackId)).reduce((sum, item) => sum + item.count, 0);

            // Calculate items that are moving within the same rack but to a different layer
            const itemsMovingWithinSameRackDifferentLayer = selectedItems.filter(item =>
                item.sourceRackId === Number(targetRackId) && item.sourceLayer !== Number(targetLayer)
            ).reduce((sum, item) => sum + item.count, 0);

            // The effective additional count for the target rack's total capacity is items moving into it from other racks.
            // Items moving within the same rack don't change the *total* rack usage, only layer usage.
            const effectiveAdditionalCountForRackCapacity = itemsMovingIntoNewRack;

            const rackRemainingCapacity = rack.capacity - rack.currentUsage;

            if (effectiveAdditionalCountForRackCapacity > rackRemainingCapacity) {
                setIsLoading(false);
                alert(`Not enough global capacity on ${rack.name}.\nYou are trying to move ${effectiveAdditionalCountForRackCapacity} new jars into this rack, but it only has ${rackRemainingCapacity} open slots remaining overall.`);
                return;
            }

            const itemsToMove = selectedItems.map(item => ({
                batchId: item.batchId,
                count: item.count,
                sourceRackId: item.sourceRackId,
                sourceLayer: item.sourceLayer
            }));

            await moveBatchItems(itemsToMove, Number(targetRackId), Number(targetLayer));
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Failed to move items");
        } finally {
            setIsLoading(false);
        }
    };

    const selectedRack = racks.find(r => r.id.toString() === targetRackId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move Items</DialogTitle>
                    <DialogDescription>
                        Select a target rack and layer to move the selected items.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">
                        Moving <strong>{selectedItems.reduce((acc, i) => acc + i.count, 0)}</strong> items from {selectedItems.length} batches.
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label>Target Rack</Label>
                            <Select value={targetRackId} onValueChange={setTargetRackId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Rack" />
                                </SelectTrigger>
                                <SelectContent>
                                    {racks.map(rack => (
                                        <SelectItem key={rack.id} value={rack.id.toString()}>
                                            {rack.name} ({rack.capacity - rack.currentUsage} Avl)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Layer</Label>
                            <Select value={targetLayer} onValueChange={setTargetLayer} disabled={!targetRackId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Layer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedRack ? Array.from({ length: selectedRack.totalLayers || 7 }).map((_, i) => {
                                        const layerNum = i + 1;
                                        const usage = (selectedRack as any).layerUsages?.[layerNum] || 0;

                                        const info = (selectedRack as any).layerInfo?.[layerNum];
                                        let lightStatus = "Off";
                                        if (info) {
                                            if (info.light1 && info.light2) lightStatus = "1 & 2 On";
                                            else if (info.light1) lightStatus = "1 On";
                                            else if (info.light2) lightStatus = "2 On";
                                        }

                                        return (
                                            <SelectItem key={layerNum} value={layerNum.toString()}>
                                                Layer {layerNum} ({usage} Used, L: {lightStatus})
                                            </SelectItem>
                                        );
                                    }) : null}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleMove} disabled={!targetRackId || !targetLayer || isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm Move
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
