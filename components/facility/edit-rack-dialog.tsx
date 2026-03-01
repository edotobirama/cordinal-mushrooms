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
import { useFacility } from "@/hooks/use-facility";
import { useFacilityData } from "@/components/providers/facility-provider";

interface EditRackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rack: {
        id: number;
        name: string;
        capacity: number;
        lightType: string;
        currentUsage: number;
        status: string;
        width: number;
        height: number;
        material: string;
        totalLayers: number;
    };
}

export function EditRackDialog({ open, onOpenChange, rack }: EditRackDialogProps) {
    const { updateRack } = useFacility();
    const { refresh } = useFacilityData();

    async function handleSubmit(formData: FormData) {
        await updateRack(formData);
        onOpenChange(false);
        await refresh();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Rack</DialogTitle>
                    <DialogDescription>
                        Update details for {rack.name}.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit}>
                    <input type="hidden" name="id" value={rack.id} />
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="edit-name"
                                name="name"
                                className="col-span-3"
                                defaultValue={rack.name}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-capacity" className="text-right">
                                Capacity
                            </Label>
                            <Input
                                id="edit-capacity"
                                name="capacity"
                                type="number"
                                className="col-span-3"
                                defaultValue={rack.capacity}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-lightType" className="text-right">
                                Light Type
                            </Label>
                            <Select name="lightType" defaultValue={rack.lightType}>
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
                            <Label htmlFor="edit-material" className="text-right">
                                Material
                            </Label>
                            <select
                                id="edit-material"
                                name="material"
                                defaultValue={rack.material}
                                className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="Steel">Steel</option>
                                <option value="Cement">Cement</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-layers" className="text-right">
                                Layers
                            </Label>
                            <Input
                                id="edit-layers"
                                name="totalLayers"
                                type="number"
                                className="col-span-3"
                                defaultValue={rack.totalLayers}
                                min={1}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-width" className="text-right">
                                Width
                            </Label>
                            <Input
                                id="edit-width"
                                name="width"
                                type="number"
                                className="col-span-3"
                                defaultValue={rack.width}
                                min={0.1}
                                step={0.1}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-height" className="text-right">
                                Length
                            </Label>
                            <Input
                                id="edit-height"
                                name="height"
                                type="number"
                                className="col-span-3"
                                defaultValue={rack.height}
                                min={0.1}
                                step={0.1}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-status" className="text-right">
                                Status
                            </Label>
                            <Select name="status" defaultValue={rack.status}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
