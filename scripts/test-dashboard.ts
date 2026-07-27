import { getDashboardGridStatsService } from "../lib/services/dashboard";
import { initDB } from "../lib/db/client";

async function run() {
    try {
        const db = await initDB();
        const stats = await getDashboardGridStatsService(db);
        console.log("Stats:", stats);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
