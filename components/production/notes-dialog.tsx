"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";
import { useState, useEffect } from "react";

interface NotesDialogProps {
    currentNotes: string;
    itemName: string;
    onSave: (notes: string) => void | Promise<void>;
}

export function NotesDialog({ currentNotes, itemName, onSave }: NotesDialogProps) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState(currentNotes || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setNotes(currentNotes || "");
    }, [open, currentNotes]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(notes);
            setOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const hasNotes = !!currentNotes && currentNotes.trim().length > 0;

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${hasNotes ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground"}`}
                title={hasNotes ? currentNotes : "Add note..."}
                onClick={() => setOpen(true)}
            >
                <StickyNote className="h-4 w-4" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <StickyNote className="h-5 w-5 text-amber-500" />
                            Notes — {itemName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Write your notes here..."
                            className="min-h-[120px] resize-y"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Notes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
