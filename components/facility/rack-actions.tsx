"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Copy } from "lucide-react";
import { EditRackDialog } from "@/components/facility/edit-rack-dialog";
import { useFacility } from "@/hooks/use-facility";
import { useFacilityData } from "@/components/providers/facility-provider";
import { useState } from "react";

export function RackActions({ rack }: { rack: any }) {
    const [editOpen, setEditOpen] = useState(false);
    const { deleteRack, duplicateRack } = useFacility();
    const { refresh } = useFacilityData();

    async function handleDelete() {
        if (confirm("Are you sure you want to delete this rack?")) {
            await deleteRack(rack.id);
            await refresh(false);
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                        await duplicateRack(rack.id);
                        await refresh(false);
                    }}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditRackDialog open={editOpen} onOpenChange={setEditOpen} rack={rack} />
        </>
    )
}
