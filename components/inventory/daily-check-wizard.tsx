"use client";

import { useState } from "react";
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
import { useInventory } from "@/hooks/use-inventory";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Material {
    id: number;
    name: string;
    quantity: number;
    unit: string;
}

interface DailyCheckProps {
    materials: Material[];
    isCheckDoneToday: boolean;
}

export function DailyCheckWizard({ materials, isCheckDoneToday }: DailyCheckProps) {
    const [open, setOpen] = useState(false);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const { performDailyCheck } = useInventory();

    // Initialize quantities from current stock
    const startCheck = () => {
        const initial: Record<number, number> = {};
        materials.forEach(m => {
            initial[m.id] = m.quantity;
        });
        setQuantities(initial);
    };

    const handleQuantityChange = (id: number, value: string) => {
        setQuantities(prev => ({
            ...prev,
            [id]: Number(value)
        }));
    };

    async function handleSubmit() {
        const formData = new FormData();
        Object.entries(quantities).forEach(([id, qty]) => {
            formData.append(`qty_${id}`, qty.toString());
        });

        await performDailyCheck(formData);
        console.log("Check submitted");
        setOpen(false);
    }

    if (isCheckDoneToday) {
        return (
            <div className="flex items-center text-green-600 gap-2 bg-green-50 px-4 py-2 rounded-md border border-green-200">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Daily Check Complete</span>
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" onClick={startCheck} className="animate-pulse">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Perform Daily Check
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Daily Inventory Check</DialogTitle>
                    <DialogDescription>
                        Verify and update quantities for all raw materials.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="grid gap-4 py-4">
                        {materials.map((item) => (
                            <div key={item.id} className="grid grid-cols-4 items-center gap-4 border-b pb-2 last:border-0">
                                <Label htmlFor={`qty-${item.id}`} className="col-span-2 font-medium">
                                    {item.name}
                                </Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Input
                                        id={`qty-${item.id}`}
                                        type="number"
                                        value={quantities[item.id] ?? item.quantity}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        className="w-24 text-right"
                                    />
                                    <span className="text-muted-foreground text-sm w-12">{item.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Confirm & Submit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
