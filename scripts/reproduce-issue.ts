
// Mock IndexedDB for Node environment
const fakeIndexedDB = {
    open: () => ({
        onupgradeneeded: () => { },
        onsuccess: () => { },
        onerror: () => { },
        result: {
            objectStoreNames: { contains: () => false },
            createObjectStore: () => { },
            transaction: () => ({ objectStore: () => ({ get: () => ({ onsuccess: () => { } }), put: () => ({ onsuccess: () => { } }) }) })
        }
    })
};
(global as any).indexedDB = fakeIndexedDB;

import { initDB } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function run() {
    console.log("Initializing DB...");
    const db = await initDB();
    console.log("DB Initialized.");

    console.log("Creating Test Batch...");
    try {
        const result = await db.insert(schema.batches).values({
            name: "Test-Batch-Returning",
            sourceId: "Test",
            startDate: new Date().toISOString(),
            rackId: 1, // Assumptions
            jarCount: 10,
            layer: 1
        }).returning({ id: schema.batches.id });

        console.log("Insert Result:", result);
        if (result && result.length > 0 && result[0].id) {
            console.log("RETURNING clause works! ID:", result[0].id);
        } else {
            console.error("RETURNING clause FAILED or returned empty.");
        }
    } catch (e) {
        console.error("Insert failed:", e);
    }
}

run();
