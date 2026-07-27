import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        
        // We will set the STAFF_PASSWORD in our environment / ecosystem.config.js
        const correctPassword = process.env.STAFF_PASSWORD || 'mitoforge2026';
        
        if (password === correctPassword) {
            const cookieStore = await cookies();
            cookieStore.set('staff_auth', 'authenticated', { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 30 // 30 days
            });
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
