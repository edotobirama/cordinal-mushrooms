"use client";

import { Button } from "@/components/ui/button";
import { PackagePlus, Trash2 } from "lucide-react";
import { useInventory } from "@/hooks/use-inventory";
import { useState } from "react";
import { DeleteItemDialog } from "./delete-item-dialog";

interface InventoryActionsProps {
    itemId: number;
    itemName: string;
    itemType?: string;
    onSuccess?: () => void;
}

export function InventoryActions({ itemId, itemName, itemType, onSuccess }: InventoryActionsProps) {
    const [open, setOpen] = useState(false);
    const { deleteInventoryItem, convertToDried } = useInventory();

    const handleConvertToDried = async () => {
        await convertToDried(itemId);
        if (onSuccess) onSuccess();
        else window.location.reload();
    };

    return (
        <>
            <div className="flex gap-2">
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
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setOpen(true)}
                    title="Discard Item"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <DeleteItemDialog
                open={open}
                onOpenChange={setOpen}
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
