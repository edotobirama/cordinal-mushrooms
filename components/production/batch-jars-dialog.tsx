"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDb } from "@/components/providers/db-provider";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function BatchJarsDialog({ batchId, batchName }: { batchId: number, batchName: string }) {
    const [open, setOpen] = useState(false);
    const { db } = useDb();
    const [jars, setJars] = useState<any[]>([]);
    const [photos, setPhotos] = useState<Record<number, any[]>>({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<number | null>(null);

    const loadJars = async () => {
        if (!db) return;
        setLoading(true);
        try {
            const batchJars = await db.select().from(schema.batchJars).where(eq(schema.batchJars.batchId, batchId)).orderBy(schema.batchJars.jarIndex);
            setJars(batchJars);

            const allPhotos = await db.select().from(schema.photos).where(eq(schema.photos.entityType, "jar"));
            
            const photoMap: Record<number, any[]> = {};
            batchJars.forEach((j: any) => photoMap[j.id] = []);
            
            allPhotos.forEach((p: any) => {
                if (photoMap[p.entityId]) {
                    photoMap[p.entityId].push(p);
                }
            });
            setPhotos(photoMap);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadJars();
        }
    }, [open, db]);

    const handleUpload = async (jarId: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(jarId);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("entityType", "jar");
            formData.append("entityId", jarId.toString());

            const res = await fetch("/operations/api/upload", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                await loadJars();
            } else {
                alert("Upload failed.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">View Jars</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[800px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{batchName} - Individual Jars</DialogTitle>
                    <DialogDescription>
                        Track the progress of each specific jar, record notes, and attach photos.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                    <div className="border rounded-md mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Jar Index</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Photos</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jars.map((jar) => (
                                    <TableRow key={jar.id}>
                                        <TableCell className="font-medium">Jar {jar.jarIndex}</TableCell>
                                        <TableCell>
                                            <Badge variant={jar.status === 'Active' ? 'default' : (jar.status === 'Discarded' ? 'destructive' : 'secondary')}>
                                                {jar.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 overflow-x-auto max-w-[300px] pb-2">
                                                {photos[jar.id]?.length === 0 && <span className="text-muted-foreground text-xs">No photos</span>}
                                                {photos[jar.id]?.map((p) => (
                                                    <a key={p.id} href={`/operations/api/media/${p.url}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden border">
                                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                                            {/* In a real app we'd load a thumbnail, but for now we link to the presigned URL */}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">{format(new Date(p.createdAt), 'MMM d')}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    id={`upload-${jar.id}`}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleUpload(jar.id, e)}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={uploading === jar.id}
                                                    onClick={() => document.getElementById(`upload-${jar.id}`)?.click()}
                                                >
                                                    {uploading === jar.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
                                                    Add Photo
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
