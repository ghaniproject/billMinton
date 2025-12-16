import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ success: true });

    // Hapus cookie
    response.cookies.delete('auth-token');

    return response;
}

