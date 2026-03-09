// Fix: Add is_preserved column and any other missing migrations to sqlite.db for Node.js scripts
import { sqlite } from "../lib/db";

const migrations = [
    `ALTER TABLE inventory_items ADD COLUMN is_preserved INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE racks ADD COLUMN light_status INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE facility_settings ADD COLUMN remove_cloth_day INTEGER NOT NULL DEFAULT 14;`,
    `ALTER TABLE facility_settings ADD COLUMN light_1_day INTEGER NOT NULL DEFAULT 15;`,
    `ALTER TABLE facility_settings ADD COLUMN light_2_day INTEGER NOT NULL DEFAULT 17;`,
    `ALTER TABLE facility_settings ADD COLUMN harvest_day INTEGER NOT NULL DEFAULT 60;`,
    `ALTER TABLE rack_layers ADD COLUMN light_1 INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE rack_layers ADD COLUMN light_2 INTEGER NOT NULL DEFAULT 0;`,
];

for (const sql of migrations) {
    try {
        sqlite.prepare(sql).run();
        console.log(`✓ Ran: ${sql.slice(0, 60)}`);
    } catch (e: any) {
        if (e.message.includes("duplicate column name")) {
            console.log(`  Already exists: ${sql.slice(0, 60)}`);
        } else {
            throw e;
        }
    }
}
console.log("Migration complete.");
