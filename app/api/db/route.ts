import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// Initialize the database connection (only once per server instance)
let db: any;

function getDb() {
    if (!db) {
        // Use an absolute path or path relative to the process cwd
        const dataDir = path.resolve(process.cwd(), "data");
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const dbPath = path.join(dataDir, "sqlite.db");
        // Completely bypass Turbopack static analysis using eval
        const Database = eval('require("better-sqlite3")');
        db = new Database(dbPath, { verbose: console.log });
        
        // Ensure WAL mode for better concurrency
        db.pragma('journal_mode = WAL');
    }
    return db;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sql, params, method } = body;
        
        const database = getDb();
        
        // Execute the query
        const stmt = database.prepare(sql);
        
        let rows: any[] = [];
        
        // If returning data
        if (method === "all" || sql.trim().toUpperCase().startsWith("SELECT") || sql.trim().toUpperCase().startsWith("PRAGMA") || sql.trim().toUpperCase().includes("RETURNING")) {
            // Raw mode so we can manually extract values or let better-sqlite3 return objects
            // Drizzle sqlite-proxy requires an array of arrays OR array of values, depending on what it expects.
            // Actually, sqlite-proxy expects { rows: any[][] }
            stmt.raw(true); 
            rows = stmt.all(...(params || []));
        } else {
            const info = stmt.run(...(params || []));
            rows = []; 
        }

        return NextResponse.json({ rows });
    } catch (error: any) {
        console.error("Database Proxy Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
