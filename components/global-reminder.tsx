"use client";

import { useEffect, useState } from "react";
import { useDb } from "@/components/providers/db-provider";
import * as schema from "@/lib/db/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle } from "lucide-react";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { eq, not, inArray } from "drizzle-orm";
import { LocalNotifications } from '@capacitor/local-notifications';
export function GlobalReminder() {
    const { db } = useDb();
    const [open, setOpen] = useState(false);
    const [reminders, setReminders] = useState<{batch: string; message: string}[]>([]);

    useEffect(() => {
        if (!db) return;

        const checkReminders = async () => {
            try {
                // Fetch locally
                const settingsRes = await db.select().from(schema.facilitySettings).limit(1);
                const settings = settingsRes[0] || {};
                
                const activeBatches = await db.select({
                    id: schema.batches.id,
                    name: schema.batches.name,
                    type: schema.batches.type,
                    startDate: schema.batches.startDate,
                    rackName: schema.racks.name,
                    layer: schema.batches.layer
                })
                .from(schema.batches)
                .leftJoin(schema.racks, eq(schema.batches.rackId, schema.racks.id))
                .where(not(inArray(schema.batches.status, ["Harvested", "Discarded"])));

                const today = new Date();
                const newReminders: {batch: string; message: string}[] = [];

                const clothDay = settings.removeClothDay ?? 14;
                const light1Day = settings.light1Day ?? 15;
                const light2Day = settings.light2Day ?? 17;
                const harvestDay = settings.harvestDay ?? 60;

                for (const batch of activeBatches) {
                    if (batch.type === 'Base Culture') continue;

                    const start = parseISO(batch.startDate);
                    const daysElapsed = differenceInCalendarDays(today, start);

                    const messages = [];

                    if (daysElapsed === clothDay) messages.push("Remove cloth");
                    if (daysElapsed === light1Day) messages.push("Trigger Light 1");
                    if (daysElapsed === light2Day) messages.push("Trigger Light 2");
                    if (daysElapsed === harvestDay) messages.push("Harvest");

                    if (messages.length > 0) {
                        const locExt = batch.rackName ? ` - ${batch.rackName}, Level ${batch.layer}` : "";
                        newReminders.push({
                            batch: batch.name,
                            message: `${messages.join(' & ')} today${locExt}`
                        });
                    }
                }

                if (newReminders.length > 0) {
                    setReminders(newReminders);
                    
                    // Show dialog if not seen today
                    const storageKey = `reminders-${today.toISOString().split('T')[0]}`;
                    const seen = localStorage.getItem(storageKey);
                    
                    if (!seen) {
                        setOpen(true);
                        
                        // Try schedule push notifications globally
                        try {
                            const perm = await LocalNotifications.requestPermissions();
                            if (perm.display === 'granted') {
                                await LocalNotifications.schedule({
                                    notifications: newReminders.map((r, i) => ({
                                        title: 'Cordinal Actions Needed',
                                        body: `Batch ${r.batch}: ${r.message}`,
                                        id: i + 1,
                                        schedule: { at: new Date(Date.now() + 1000 * 5) }
                                    }))
                                });
                            }
                        } catch (e) {
                            console.log("Local Notifications unavailable - running in web context", e);
                        }
                    }
                }
            } catch (e) {
                console.error("Reminder check failed", e);
            }
        };

        checkReminders();
    }, [db]);

    const dismissReminders = () => {
        setOpen(false);
        const today = new Date();
        const storageKey = `reminders-${today.toISOString().split('T')[0]}`;
        localStorage.setItem(storageKey, "true");
    };

    if (reminders.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary">
                        <Bell className="w-5 h-5" /> Daily Reminders
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-3 py-4">
                    {reminders.map((r, i) => (
                        <div key={i} className="flex gap-3 items-start border-b pb-3 last:border-0 last:pb-0">
                            <span className="bg-primary/20 p-2 rounded-full mt-0.5 shrink-0">
                                <CheckCircle className="w-4 h-4 text-primary" />
                            </span>
                            <div>
                                <p className="font-semibold text-sm">{r.batch}</p>
                                <p className="text-sm text-muted-foreground">{r.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter className="sm:justify-end">
                    <Button onClick={dismissReminders}>Got it</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
