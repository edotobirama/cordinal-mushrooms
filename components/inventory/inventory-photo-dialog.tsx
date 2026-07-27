"use client";

import { useDb } from "@/components/providers/db-provider";
import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Loader2, ImagePlus } from "lucide-react";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";

export function InventoryPhotoDialog({ itemId, itemName }: { itemId: number, itemName: string }) {
    const { db } = useDb();
    const [open, setOpen] = useState(false);
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadPhotos = async () => {
        if (!db) return;
        setLoading(true);
        try {
            const result = await db.select()
                .from(schema.photos)
                .where(and(
                    eq(schema.photos.entityType, "inventory"),
                    eq(schema.photos.entityId, itemId)
                ))
                .orderBy(schema.photos.createdAt);

            setPhotos(result);
        } catch (e) {
            console.error("Failed to load inventory photos", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadPhotos();
        }
    }, [open, db]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("entityType", "inventory");
            formData.append("entityId", itemId.toString());

            const res = await fetch("/operations/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to upload photo");
            }

            await loadPhotos();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const deletePhoto = async (photoId: number, url: string) => {
        if (!confirm("Are you sure you want to delete this photo?")) return;
        try {
            const res = await fetch(`/operations/api/media/${url}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete photo");
            setPhotos(prev => prev.filter(photo => photo.id !== photoId));
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Photos">
                    <ImageIcon className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Photos for {itemName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {photos.map(p => (
                                <div key={p.id} className="relative group aspect-square rounded-md overflow-hidden bg-muted border flex flex-col items-center justify-center">
                                    <a href={`/operations/api/media/${p.url}`} target="_blank" rel="noreferrer" className="absolute inset-0 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors">
                                        <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(p.createdAt), 'MMM d, yyyy')}</span>
                                    </a>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deletePhoto(p.id, p.url);
                                        }}
                                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Delete photo"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            
                            <label className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleUpload}
                                    disabled={uploading}
                                />
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                ) : (
                                    <>
                                        <ImagePlus className="w-6 h-6 text-muted-foreground mb-2" />
                                        <span className="text-xs text-muted-foreground">Add Photo</span>
                                    </>
                                )}
                            </label>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
