import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { photos } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const staffAuth = cookieStore.get("staff_auth");
        if (staffAuth?.value !== "authenticated") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const entityType = formData.get("entityType") as string;
        const entityId = formData.get("entityId") as string;
        const notes = formData.get("notes") as string | null;

        if (!file || !entityType || !entityId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Generate unique filename
        const ext = file.name.split('.').pop();
        const fileName = `${entityType}/${entityId}/${uuidv4()}.${ext}`;

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
        }));

        // Save record to DB
        const result = await db.insert(photos).values({
            entityType,
            entityId: parseInt(entityId),
            url: fileName, // Store the S3 Key as the URL
            notes: notes || null,
        }).returning();

        return NextResponse.json({ success: true, photo: result[0] });
    } catch (e: any) {
        console.error("Upload Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
