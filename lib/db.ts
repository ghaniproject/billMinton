import { Pool } from 'pg';

// Ambil env mentah dulu supaya bisa kita debug sumbernya
const rawSupabaseUrl = process.env.SUPABASE_DB_URL;
const rawDatabaseUrl = process.env.DATABASE_URL;

const connectionString = rawSupabaseUrl || rawDatabaseUrl || '';

// Log ringan untuk cek dari mana koneksi diambil (tanpa bocorin password)
if (process.env.NODE_ENV === 'production') {
  // Di Vercel log-nya akan tampil di Function logs
  // Ini sangat membantu debug kasus seperti sekarang (env tidak terbaca)
  // Jangan log connectionString penuh supaya aman.
  // eslint-disable-next-line no-console
  console.log(
    '[db] selected config source:',
    rawSupabaseUrl ? 'SUPABASE_DB_URL' : rawDatabaseUrl ? 'DATABASE_URL' : 'fallback-local',
  );
}

let pool: Pool;

if (connectionString) {
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  // Mode lama: konek ke Postgres lokal / manual
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    database: process.env.DB_NAME || 'laporan_badminton',
    max: 20, // Maximum
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  if (typeof dbConfig.password !== 'string') {
    dbConfig.password = '';
  }

  pool = new Pool(dbConfig);
}

// Test Koneksi
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
