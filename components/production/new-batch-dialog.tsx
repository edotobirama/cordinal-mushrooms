"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useProduction } from "@/hooks/use-production";
import { useInventory } from "@/hooks/use-inventory";
import { format } from "date-fns";

interface Rack {
    id: number;
    name: string;
    capacity: number;
    currentUsage: number;
    totalLayers?: number;
    layerUsages?: Record<number, number>;
}

export function NewBatchDialog({ racks, onSuccess }: { racks: Rack[], onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const { startBatch } = useProduction();
    const { getInventoryItemsByType } = useInventory();

    const [selectedType, setSelectedType] = useState("Liquid Culture");
    const [selectedSourceId, setSelectedSourceId] = useState("");
    const [inventorySources, setInventorySources] = useState<{ id: number; name: string; quantity: number; unit: string }[]>([]);

    useEffect(() => {
        // Determine required source type
        // LC -> Base Culture
        // Spawn/Jar -> Liquid Culture
        let requiredType = "";
        if (selectedType === "Liquid Culture") requiredType = "Base Culture";
        else if (selectedType === "Jars") requiredType = "Liquid-Culture"; // Match DB enum
        // If Base Culture itself, source might be spore print or cloning (New Source)

        if (requiredType) {
            getInventoryItemsByType(requiredType).then(items => {
                setInventorySources(items as any);
            });
        } else {
            setInventorySources([]);
        }
    }, [selectedType, getInventoryItemsByType]);



    const [locations, setLocations] = useState<{ rackId: number; layer: number; quantity: number }[]>([
        { rackId: racks[0]?.id || 0, layer: 1, quantity: 0 }
    ]);

    const addLocation = () => {
        setLocations([...locations, { rackId: racks[0]?.id || 0, layer: 1, quantity: 0 }]);
    };

    const removeLocation = (index: number) => {
        setLocations(locations.filter((_, i) => i !== index));
    };

    const updateLocation = (index: number, field: keyof typeof locations[0], value: number) => {
        const newLocations = [...locations];
        newLocations[index] = { ...newLocations[index], [field]: value };
        setLocations(newLocations);
    };

    const totalQuantity = locations.reduce((acc, loc) => acc + loc.quantity, 0);

    // Calculate max layers for selected rack
    const getRackCapacity = (rackId: number) => {
        const rack = racks.find(r => r.id === rackId);
        return rack ? { layers: rack.totalLayers || 7, name: rack.name, available: rack.capacity - rack.currentUsage } : { layers: 7, name: "Unknown", available: 0 };
    };

    const today = format(new Date(), "yyyy-MM-dd");

    async function handleSubmit(formData: FormData) {
        // Enforce Layer Capacity
        const layerTotals: Record<string, number> = {};
        for (const loc of locations) {
            const key = `${loc.rackId}-${loc.layer}`;
            layerTotals[key] = (layerTotals[key] || 0) + loc.quantity;
        }

        for (const [key, reqQty] of Object.entries(layerTotals)) {
            const [rackIdStr, layerStr] = key.split('-');
            const rack = racks.find(r => r.id === Number(rackIdStr));
            if (rack) {
                // Each layer can hold up to the full rack capacity.
                // Check that this layer's usage (existing + requested) doesn't exceed it.
                const layerCapacity = rack.capacity;
                const currentLayerUsage = rack.layerUsages?.[Number(layerStr)] || 0;

                if (reqQty + currentLayerUsage > layerCapacity) {
                    alert(`Not enough capacity on ${rack.name} Layer ${layerStr}.\nIt can hold ${layerCapacity} items total, and ${currentLayerUsage} are already used.\nYou requested ${reqQty}, but only ${layerCapacity - currentLayerUsage} slots are available.`);
                    return;
                }
            }
        }

        // Also verify overall rack capacity isn't exceeded
        const rackTotals: Record<string, number> = {};
        for (const loc of locations) {
            rackTotals[loc.rackId] = (rackTotals[loc.rackId] || 0) + loc.quantity;
        }
        for (const [rackIdStr, reqQty] of Object.entries(rackTotals)) {
            const rack = racks.find(r => r.id === Number(rackIdStr));
            if (rack) {
                const available = rack.capacity - rack.currentUsage;
                if (reqQty > available) {
                    alert(`Not enough overall capacity on ${rack.name}.\nTotal capacity: ${rack.capacity}, already used: ${rack.currentUsage}.\nYou requested ${reqQty}, but only ${available} slots are available.`);
                    return;
                }
            }
        }

        // Append locations to formData
        formData.append("locations", JSON.stringify(locations));
        // Append calculated total quantity as jarCount (for backward compat and total)
        formData.set("jarCount", totalQuantity.toString());
        // Use first location as primary (backward compat)
        if (locations.length > 0) {
            formData.set("rackId", locations[0].rackId.toString());
            formData.set("layer", locations[0].layer.toString());
        }

        // Manual append for Select components
        formData.set("type", selectedType);
        formData.set("sourceId", selectedSourceId);

        try {
            await startBatch(formData);
            setOpen(false);
            if (onSuccess) onSuccess();
            else window.location.reload();
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Failed to start batch");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Start Batch
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Start New Batch</DialogTitle>
                    <DialogDescription>
                        Initiate a new production cycle across multiple rack locations.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-6">
                    {/* Batch Details Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <h3 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">1</span>
                            Batch Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Batch ID</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={`Batch-${today}`}
                                    required
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    defaultValue={today}
                                    required
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select name="type" defaultValue="Liquid Culture" onValueChange={setSelectedType} required>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Liquid Culture">Liquid Culture</SelectItem>
                                        <SelectItem value="Base Culture">Base Culture (Agar)</SelectItem>
                                        <SelectItem value="Jars">Jars</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sourceId">Source</Label>
                                <Select name="sourceId" required onValueChange={setSelectedSourceId}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select Source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="New Source">New / External Source</SelectItem>
                                        {inventorySources.map(item => (
                                            <SelectItem key={item.id} value={item.name}>
                                                {item.name} ({item.quantity} {item.unit})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="motherCultureSource">Mother Culture Source</Label>
                                <Input
                                    id="motherCultureSource"
                                    name="motherCultureSource"
                                    placeholder="e.g. Purchased Strain, Clone, etc."
                                    defaultValue="New"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Input
                                    id="notes"
                                    name="notes"
                                    placeholder="Optional observations or specific notes for this batch"
                                    className="bg-background"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Manager Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">2</span>
                                Locations & Quantities
                            </h3>
                            <Button type="button" variant="outline" size="sm" onClick={addLocation}>Add Location</Button>
                        </div>

                        <div className="space-y-3">
                            {locations.map((loc, index) => {
                                const rackInfo = getRackCapacity(loc.rackId);
                                return (
                                    <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 rounded-md border bg-background shadow-sm relative">
                                        <div className="col-span-5">
                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Rack</Label>
                                            <Select
                                                value={loc.rackId.toString()}
                                                onValueChange={(val) => updateLocation(index, 'rackId', Number(val))}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
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
                                        <div className="col-span-3">
                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Layer</Label>
                                            <Select
                                                value={loc.layer.toString()}
                                                onValueChange={(val) => updateLocation(index, 'layer', Number(val))}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 7 }, (_, i) => i + 1).map(l => (
                                                        <SelectItem key={l} value={l.toString()}>Level {l}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-3">
                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Quantity</Label>
                                            <Input
                                                type="number"
                                                value={loc.quantity}
                                                onChange={(e) => updateLocation(index, 'quantity', Number(e.target.value))}
                                                className="h-9"
                                                min={0}
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            {locations.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => removeLocation(index)}
                                                    title="Remove Location"
                                                >
                                                    <Plus className="h-4 w-4 rotate-45" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex justify-end pt-2">
                            <div className="bg-primary/5 px-4 py-2 rounded-lg flex items-center gap-2 border border-primary/10">
                                <span className="text-sm text-muted-foreground">Total Batch Size:</span>
                                <span className="text-lg font-bold text-primary">{totalQuantity} Jars</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit">Create Batch</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
