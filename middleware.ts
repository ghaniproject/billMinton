import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth-token');
    const { pathname } = request.nextUrl;

    // Jika sudah login dan buka /login, redirect ke home
    // Halaman lain (termasuk '/') selalu public
    if (token && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Middleware hanya perlu jalan di /login untuk handle redirect saat sudah login
    matcher: ['/login'],
};

