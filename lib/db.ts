import { Pool } from 'pg';

// Konfigurasi database PostgreSQL
// Pastikan semua nilai adalah string
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
  database: process.env.DB_NAME || 'laporan_badminton',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Pastikan password adalah string (PostgreSQL memerlukan string, bukan undefined)
if (typeof dbConfig.password !== 'string') {
  dbConfig.password = '';
}

const pool = new Pool(dbConfig);

// Test connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
