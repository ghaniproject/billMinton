CREATE TYPE user_role AS ENUM ('admin', 'user');

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger untuk update updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default admin: username=admin, password=admin123
-- Default user: username=user, password=user123
-- Password hash dibuat dengan: node scripts/create-user.js <username> <password> <role>
INSERT INTO users (username, password, role) VALUES 
('admin', '$2b$10$/LKrGfSCuQVG.PXwuIXd.eZfxC5kcLVcZhYRXF1OUinCw0DLcm7N2', 'admin'),
('user', '$2b$10$RrFPOqhEEw0II30gPflK8ev51csS5l7IlM.rnd0ImHiaCLD4EX3Se', 'user')
ON CONFLICT (username) DO NOTHING;

-- Table untuk menyimpan laporan (opsional, jika ingin simpan ke database)
CREATE TABLE IF NOT EXISTS laporan (
  id SERIAL PRIMARY KEY,
  keterangan TEXT,
  saldo_awal DECIMAL(15,2) DEFAULT 0,
  total_masuk DECIMAL(15,2) DEFAULT 0,
  total_keluar DECIMAL(15,2) DEFAULT 0,
  saldo_total DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_laporan_updated_at BEFORE UPDATE ON laporan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table untuk transaksi masuk
CREATE TABLE IF NOT EXISTS transaksi_masuk (
  id SERIAL PRIMARY KEY,
  deskripsi VARCHAR(255) NOT NULL,
  nominal DECIMAL(15,2) NOT NULL,
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  laporan_id INTEGER,
  FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE
);

-- Table untuk transaksi keluar
CREATE TABLE IF NOT EXISTS transaksi_keluar (
  id SERIAL PRIMARY KEY,
  deskripsi VARCHAR(255) NOT NULL,
  nominal DECIMAL(15,2) NOT NULL,
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  laporan_id INTEGER,
  FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE
);
