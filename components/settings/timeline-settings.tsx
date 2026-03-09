"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFacility } from "@/hooks/use-facility";
import { useFacilityData } from "@/components/providers/facility-provider";
import { CalendarClock, CheckCircle2 } from "lucide-react";

export function TimelineSettings() {
    const { settings, refresh } = useFacilityData();
    const { updateFacilitySettings } = useFacility();

    const [removeClothDay, setRemoveClothDay] = useState<number>(14);
    const [light1Day, setLight1Day] = useState<number>(15);
    const [light2Day, setLight2Day] = useState<number>(17);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (settings) {
            setRemoveClothDay(settings.removeClothDay ?? 14);
            setLight1Day(settings.light1Day ?? 15);
            setLight2Day(settings.light2Day ?? 17);
        }
    }, [settings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSaved(false);
        const payload = {
            removeClothDay,
            light1Day,
            light2Day
        };
        await updateFacilitySettings(payload);
        await refresh();
        setLoading(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Card className="border-blue-200 dark:border-blue-900/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-blue-600" />
                    Timeline Parameters
                </CardTitle>
                <CardDescription>
                    Configure the specific days when batches should be transitioned.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="removeClothDay">Remove Cloth (Day)</Label>
                            <Input
                                id="removeClothDay"
                                type="number"
                                min={1}
                                value={removeClothDay}
                                onChange={(e) => setRemoveClothDay(Number(e.target.value))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="light1Day">Light 1 Trigger (Day)</Label>
                            <Input
                                id="light1Day"
                                type="number"
                                min={1}
                                value={light1Day}
                                onChange={(e) => setLight1Day(Number(e.target.value))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="light2Day">Light 2 Trigger (Day)</Label>
                            <Input
                                id="light2Day"
                                type="number"
                                min={1}
                                value={light2Day}
                                onChange={(e) => setLight2Day(Number(e.target.value))}
                                required
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center bg-secondary/20 border-t py-3">
                    <div className="text-sm">
                        {saved && (
                            <span className="flex items-center text-emerald-600 gap-1 font-medium animate-in fade-in">
                                <CheckCircle2 className="w-4 h-4" />
                                Settings saved successfully.
                            </span>
                        )}
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : "Save Config"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
