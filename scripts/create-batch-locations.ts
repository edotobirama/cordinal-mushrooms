
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";

async function main() {
    console.log("Creating batch_locations table...");
    const sqlite = new Database("sqlite.db");
    const statement = sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS batch_locations (
            id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            batch_id integer NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
            rack_id integer NOT NULL REFERENCES racks(id),
            layer integer NOT NULL,
            quantity integer NOT NULL,
            created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
        );
    `);
    statement.run();
    console.log("Table created.");
}

main().catch(err => {
    console.error("Failed:", err);
    process.exit(1);
});
