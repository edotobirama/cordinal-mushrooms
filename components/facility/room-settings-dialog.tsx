"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFacility } from "@/hooks/use-facility";
import { Settings } from "lucide-react";
import { useFacilityData } from "@/components/providers/facility-provider";

export function RoomSettingsDialog() {
    const [open, setOpen] = useState(false);
    const { settings, refresh } = useFacilityData();
    const { updateFacilitySettings } = useFacility();

    // Local state for form content
    const [width, setWidth] = useState(20);
    const [height, setHeight] = useState(15);
    const [shakeMorning, setShakeMorning] = useState("09:00");
    const [shakeEvening, setShakeEvening] = useState("21:00");
    const [loading, setLoading] = useState(false);

    // Sync with global settings when dialog opens or settings change
    useEffect(() => {
        if (settings) {
            setWidth(settings.roomWidth);
            setHeight(settings.roomHeight);
            setShakeMorning(settings.shakeMorningTime);
            setShakeEvening(settings.shakeEveningTime);
        }
    }, [settings, open]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        await updateFacilitySettings(formData);
        await refresh();
        setLoading(false);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Room Settings</DialogTitle>
                    <DialogDescription>
                        Adjust the dimensions of your grow room (in grid units).
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="room-width" className="text-right">
                                Width
                            </Label>
                            <Input
                                id="room-width"
                                name="roomWidth"
                                type="number"
                                className="col-span-3"
                                value={width}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                min={1}
                                step={0.1}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="room-height" className="text-right">
                                Length
                            </Label>
                            <Input
                                id="room-height"
                                name="roomHeight"
                                type="number"
                                className="col-span-3"
                                value={height}
                                onChange={(e) => setHeight(Number(e.target.value))}
                                min={1}
                                step={0.1}
                                required
                            />
                        </div>

                        <div className="col-span-4 border-t my-2"></div>
                        <h4 className="col-span-4 font-medium mb-2">Shake Schedule</h4>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="shake-morning" className="text-right">
                                Morning
                            </Label>
                            <Input
                                id="shake-morning"
                                name="shakeMorningTime"
                                type="time"
                                className="col-span-3"
                                value={shakeMorning}
                                onChange={(e) => setShakeMorning(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="shake-evening" className="text-right">
                                Evening
                            </Label>
                            <Input
                                id="shake-evening"
                                name="shakeEveningTime"
                                type="time"
                                className="col-span-3"
                                value={shakeEvening}
                                onChange={(e) => setShakeEvening(e.target.value)}
                                required
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Loading..." : "Save Settings"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
