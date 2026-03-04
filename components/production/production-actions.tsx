
"use client";

import { useProduction } from "@/hooks/use-production";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";

export function ProductionActions({ batchId, batchName, onSuccess }: { batchId: number, batchName: string, onSuccess?: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const { discardBatch } = useProduction();

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to discard batch "${batchName}"?`)) {
            setIsLoading(true);
            await discardBatch(batchId);
            setIsLoading(false);
            if (onSuccess) onSuccess();
            else window.location.reload();
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash className="mr-2 h-4 w-4" />
                    Discard
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
