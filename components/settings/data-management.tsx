
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function DataManagement() {
    const [isImporting, setIsImporting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleExport = async () => {
        try {
            const { exportDatabase } = await import("@/lib/db/client");
            const blob = await exportDatabase();
            if (!blob) throw new Error("Failed to export database");

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `cordinal_backup_${new Date().toISOString().split('T')[0]}.db`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: "Export failed" });
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("WARNING: importing data will OVERWRITE all current data. This cannot be undone. Are you sure?")) {
            e.target.value = ""; // Reset input
            return;
        }

        setIsImporting(true);
        setStatus(null);

        try {
            const { importDatabase } = await import("@/lib/db/client");
            await importDatabase(file);

            setStatus({ type: 'success', message: "Data restored successfully! The page will reload." });

            // Reload after a short delay to show success
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: (error instanceof Error) ? error.message : "Import failed" });
        } finally {
            setIsImporting(false);
            e.target.value = ""; // Reset
        }
    };

    return (
        <Card className="border-orange-200 dark:border-orange-900/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Database Management
                </CardTitle>
                <CardDescription>
                    Export your data to share via WhatsApp or back up your system. Import to restore data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Export Section */}
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-secondary/20 rounded-lg border gap-4">
                    <div className="space-y-1">
                        <h4 className="font-medium flex items-center gap-2">
                            <Download className="w-4 h-4 text-emerald-600" />
                            Export Data
                        </h4>
                        <p className="text-sm text-muted-foreground">Download the full database as a file.</p>
                    </div>
                    <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                        Download Backup
                    </Button>
                </div>

                {/* Import Section */}
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-secondary/20 rounded-lg border gap-4">
                    <div className="space-y-1">
                        <h4 className="font-medium flex items-center gap-2">
                            <Upload className="w-4 h-4 text-orange-600" />
                            Import Data
                        </h4>
                        <p className="text-sm text-muted-foreground">Restore from a backup file (Overwrites current data!).</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                            type="file"
                            accept="*/*"
                            onChange={handleImport}
                            disabled={isImporting}
                            className="w-full"
                        />
                    </div>
                </div>

                {status && (
                    <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {status.message}
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
