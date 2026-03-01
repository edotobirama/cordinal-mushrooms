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
import { useFacility } from "@/hooks/use-facility";
import { useFacilityData } from "@/components/providers/facility-provider";

export function AddRackDialog() {
    const [open, setOpen] = useState(false);
    const { addRack } = useFacility();
    const { refresh } = useFacilityData();

    async function handleSubmit(formData: FormData) {
        await addRack(formData);
        setOpen(false);
        await refresh();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Rack
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Rack</DialogTitle>
                    <DialogDescription>
                        Define a new rack and its lighting configuration.
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
                                placeholder="e.g. Rack A"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="capacity" className="text-right">
                                Capacity
                            </Label>
                            <Input
                                id="capacity"
                                name="capacity"
                                type="number"
                                className="col-span-3"
                                placeholder="Max Jars"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lightType" className="text-right">
                                Light Type
                            </Label>
                            <Select name="lightType" defaultValue="White">
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Color" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="White">White</SelectItem>
                                    <SelectItem value="Blue">Blue</SelectItem>
                                    <SelectItem value="Pink">Pink</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="material" className="text-right">
                                Material
                            </Label>
                            <select
                                id="material"
                                name="material"
                                className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="Steel">Steel</option>
                                <option value="Cement">Cement</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="totalLayers" className="text-right">
                                Layers
                            </Label>
                            <Input
                                id="totalLayers"
                                name="totalLayers"
                                type="number"
                                className="col-span-3"
                                defaultValue={7}
                                min={1}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="width" className="text-right">
                                Width
                            </Label>
                            <Input
                                id="width"
                                name="width"
                                type="number"
                                className="col-span-3"
                                defaultValue={2}
                                min={0.1}
                                step={0.1}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="height" className="text-right">
                                Length
                            </Label>
                            <Input
                                id="height"
                                name="height"
                                type="number"
                                className="col-span-3"
                                defaultValue={1}
                                min={0.1}
                                step={0.1}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Rack</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
