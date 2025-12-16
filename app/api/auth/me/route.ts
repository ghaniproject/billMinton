import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Tidak ada token' },
                { status: 401 }
            );
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
        ) as any;

        return NextResponse.json({
            success: true,
            user: {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Token tidak valid' },
            { status: 401 }
        );
    }
}

