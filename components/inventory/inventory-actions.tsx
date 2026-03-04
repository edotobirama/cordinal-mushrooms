"use client";

import { Button } from "@/components/ui/button";
import { PackagePlus, Trash2, Pencil, Biohazard } from "lucide-react";
import { useInventory } from "@/hooks/use-inventory";
import { useState } from "react";
import { DeleteItemDialog } from "./delete-item-dialog";
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

interface InventoryActionsProps {
    itemId: number;
    itemName: string;
    itemType?: string;
    currentQuantity?: number;
    onSuccess?: () => void;
}

export function InventoryActions({ itemId, itemName, itemType, currentQuantity, onSuccess }: InventoryActionsProps) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [qty, setQty] = useState<number>(currentQuantity ?? 0);
    const [saving, setSaving] = useState(false);

    const { deleteInventoryItem, convertToDried, updateInventoryItem, discardInventoryItem } = useInventory();

    const handleConvertToDried = async () => {
        await convertToDried(itemId);
        if (onSuccess) onSuccess();
        else window.location.reload();
    };

    const handleEdit = async () => {
        setSaving(true);
        try {
            await updateInventoryItem({ id: itemId, quantity: qty, notes: "" });
            setEditOpen(false);
            if (onSuccess) onSuccess();
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = async () => {
        await discardInventoryItem(itemId);
        setDiscardOpen(false);
        if (onSuccess) onSuccess();
        else window.location.reload();
    };

    return (
        <>
            <div className="flex gap-1">
                {/* Edit button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => { setQty(currentQuantity ?? 0); setEditOpen(true); }}
                    title="Edit Quantity"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </Button>

                {/* Convert to Dried (Jars only) */}
                {itemType === "Jars" && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-600/10 dark:text-emerald-500"
                        onClick={handleConvertToDried}
                        title="Harvest & Convert to Dried"
                    >
                        <PackagePlus className="h-4 w-4" />
                    </Button>
                )}

                {/* Discard to Waste */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-orange-500 hover:bg-orange-500/10"
                    onClick={() => setDiscardOpen(true)}
                    title="Discard to Waste"
                >
                    <Biohazard className="h-4 w-4" />
                </Button>

                {/* Permanently Delete */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                    title="Permanently Delete"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Edit dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[320px]">
                    <DialogHeader>
                        <DialogTitle>Edit Quantity</DialogTitle>
                        <DialogDescription>Update the quantity for <strong>{itemName}</strong></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="edit-qty">Quantity</Label>
                        <Input
                            id="edit-qty"
                            type="number"
                            min={0}
                            value={qty}
                            onChange={(e) => setQty(Number(e.target.value))}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEdit} disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Discard to Waste confirmation dialog */}
            <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <DialogContent className="sm:max-w-[360px]">
                    <DialogHeader>
                        <DialogTitle>Discard to Waste?</DialogTitle>
                        <DialogDescription>
                            This will move <strong>{itemName}</strong> to the Inventory Waste section.
                            It will no longer appear in your usable inventory.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscardOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDiscard}>
                            Discard to Waste
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permanently delete dialog */}
            <DeleteItemDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                itemName={itemName}
                onConfirm={async () => {
                    await deleteInventoryItem(itemId);
                    if (onSuccess) onSuccess();
                    else window.location.reload();
                }}
            />
        </>
    );
}
