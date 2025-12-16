import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export interface User {
    id: number;
    username: string;
    role: 'admin' | 'user';
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return null;
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
        ) as User;

        return decoded;
    } catch (error) {
        return null;
    }
}

export function requireAuth(user: User | null): User {
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}

export function requireAdmin(user: User | null): User {
    if (!user || user.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
    }
    return user;
}

