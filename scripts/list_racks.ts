
import { db } from "@/lib/db";
import { racks } from "@/lib/db/schema";

async function main() {
    const allRacks = await db.select().from(racks);
    console.log("Current Racks:");
    allRacks.forEach(r => {
        console.log(`- ID: ${r.id}, Name: "${r.name}", Layers: ${r.totalLayers}, Capacity: ${r.capacity}`);
    });
}

main();
