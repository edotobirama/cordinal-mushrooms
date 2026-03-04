import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useProduction } from "@/hooks/use-production";
import { useInventory } from "@/hooks/use-inventory";
import { Loader2, Beaker, Calendar, Hash, Archive, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, subDays, differenceInCalendarDays, parseISO } from "date-fns";

interface AddBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rackId: number;
    layer: number;
    onSuccess?: () => void;
}

export function AddBatchDialog({ open, onOpenChange, rackId, layer, onSuccess }: AddBatchDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedType, setSelectedType] = useState("Liquid Culture");
    const [selectedSourceId, setSelectedSourceId] = useState("");
    const [inventorySources, setInventorySources] = useState<{ id: number; name: string; quantity: number; unit: string }[]>([]);

    // Date & Day Logic
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [dayNumber, setDayNumber] = useState(0);

    const { startBatch } = useProduction();
    const { getInventoryItemsByType } = useInventory();

    // Sync Day -> Date
    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const day = Number(e.target.value);
        setDayNumber(day);
        const newDate = subDays(new Date(), day);
        setStartDate(format(newDate, 'yyyy-MM-dd'));
    };

    // Sync Date -> Day
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateStr = e.target.value;
        setStartDate(dateStr);
        if (dateStr) {
            const days = differenceInCalendarDays(new Date(), parseISO(dateStr));
            setDayNumber(days);
        }
    };

    useEffect(() => {
        let requiredType = "";
        if (selectedType === "Liquid Culture") requiredType = "Base Culture"; // LC needs Agar
        else if (selectedType === "Jars") requiredType = "Liquid-Culture"; // Jars need LC

        if (requiredType) {
            getInventoryItemsByType(requiredType).then(items => {
                setInventorySources(items as any || []);
            });
        } else {
            setInventorySources([]);
        }
    }, [selectedType, getInventoryItemsByType]);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        formData.append("rackId", rackId.toString());
        formData.append("layer", layer.toString());

        // Manual append because controlled inputs
        formData.set("type", selectedType);
        formData.set("sourceId", selectedSourceId);
        formData.set("startDate", startDate);

        try {
            await startBatch(formData);
            // Aesthetics: Minimal alert or toast (User prefers aesthetic, standard alert is okay for now, eventually toast)
            // alert("Batch created successfully!"); 
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Failed to start batch");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-white dark:bg-slate-900 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl text-primary">
                        <Beaker className="w-5 h-5" />
                        New Batch Setup
                    </DialogTitle>
                    <DialogDescription>
                        Adding new cultures to <strong>Rack {rackId} - Layer {layer}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Type Selection */}
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <Label className="flex items-center gap-2 text-primary font-semibold">
                                    <Info className="w-4 h-4" /> Batch Type
                                </Label>
                                <Select value={selectedType} onValueChange={setSelectedType} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Liquid Culture">Liquid Culture (LC)</SelectItem>
                                        <SelectItem value="Base Culture">Base Culture (Agar)</SelectItem>
                                        <SelectItem value="Jars">Jars</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        {/* Source Selection */}
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <Label className="flex items-center gap-2 text-primary font-semibold">
                                    <Archive className="w-4 h-4" /> Source
                                </Label>
                                <Select value={selectedSourceId} onValueChange={setSelectedSourceId} required>
                                    <SelectTrigger>
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
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-slate-100/50 dark:bg-slate-900/50 border-dashed">
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Quantity */}
                            <div className="space-y-2">
                                <Label htmlFor="jarCount" className="flex items-center gap-2">
                                    <Hash className="w-4 h-4" /> Quantity
                                </Label>
                                <Input id="jarCount" name="jarCount" type="number" min="1" required placeholder="Ex: 10" className="bg-background" />
                            </div>

                            {/* Day Number */}
                            <div className="space-y-2">
                                <Label htmlFor="dayNumber" className="flex items-center gap-2 text-blue-600">
                                    <Calendar className="w-4 h-4" /> Day Number
                                </Label>
                                <Input
                                    id="dayNumber"
                                    type="number"
                                    min="0"
                                    value={dayNumber}
                                    onChange={handleDayChange}
                                    className="bg-background border-blue-200 focus-visible:ring-blue-500"
                                />
                                <p className="text-[10px] text-muted-foreground">Days since start</p>
                            </div>

                            {/* Start Date */}
                            <div className="space-y-2">
                                <Label htmlFor="startDate" className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Start Date
                                </Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={handleDateChange}
                                    className="bg-background"
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Batch
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
