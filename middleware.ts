import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const authCookie = request.cookies.get('staff_auth')?.value
    const isLoginPage = request.nextUrl.pathname === '/login'
    const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth')

    // Allow static files and API auth routes
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        isApiAuth
    ) {
        return NextResponse.next()
    }

    // If not authenticated and not on login page, redirect to login
    if (authCookie !== 'authenticated' && !isLoginPage) {
        return NextResponse.redirect(new URL('/operations/login', request.url))
    }

    // If authenticated and trying to access login page, redirect to home
    if (authCookie === 'authenticated' && isLoginPage) {
        return NextResponse.redirect(new URL('/operations', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
