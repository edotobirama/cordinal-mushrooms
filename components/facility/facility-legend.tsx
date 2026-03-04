"use client";

import { useFacilityData } from "@/components/providers/facility-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const legendItems = [
    { id: "red", label: "Discard", bgColor: "bg-red-500", hoverColor: "hover:bg-red-600", textColor: "text-white" },
    { id: "purple", label: "Shake", bgColor: "bg-purple-500", hoverColor: "hover:bg-purple-600", textColor: "text-white" },
    { id: "green", label: "Harvest", bgColor: "bg-emerald-500", hoverColor: "hover:bg-emerald-600", textColor: "text-white" },
    { id: "yellow", label: "Light On", bgColor: "bg-amber-500", hoverColor: "hover:bg-amber-600", textColor: "text-white" },
    { id: "blue", label: "Remove Cloth", bgColor: "bg-blue-500", hoverColor: "hover:bg-blue-600", textColor: "text-white" },
];


interface FacilityLegendProps {
    activeFilter: string | null;
    onFilterChange: (filter: string | null) => void;
}

export function FacilityLegend({ activeFilter, onFilterChange }: FacilityLegendProps) {
    const { actionMap } = useFacilityData();

    // Calculate totals across all racks, layers, and matching colors
    const totals = legendItems.reduce((acc, item) => {
        let count = 0;
        if (actionMap) {
            Object.values(actionMap).forEach(rackLayers => {
                Object.values(rackLayers).forEach(layerActions => {
                    if (layerActions[item.id]) {
                        count += layerActions[item.id].length;
                    }
                });
            });
        }
        acc[item.id] = count;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-secondary/50 rounded-lg border">
            <span className="text-sm font-medium mr-2 text-muted-foreground uppercase tracking-wider">Legend & Drill-Down Filters:</span>
            {legendItems.map((item) => {
                const count = totals[item.id] || 0;
                const isActive = activeFilter === item.id;

                return (
                    <Button
                        key={item.id}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => onFilterChange(isActive ? null : item.id)}
                        className={cn(
                            "transition-all duration-200 gap-2 h-9",
                            isActive
                                ? `${item.bgColor} ${item.hoverColor} ${item.textColor} border-transparent ring-2 ring-offset-2 ring-primary scale-105`
                                : "hover:border-primary/50"
                        )}
                    >
                        <div className={cn("w-3 h-3 rounded-full shadow-sm", item.bgColor, isActive && "ring-1 ring-white")} />
                        <span>{item.label}</span>
                        <Badge
                            variant="secondary"
                            className={cn(
                                "ml-1 font-mono",
                                isActive
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-muted text-muted-foreground",
                                count > 0 && !isActive && "bg-primary/10 text-primary"
                            )}
                        >
                            {count}
                        </Badge>
                    </Button>
                );
            })}

            {activeFilter && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilterChange(null)}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                    Clear Filter
                </Button>
            )}
        </div>
    );
}
