import { db } from "@/lib/db";
import { getFacilityActionMapService } from "@/lib/services/dashboard";

async function run() {
    const actionMap = await getFacilityActionMapService(db);
    console.log("Action Map Output:", JSON.stringify(actionMap, null, 2));
}

run().catch(console.error);
