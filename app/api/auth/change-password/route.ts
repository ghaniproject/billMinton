import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getCurrentUser, requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const user = requireAuth(currentUser);

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password lama dan password baru harus diisi' },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter' },
        { status: 400 },
      );
    }

    // Ambil user dari database
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [
      user.id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const dbUser = result.rows[0];

    // Cek password lama
    const isValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password lama salah' },
        { status: 401 },
      );
    }

    // Hash password baru
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update database
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
      hashed,
      user.id,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengubah password' },
      { status: 500 },
    );
  }
}