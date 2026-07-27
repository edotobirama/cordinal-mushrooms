import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cookies } from "next/headers";

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    try {
        const cookieStore = await cookies();
        const staffAuth = cookieStore.get("staff_auth");
        if (staffAuth?.value !== "authenticated") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const key = resolvedParams.key.join('/');

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
        });

        // URL expires in 1 hour
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        return NextResponse.redirect(signedUrl);
    } catch (e: any) {
        console.error("Presign Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    try {
        const cookieStore = await cookies();
        const staffAuth = cookieStore.get("staff_auth");
        if (staffAuth?.value !== "authenticated") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const key = resolvedParams.key.join('/');

        // Delete from S3
        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
        }));

        // Delete from Database
        const path = await import("path");
        const dataDir = path.resolve(process.cwd(), "data");
        const dbPath = path.join(dataDir, "sqlite.db");
        const Database = eval('require("better-sqlite3")');
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');

        const stmt = db.prepare(`DELETE FROM photos WHERE url = ?`);
        stmt.run(key);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Delete Media Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
