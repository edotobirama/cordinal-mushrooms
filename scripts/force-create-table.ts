
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { racks } from "../lib/db/schema";
import Database from "better-sqlite3";

async function main() {
    console.log("Forcing creation of batch_actions table...");
    const sqlite = new Database("sqlite.db");
    const statement = sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS batch_actions (
            id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            batch_id integer NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
            action_type text NOT NULL,
            performed_by text DEFAULT 'System',
            performed_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
        );
    `);
    statement.run();
    console.log("Table created.");
}

main().catch(err => {
    console.error("Failed:", err);
    process.exit(1);
});
