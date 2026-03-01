
"use client";

import { createContext, useContext, useEffect, useState } from "react";
// import { initDB } from "@/lib/db/client"; // Will implement next
// For now, define the type
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
// Wait, we are moving AWAY from better-sqlite3. 
// The type will be BaseSQLiteDatabase<"async", any, any> or similar.

import { Loader2 } from "lucide-react";

// Context Type
// We'll use 'any' for the DB type temporarily until client.ts is finalized
interface DbContextType {
    db: any | null;
    loading: boolean;
}

const DbContext = createContext<DbContextType>({
    db: null,
    loading: true,
});

export const useDb = () => useContext(DbContext);

export function DbProvider({ children }: { children: React.ReactNode }) {
    const [db, setDb] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                // Dynamically import client to avoid SSR issues if any
                const { initDB } = await import("@/lib/db/client");
                const database = await initDB();
                setDb(database);
            } catch (err) {
                console.error("Failed to initialize DB:", err);
                setError(err instanceof Error ? err.message : "Unknown DB Error");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background flex-col gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Initializing Database...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-destructive/10 flex-col gap-4 p-8 text-center">
                <h2 className="text-xl font-bold text-destructive">Database Error</h2>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <DbContext.Provider value={{ db, loading }}>
            {children}
        </DbContext.Provider>
    );
}
