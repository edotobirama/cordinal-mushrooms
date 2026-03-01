"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Grid3X3, FlaskConical, Box, FileText, Settings, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Facility", href: "/facility", icon: Grid3X3 },
    { name: "Production", href: "/production", icon: FlaskConical },
    { name: "Recipes", href: "/recipes", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isInstallable, promptInstall } = useInstallPrompt();

    return (
        <div className="hidden md:flex h-full w-64 flex-col bg-card border-r">
            <div className="flex h-16 items-center px-6 border-b">
                <h1 className="text-xl font-bold tracking-tight text-primary">
                    Cordinal
                </h1>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground group-hover:text-foreground"
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t space-y-4">
                {isInstallable && (
                    <Button
                        onClick={promptInstall}
                        variant="outline"
                        className="w-full justify-start gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Install App
                    </Button>
                )}
                <ThemeToggle />
            </div>
        </div>
    );
}
