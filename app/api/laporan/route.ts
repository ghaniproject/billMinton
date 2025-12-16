import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, requireAdmin } from '@/lib/auth';

interface TransaksiPayload {
    id: string;
    deskripsi: string;
    nominal: number;
    tanggal: string;
}

interface LaporanPayload {
    saldoAwal: string;
    keteranganList: string[];
    transaksiMasuk: TransaksiPayload[];
    transaksiKeluar: TransaksiPayload[];
}

// Ambil laporan aktif (saat ini kita pakai satu laporan dengan id = 1)
export async function GET() {
    try {
        // Cari laporan dengan id = 1
        const laporanResult = await pool.query(
            'SELECT * FROM laporan WHERE id = $1',
            [1],
        );

        if (laporanResult.rows.length === 0) {
            // Jika belum ada di database, kembalikan data kosong (frontend bisa pakai default sendiri)
            return NextResponse.json(
                {
                    saldoAwal: '0',
                    keteranganList: [],
                    transaksiMasuk: [],
                    transaksiKeluar: [],
                },
                { status: 200 },
            );
        }

        const laporan = laporanResult.rows[0];

        // Ambil transaksi untuk laporan ini
        const [masukResult, keluarResult] = await Promise.all([
            pool.query(
                'SELECT id, deskripsi, nominal, tanggal FROM transaksi_masuk WHERE laporan_id = $1 ORDER BY id ASC',
                [laporan.id],
            ),
            pool.query(
                'SELECT id, deskripsi, nominal, tanggal FROM transaksi_keluar WHERE laporan_id = $1 ORDER BY id ASC',
                [laporan.id],
            ),
        ]);

        const keteranganList: string[] = laporan.keterangan
            ? JSON.parse(laporan.keterangan)
            : [];

        return NextResponse.json(
            {
                saldoAwal: laporan.saldo_awal?.toString() ?? '0',
                keteranganList,
                transaksiMasuk: masukResult.rows.map((row) => ({
                    id: row.id.toString(),
                    deskripsi: row.deskripsi,
                    nominal: Number(row.nominal),
                    tanggal: row.tanggal?.toISOString?.() ?? '',
                })),
                transaksiKeluar: keluarResult.rows.map((row) => ({
                    id: row.id.toString(),
                    deskripsi: row.deskripsi,
                    nominal: Number(row.nominal),
                    tanggal: row.tanggal?.toISOString?.() ?? '',
                })),
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('GET /api/laporan error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data laporan' },
            { status: 500 },
        );
    }
}

// Simpan laporan aktif (hanya boleh oleh admin)
export async function POST(request: NextRequest) {
    const client = await pool.connect();

    try {
        const currentUser = await getCurrentUser();
        requireAdmin(currentUser); // Lempar error jika bukan admin

        const body = (await request.json()) as LaporanPayload;

        const saldoAwalNum = parseFloat(body.saldoAwal || '0') || 0;
        const totalMasuk = body.transaksiMasuk.reduce(
            (sum, t) => sum + (t.nominal || 0),
            0,
        );
        const totalKeluar = body.transaksiKeluar.reduce(
            (sum, t) => sum + (t.nominal || 0),
            0,
        );
        const saldoTotal = saldoAwalNum + totalMasuk - totalKeluar;

        await client.query('BEGIN');

        // Upsert laporan dengan id tetap = 1
        const laporanResult = await client.query(
            `
      INSERT INTO laporan (id, keterangan, saldo_awal, total_masuk, total_keluar, saldo_total)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE
      SET keterangan = EXCLUDED.keterangan,
          saldo_awal = EXCLUDED.saldo_awal,
          total_masuk = EXCLUDED.total_masuk,
          total_keluar = EXCLUDED.total_keluar,
          saldo_total = EXCLUDED.saldo_total
      RETURNING id
    `,
            [
                1,
                JSON.stringify(body.keteranganList || []),
                saldoAwalNum,
                totalMasuk,
                totalKeluar,
                saldoTotal,
            ],
        );

        const laporanId = laporanResult.rows[0].id as number;

        // Hapus transaksi lama untuk laporan ini
        await client.query('DELETE FROM transaksi_masuk WHERE laporan_id = $1', [
            laporanId,
        ]);
        await client.query('DELETE FROM transaksi_keluar WHERE laporan_id = $1', [
            laporanId,
        ]);

        // Insert transaksi masuk baru
        // Biarkan kolom tanggal memakai DEFAULT CURRENT_TIMESTAMP dari database
        for (const t of body.transaksiMasuk) {
            await client.query(
                `
        INSERT INTO transaksi_masuk (deskripsi, nominal, laporan_id)
        VALUES ($1, $2, $3)
      `,
                [t.deskripsi, t.nominal, laporanId],
            );
        }

        // Insert transaksi keluar baru
        // Biarkan kolom tanggal memakai DEFAULT CURRENT_TIMESTAMP dari database
        for (const t of body.transaksiKeluar) {
            await client.query(
                `
        INSERT INTO transaksi_keluar (deskripsi, nominal, laporan_id)
        VALUES ($1, $2, $3)
      `,
                [t.deskripsi, t.nominal, laporanId],
            );
        }

        await client.query('COMMIT');

        return NextResponse.json(
            {
                success: true,
                laporanId,
                saldoAwal: saldoAwalNum.toString(),
                totalMasuk,
                totalKeluar,
                saldoTotal,
            },
            { status: 200 },
        );
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('POST /api/laporan error:', error);
        return NextResponse.json(
            { error: 'Gagal menyimpan data laporan' },
            { status: 500 },
        );
    } finally {
        client.release();
    }
}


