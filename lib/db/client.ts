import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

let dbPromise: Promise<any> | null = null;

export async function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = (async () => {
        const db = drizzle(async (sql, params, method) => {
            try {
                const response = await fetch('/operations/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sql, params, method })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Database query failed');
                }

                const data = await response.json();
                return { rows: data.rows };
            } catch (e) {
                console.error("Query Error:", e, sql);
                throw e;
            }
        }, { schema });

        return db;
    })();

    return dbPromise;
}

// Dummy functions for backwards compatibility with existing hooks
export async function saveDatabase() {
    // No-op in cloud mode since the server persists automatically
    return Promise.resolve();
}

export async function exportDatabase(): Promise<Blob | null> {
    return null;
}

export async function importDatabase(file: File): Promise<void> {
    throw new Error("Importing database via UI is disabled in cloud-mode.");
}
