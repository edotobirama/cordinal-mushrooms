"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useProduction } from "@/hooks/use-production";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Batch {
    id: number;
    name: string;
    startDate: string;
    jarCount: number;
    layer: number;
    status: string;
    sourceId?: string;
}

interface EditBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batch: Batch;
    onSuccess?: () => void;
}

export function EditBatchDialog({ open, onOpenChange, batch, onSuccess }: EditBatchDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { updateBatch, deleteBatch, harvestBatch, discardBatch } = useProduction();

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        formData.append("id", batch.id.toString());

        try {
            await updateBatch(formData);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Batch: {batch.name}</DialogTitle>
                    <DialogDescription>
                        Update batch details or change its status.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" defaultValue={batch.name} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sourceId" className="text-right">Source</Label>
                        <Input id="sourceId" name="sourceId" defaultValue={batch.sourceId || ""} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="jarCount" className="text-right">Qty</Label>
                        <Input id="jarCount" name="jarCount" type="number" defaultValue={batch.jarCount} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startDate" className="text-right">Start</Label>
                        <Input id="startDate" name="startDate" type="date" defaultValue={batch.startDate.split('T')[0]} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                        <Select name="status" defaultValue={batch.status}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Contaminated">Contaminated</SelectItem>
                                <SelectItem value="Harvested">Harvested</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Danger Zone</span>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isLoading}
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete this batch?")) {
                                    setIsLoading(true);
                                    await deleteBatch(batch.id);
                                    onOpenChange(false);
                                    if (onSuccess) onSuccess();
                                    setIsLoading(false);
                                }
                            }}
                        >
                            Delete Batch
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                            disabled={isLoading || batch.status === 'Harvested'}
                            onClick={async () => {
                                if (confirm("Mark this batch as Harvested?")) {
                                    setIsLoading(true);
                                    await harvestBatch(batch.id);
                                    onOpenChange(false);
                                    if (onSuccess) onSuccess();
                                    setIsLoading(false);
                                }
                            }}
                        >
                            Harvest
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                            disabled={isLoading || batch.status === 'Contaminated'}
                            onClick={async () => {
                                if (confirm("Mark this batch as Discarded (Contaminated)?")) {
                                    setIsLoading(true);
                                    await discardBatch(batch.id);
                                    onOpenChange(false);
                                    if (onSuccess) onSuccess();
                                    setIsLoading(false);
                                }
                            }}
                        >
                            Discard
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
