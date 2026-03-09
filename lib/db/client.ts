import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import SQLiteESMFactory from "wa-sqlite/dist/wa-sqlite.mjs";
// @ts-ignore
import { Factory, SQLITE_ROW, SQLITE_OPEN_READWRITE, SQLITE_OPEN_CREATE, SQLITE_INTEGER, SQLITE_FLOAT, SQLITE_TEXT, SQLITE_BLOB } from "wa-sqlite";
import { MemoryVFS } from "wa-sqlite/src/examples/MemoryVFS.js";

class Mutex {
    private mutex = Promise.resolve();

    lock(): Promise<() => void> {
        let unlock: () => void = () => { };
        const nextMutex = new Promise<void>(resolve => {
            unlock = resolve;
        });

        const previousMutex = this.mutex;
        this.mutex = previousMutex.then(() => nextMutex);

        return previousMutex.then(() => unlock);
    }

    async dispatch<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
        const unlock = await this.lock();
        try {
            return await Promise.resolve(fn());
        } finally {
            unlock();
        }
    }
}

const dbMutex = new Mutex();

import { saveDB, loadDB } from "./persistence";

// Auto-save interval ref
let autoSaveInterval: NodeJS.Timeout | null = null;
let databaseVFS: MemoryVFS | null = null;

// Singleton to prevent multiple inits
let dbPromise: Promise<any> | null = null;

export async function saveDatabase() {
    if (databaseVFS) {
        // Access raw data. Note: internal implementation detail of MemoryVFS
        // @ts-ignore
        const file = databaseVFS.mapNameToFile.get("cordinal.sqlite");
        if (file && file.data) {
            // MemoryVFS may over-allocate (2x growth). We must save only
            // the actual data (file.size bytes) as a clean ArrayBuffer,
            // so that restoration works correctly with MemoryVFS.xRead
            // which does: new Uint8Array(file.data, offset, length)
            const cleanData = new ArrayBuffer(file.size);
            new Uint8Array(cleanData).set(new Uint8Array(file.data, 0, file.size));
            await saveDB(cleanData);
            console.log("Database saved to IDB");
        }
    }
}

export async function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = (async () => {
        const module = await SQLiteESMFactory();
        const sqlite3 = Factory(module);

        const vfs = new MemoryVFS();
        databaseVFS = vfs;

        sqlite3.vfs_register(vfs, true);

        // Load existing data
        const existingRaw = await loadDB();
        if (existingRaw) {
            // Ensure data is a proper ArrayBuffer (IndexedDB may return
            // Uint8Array, ArrayBuffer, or other buffer views depending on browser)
            let existingData: ArrayBuffer;
            if (existingRaw instanceof ArrayBuffer) {
                existingData = existingRaw;
            } else if (ArrayBuffer.isView(existingRaw)) {
                // It's a typed array view (Uint8Array etc) — extract the underlying buffer
                // We must copy to a new ArrayBuffer to avoid offset issues
                const view = existingRaw as unknown as Uint8Array;
                existingData = new ArrayBuffer(view.byteLength);
                new Uint8Array(existingData).set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
            } else {
                existingData = existingRaw as ArrayBuffer;
            }
            console.log("Restoring database from persistence...", existingData.byteLength);
            // @ts-ignore
            vfs.mapNameToFile.set("cordinal.sqlite", {
                name: "cordinal.sqlite",
                flags: SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE,
                size: existingData.byteLength,
                data: existingData
            });
        }

        const dbPtr = await sqlite3.open_v2(
            "cordinal.sqlite",
            SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE,
            "memory"
        );

        await ensureSchema(sqlite3, dbPtr);

        const db = drizzle(async (sql, params, method) => {
            return await dbMutex.dispatch(async () => {
                let rows: any[][] = [];

                try {
                    for await (const stmt of sqlite3.statements(dbPtr, sql)) {
                        // Bind parameters
                        if (params && params.length > 0) {
                            const paramCount = sqlite3.bind_parameter_count(stmt);
                            for (let i = 0; i < params.length; i++) {
                                if (i + 1 <= paramCount) {
                                    sqlite3.bind(stmt, i + 1, params[i]);
                                }
                            }
                        }

                        // Execute
                        const colCount = sqlite3.column_count(stmt);
                        while ((await sqlite3.step(stmt)) === SQLITE_ROW) {
                            const row = [];
                            for (let i = 0; i < colCount; i++) {
                                const type = sqlite3.column_type(stmt, i);
                                let val;
                                switch (type) {
                                    case SQLITE_INTEGER: val = Number(sqlite3.column_int64(stmt, i)); break;
                                    case SQLITE_FLOAT: val = sqlite3.column_double(stmt, i); break;
                                    case SQLITE_TEXT: val = sqlite3.column_text(stmt, i); break;
                                    case SQLITE_BLOB: val = sqlite3.column_blob(stmt, i); break;
                                    default: val = null;
                                }
                                row.push(val);
                            }
                            rows.push(row);
                        }
                    }
                } catch (e) {
                    console.error("Query Error:", e, sql);
                    throw e;
                }

                return { rows };
            });
        }, { schema });

        // Start Auto-Save
        if (!autoSaveInterval) {
            autoSaveInterval = setInterval(() => {
                saveDatabase().catch(err => console.error("Auto-save failed:", err));
            }, 5000); // Save every 5 seconds
        }

        return db;
    })();

    return dbPromise;
}

export async function exportDatabase(): Promise<Blob | null> {
    if (!databaseVFS) return null;
    // @ts-ignore
    const file = databaseVFS.mapNameToFile.get("cordinal.sqlite");
    if (file && file.data) {
        return new Blob([file.data], { type: "application/x-sqlite3" });
    }
    return null;
}

export async function importDatabase(file: File): Promise<void> {
    if (!databaseVFS) throw new Error("Database not initialized");

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Stop auto-save temporarily
    if (autoSaveInterval) clearInterval(autoSaveInterval);

    // Overwrite VFS
    // @ts-ignore
    databaseVFS.mapNameToFile.set("cordinal.sqlite", {
        name: "cordinal.sqlite",
        flags: SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE,
        size: uint8Array.length,
        data: uint8Array
    });

    // Persist immediately
    await saveDB(uint8Array);
    console.log("Database imported and saved.");

    // Restart auto-save or reload page (caller handles reload)
}

// Simple schema migration helper
async function ensureSchema(sqlite3: any, dbPtr: number) {
    // Always run CREATE TABLE IF NOT EXISTS to ensure all tables exist
    // taking advantage of SQLite's idempotency for these statements.
    console.log("Ensuring Schema...");
    const ddl = `
        CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0, unit TEXT NOT NULL, low_stock_threshold INTEGER NOT NULL DEFAULT 10, created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP), updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS racks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, capacity INTEGER NOT NULL, current_usage INTEGER NOT NULL DEFAULT 0, light_type TEXT NOT NULL DEFAULT 'White', light_intensity INTEGER NOT NULL DEFAULT 800, light_status INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Active', x INTEGER NOT NULL DEFAULT 0, y INTEGER NOT NULL DEFAULT 0, width REAL NOT NULL DEFAULT 2, height REAL NOT NULL DEFAULT 1, rotation INTEGER NOT NULL DEFAULT 0, material TEXT NOT NULL DEFAULT 'Steel', total_layers INTEGER NOT NULL DEFAULT 7);
        CREATE TABLE IF NOT EXISTS batches (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, source_id TEXT NOT NULL, start_date TEXT NOT NULL, rack_id INTEGER NOT NULL REFERENCES racks(id), layer INTEGER NOT NULL DEFAULT 1, type TEXT NOT NULL DEFAULT 'Liquid Culture', jar_count INTEGER NOT NULL, stage TEXT NOT NULL DEFAULT 'Incubation', estimated_ready_date TEXT, status TEXT NOT NULL DEFAULT 'Active', created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP), updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS facility_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, room_width REAL NOT NULL DEFAULT 20, room_height REAL NOT NULL DEFAULT 15, shake_morning_time TEXT NOT NULL DEFAULT '09:00', shake_evening_time TEXT NOT NULL DEFAULT '21:00', updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS rack_layers (id INTEGER PRIMARY KEY AUTOINCREMENT, rack_id INTEGER NOT NULL REFERENCES racks(id) ON DELETE CASCADE, layer INTEGER NOT NULL, color TEXT NOT NULL DEFAULT 'White', updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS processing_batches (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id INTEGER REFERENCES batches(id), name TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'Drying', quantity INTEGER NOT NULL, start_date TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, quantity INTEGER NOT NULL, unit TEXT NOT NULL, batch_id INTEGER, is_preserved INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS inventory_checks (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, performed_by TEXT DEFAULT 'System', notes TEXT, created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS batch_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE, action_type TEXT NOT NULL, performed_by TEXT DEFAULT 'System', performed_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS batch_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE, rack_id INTEGER NOT NULL REFERENCES racks(id), layer INTEGER NOT NULL, quantity INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
        CREATE TABLE IF NOT EXISTS containers (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Available', condition TEXT, batch_id INTEGER, updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP));
    `;

    await sqlite3.exec(dbPtr, ddl);

    // Run migrations that might fail if the column already exists
    try {
        await sqlite3.exec(dbPtr, `ALTER TABLE racks ADD COLUMN light_status INTEGER NOT NULL DEFAULT 0;`);
        console.log("Added light_status column to racks table");
    } catch (e: any) {
        // Ignore duplicate column error, it means we already migrated
        if (!e.message?.includes("duplicate column name")) {
            console.error("Migration error racks:", e);
        }
    }

    try {
        await sqlite3.exec(dbPtr, `ALTER TABLE inventory_items ADD COLUMN is_preserved INTEGER NOT NULL DEFAULT 0;`);
        console.log("Added is_preserved column to inventory_items table");
    } catch (e: any) {
        if (!e.message?.includes("duplicate column name")) {
            console.error("Migration error inventory_items:", e);
        }
    }

    // New timeline settings
    try { await sqlite3.exec(dbPtr, `ALTER TABLE facility_settings ADD COLUMN remove_cloth_day INTEGER NOT NULL DEFAULT 14;`); } catch (e: any) { }
    try { await sqlite3.exec(dbPtr, `ALTER TABLE facility_settings ADD COLUMN light_1_day INTEGER NOT NULL DEFAULT 15;`); } catch (e: any) { }
    try { await sqlite3.exec(dbPtr, `ALTER TABLE facility_settings ADD COLUMN light_2_day INTEGER NOT NULL DEFAULT 17;`); } catch (e: any) { }
    try { await sqlite3.exec(dbPtr, `ALTER TABLE facility_settings ADD COLUMN harvest_day INTEGER NOT NULL DEFAULT 60;`); } catch (e: any) { }

    // New layer features
    try { await sqlite3.exec(dbPtr, `ALTER TABLE rack_layers ADD COLUMN light_1 INTEGER NOT NULL DEFAULT 0;`); } catch (e: any) { }
    try { await sqlite3.exec(dbPtr, `ALTER TABLE rack_layers ADD COLUMN light_2 INTEGER NOT NULL DEFAULT 0;`); } catch (e: any) { }

    // New batch fields
    try { await sqlite3.exec(dbPtr, `ALTER TABLE batches ADD COLUMN notes TEXT;`); } catch (e: any) { }
    try { await sqlite3.exec(dbPtr, `ALTER TABLE batches ADD COLUMN mother_culture_source TEXT NOT NULL DEFAULT 'New';`); } catch (e: any) { }
}
