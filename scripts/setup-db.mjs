// Membuat database, tabel, dan data awal (kategori + akun demo).
// Jalankan: npm run db:setup
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const root = process.cwd();
for (const file of ['.env.local', '.env']) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};
const dbName = process.env.DB_NAME || 'laporwarga';
if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error('DB_NAME tidak valid');

const now = new Date();
let conn;
try {
  conn = await mysql.createConnection({ ...cfg, multipleStatements: true, timezone: 'Z' });
} catch (e) {
  console.error('✖ Tidak dapat terhubung ke MySQL. Pastikan MySQL di XAMPP Control Panel sudah di-Start.');
  console.error('  Detail:', e.message);
  process.exit(1);
}
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.query(`USE \`${dbName}\``);
await conn.query(fs.readFileSync(path.join(root, 'database', 'schema.sql'), 'utf8'));
console.log(`✔ Database "${dbName}" dan tabel siap`);

// Migrasi: beri kode acak 4 karakter pada nomor laporan format lama (LW-YYYYMMDD-0001 -> LW-YYYYMMDD-0001-K7QX)
// agar nomor laporan tidak bisa ditebak berurutan. Aman dijalankan berulang.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = () => Array.from({ length: 4 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
const [legacy] = await conn.query("SELECT id, report_number FROM reports WHERE report_number REGEXP '^LW-[0-9]{8}-[0-9]{4,}$'");
for (const r of legacy) {
  const next = `${r.report_number}-${code()}`;
  await conn.beginTransaction();
  await conn.query('UPDATE reports SET report_number = ? WHERE id = ?', [next, r.id]);
  await conn.query(
    'UPDATE notifications SET report_number = ?, message = REPLACE(message, ?, ?) WHERE report_id = ?',
    [next, r.report_number, next, r.id]
  );
  await conn.commit();
  console.log(`  ↳ ${r.report_number} → ${next}`);
}
if (legacy.length) console.log(`✔ ${legacy.length} nomor laporan lama diberi kode acak`);

const categories = [
  ['Infrastruktur Jalan', 'Jalan berlubang, jalan rusak'],
  ['Penerangan Jalan', 'Lampu jalan mati'],
  ['Drainase', 'Saluran air tersumbat'],
  ['Kebersihan', 'Sampah menumpuk'],
  ['Fasilitas Umum', 'Bangku, taman, fasilitas rusak'],
  ['Lainnya', 'Permasalahan lingkungan lain'],
];
for (const [name, description] of categories) {
  await conn.query(
    'INSERT IGNORE INTO categories (id, name, description, is_active, created_at, updated_at) VALUES (?,?,?,1,?,?)',
    [crypto.randomUUID(), name, description, now, now]
  );
}
console.log('✔ Kategori awal ditambahkan');

const users = [
  ['Administrator', 'admin@laporwarga.test', 'admin'],
  ['Andi Petugas', 'petugas@laporwarga.test', 'officer'],
  ['Sari Petugas', 'petugas2@laporwarga.test', 'officer'],
  ['Budi Santoso', 'warga@laporwarga.test', 'citizen'],
];
const hash = await bcrypt.hash('password123', 10);
for (const [name, email, role] of users) {
  await conn.query(
    'INSERT IGNORE INTO users (id, name, email, phone, password_hash, role, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,?)',
    [crypto.randomUUID(), name, email, null, hash, role, now, now]
  );
}
console.log('✔ Akun demo (password: password123):');
for (const [, email, role] of users) console.log(`   - ${role.padEnd(8)} ${email}`);
await conn.end();
