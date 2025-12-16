import { Pool } from 'pg';

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

const pool = new Pool(dbConfig);

// Test Koneksi
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
