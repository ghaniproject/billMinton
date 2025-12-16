# Setup Aplikasi Laporan Badminton dengan Autentikasi

## Persyaratan

- Node.js 18+
- PostgreSQL 15
- npm atau yarn
- pgAdmin (opsional, untuk GUI) atau psql (command line)

## Langkah Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database PostgreSQL

#### a. Buat Database di pgAdmin

1. Buka pgAdmin
2. Connect ke PostgreSQL server
3. Klik kanan pada "Databases" → "Create" → "Database"
4. Nama database: `laporan_badminton`
5. Klik "Save"

#### b. Import Schema

**Opsi 1: Via pgAdmin Query Tool**

1. Klik kanan database `laporan_badminton` → "Query Tool"
2. Buka file `database/schema.sql`
3. Copy semua isinya dan paste ke Query Tool
4. Klik "Execute" (F5)

**Opsi 2: Via psql (Command Line)**

```bash
# Connect ke PostgreSQL
psql -U postgres

# Buat database
CREATE DATABASE laporan_badminton;

# Connect ke database
\c laporan_badminton

# Import schema
\i database/schema.sql
```

**Opsi 3: Import Bertahap**

1. Import `database/01-create-tables.sql` dulu
2. Lalu import `database/02-insert-users.sql`

### 3. Buat User dengan Password Hash

Untuk membuat user baru dengan password yang sudah di-hash:

```bash
# Buat admin
node scripts/create-user.js admin admin123 admin

# Buat user biasa
node scripts/create-user.js user user123 user
```

Script akan menampilkan SQL query yang bisa langsung dijalankan di pgAdmin atau psql.

### 4. Konfigurasi Environment Variables

Buat file `.env.local` di root project:

```env
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=laporan_badminton

# JWT Secret (ubah dengan secret key yang kuat)
JWT_SECRET=your-secret-key-change-this-in-production

# Node Environment
NODE_ENV=development
```

**Penting:** Ganti `DB_PASSWORD` dengan password PostgreSQL Anda, dan `JWT_SECRET` dengan string random yang kuat.

### 5. Jalankan Aplikasi

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

## Default Login Credentials

Setelah setup database:

- **Admin:**

  - Username: `admin`
  - Password: `admin123`
  - Akses: Bisa edit, tambah, dan hapus data

- **User:**
  - Username: `user`
  - Password: `user123`
  - Akses: Hanya bisa melihat data (view only)

**⚠️ PENTING:** Ganti password default setelah login pertama kali!

## Fitur Role-Based Access

### Admin

- ✅ Login/Logout
- ✅ Lihat semua data
- ✅ Tambah keterangan
- ✅ Hapus keterangan
- ✅ Edit saldo awal
- ✅ Tambah uang masuk
- ✅ Hapus uang masuk
- ✅ Tambah uang keluar
- ✅ Hapus uang keluar
- ✅ Download PDF

### User

- ✅ Login/Logout
- ✅ Lihat semua data
- ✅ Download PDF
- ❌ Tidak bisa edit/tambah/hapus apapun

## Troubleshooting

### Error: "Cannot connect to database"

- Pastikan PostgreSQL sudah running
- Cek konfigurasi di `.env.local`
- Pastikan database `laporan_badminton` sudah dibuat
- Pastikan user PostgreSQL memiliki akses ke database
- Cek firewall jika menggunakan remote connection

### Error: "Table doesn't exist"

- Pastikan sudah import `database/schema.sql`
- Cek apakah semua table sudah dibuat
- Pastikan ENUM type `user_role` sudah dibuat

### Error: "Invalid token" atau "Unauthorized"

- Pastikan sudah login
- Cek apakah cookie `auth-token` ada di browser
- Coba logout dan login lagi

### Error: "relation does not exist"

- Pastikan sudah connect ke database yang benar
- Pastikan schema sudah diimport dengan benar
- Cek apakah ENUM type sudah dibuat sebelum membuat table

## Menambah User Baru

1. Jalankan script:

```bash
node scripts/create-user.js <username> <password> <role>
```

2. Copy SQL query yang ditampilkan
3. Jalankan query tersebut di pgAdmin atau psql

Atau langsung insert ke database dengan password hash yang sudah dibuat.

## Perbedaan PostgreSQL dengan MySQL

- PostgreSQL menggunakan `SERIAL` untuk auto-increment (bukan `AUTO_INCREMENT`)
- PostgreSQL menggunakan `$1, $2` untuk parameterized queries (bukan `?`)
- PostgreSQL menggunakan `ENUM` type yang harus dibuat terlebih dahulu
- PostgreSQL menggunakan `TIMESTAMP` (bukan `DATETIME`)
- PostgreSQL menggunakan `ON CONFLICT` untuk handle duplicate (bukan `INSERT IGNORE`)
