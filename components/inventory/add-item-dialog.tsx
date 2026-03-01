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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useInventory } from "@/hooks/use-inventory";

export function AddItemDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const { addToInventory } = useInventory();

    async function handleSubmit(formData: FormData) {
        await addToInventory(formData);
        setOpen(false);
        if (onSuccess) onSuccess();
        else window.location.reload();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Inventory Item</DialogTitle>
                    <DialogDescription>
                        Manually add items like Purchase Cultures, Spores, or Supplies.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                className="col-span-3"
                                placeholder="e.g. Master Aura A"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">
                                Type
                            </Label>
                            <Select name="type" required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Liquid-Culture">Liquid Culture</SelectItem>
                                    <SelectItem value="Base Culture">Base Culture (Agar)</SelectItem>
                                    <SelectItem value="Dried-Sealed">Dried / Sealed</SelectItem>
                                    <SelectItem value="Dried-Capsule">Capsules</SelectItem>
                                    <SelectItem value="Spawn">Spawn (Grain)</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quantity" className="text-right">
                                Quantity
                            </Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit" className="text-right">
                                Unit
                            </Label>
                            <Input
                                id="unit"
                                name="unit"
                                className="col-span-3"
                                placeholder="eg. jars, bags, grams"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notes" className="text-right">
                                Notes
                            </Label>
                            <Input
                                id="notes"
                                name="notes"
                                className="col-span-3"
                                placeholder="Optional details"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Add to Inventory</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
