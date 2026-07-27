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
