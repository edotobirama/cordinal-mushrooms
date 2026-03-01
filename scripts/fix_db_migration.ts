
import Database from "better-sqlite3";

const db = new Database("sqlite.db");

try {
    console.log("Checking for 'estimated_ready_date' column in 'batches' table...");

    // Check if column exists
    const tableInfo = db.pragma("table_info(batches)") as any[];
    const hasColumn = tableInfo.some(col => col.name === "estimated_ready_date");

    if (!hasColumn) {
        console.log("Column missing. Adding 'estimated_ready_date'...");
        db.prepare("ALTER TABLE batches ADD COLUMN estimated_ready_date TEXT").run();
        console.log("Column added successfully.");
    } else {
        console.log("Column already exists.");
    }

    console.log("Migrating legacy 'Spawn' batches to 'Liquid Culture'...");
    const result = db.prepare("UPDATE batches SET type = 'Liquid Culture' WHERE type = 'Spawn'").run();
    console.log(`Updated ${result.changes} batches.`);

    console.log("Database patch completed.");

} catch (error) {
    console.error("Migration failed:", error);
}
