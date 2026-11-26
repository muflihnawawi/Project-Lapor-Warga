# LaporWarga

Platform pelaporan masalah lingkungan & fasilitas umum — **Laporkan · Pantau · Selesaikan**.
Dibangun dengan **Next.js 14 (App Router)**, **MySQL/MariaDB (XAMPP)**, dan **Tailwind CSS**, mengikuti
`PRD_LaporWarga.pdf`, `API-Specification-LaporWarga.pdf`, dan `openapi.yaml`.

## Menjalankan

1. Buka **XAMPP Control Panel** → **Start MySQL** (Apache tidak diperlukan).
2. Salin konfigurasi lalu sesuaikan bila perlu (default XAMPP: user `root` tanpa password):
   ```bash
   copy .env.example .env.local      # Windows (atau: cp .env.example .env.local)
   ```
   Ganti `JWT_SECRET` dengan string acak panjang.
3. Instal dependensi & siapkan database (membuat DB `laporwarga`, tabel, kategori, dan akun demo):
   ```bash
   npm install
   npm run db:setup
   ```
4. Jalankan:
   ```bash
   npm run dev          # mode pengembangan → http://localhost:3000
   # atau produksi:
   npm run build && npm start
   ```
   > Jangan menjalankan `npm run dev` bersamaan dengan `npm start` — keduanya memakai folder `.next` yang sama.

### Akun demo (password `password123`)

| Role | Email |
|---|---|
| Admin | admin@laporwarga.test |
| Petugas | petugas@laporwarga.test, petugas2@laporwarga.test |
| Masyarakat | warga@laporwarga.test (atau daftar sendiri di `/register`) |

## Tampilan per role

| Role | Tema | Menu |
|---|---|---|
| Masyarakat | Hijau, sidebar terang + navigasi bawah di ponsel | Beranda, Buat Laporan, Laporan Saya, Laporan Publik, Notifikasi, Profil |
| Petugas | Biru tua "Panel Petugas" | Dashboard tugas, Tugas Saya (mulai tangani / selesaikan + foto bukti) |
| Admin | Indigo/slate "Panel Administrator" | Dashboard statistik, Semua Laporan (periksa, verifikasi/tolak, tugaskan/ganti petugas, visibilitas), Pengguna, Kategori, Statistik & Ekspor PDF/Excel, Audit Log |

## Halaman depan (tanpa login)

| Fitur | Sumber data |
|---|---|
| Cek status lewat nomor laporan | `GET /api/v1/landing/track/{nomor}`: hanya status & tanggal |
| Statistik transparansi | `GET /api/v1/landing/stats`: angka gabungan |
| Sudah diselesaikan (foto sebelum/sesudah) | `GET /api/v1/landing/resolved`: hanya laporan **publik** + foto yang ditandai layak tampil |
| Peta sebaran | `GET /api/v1/landing/map`: hanya laporan **publik** |
| Pengumuman | `GET /api/v1/announcements`: dikelola admin di menu **Pengumuman** |
| Panduan & FAQ | statis |

Endpoint di atas adalah tambahan di luar `openapi.yaml` dan melonggarkan Asumsi no. 2 (laporan publik hanya untuk pengguna login) khusus untuk halaman depan.
Agar laporan muncul di "Sudah diselesaikan" dan peta, admin harus membuka laporan → **Atur visibilitas publik** → pilih **Publik** dan centang foto (termasuk foto penyelesaian).

## Struktur

```
app/
  api/v1/...          # 43 endpoint REST sesuai openapi.yaml
  (auth)/             # login, register
  (app)/              # halaman setelah login (dashboard, laporan, publik, notifikasi, profil, admin/*)
  storage/[...path]   # menyajikan foto yang diunggah
components/           # UI (AppShell per role, peta Leaflet, galeri, timeline, komentar, aksi per role)
lib/server/           # koneksi DB, JWT, validasi, upload, notifikasi, audit log
lib/client/           # pemanggil API (auto refresh token), konstanta
database/schema.sql   # skema MySQL
scripts/setup-db.mjs  # pembuatan DB + data awal
storage/              # foto unggahan (tidak di-commit)
```

## Catatan implementasi

- Alur status: `submitted → under_review → verified → in_progress → resolved`, atau `under_review → rejected` (alasan wajib).
  Transisi di luar alur → `422 INVALID_STATUS_TRANSITION`; role tak berwenang → `403 FORBIDDEN_ROLE`.
- Nomor laporan berformat `LW-YYYYMMDD-0001-K7QX`: kode acak 4 karakter di akhir mencegah nomor ditebak berurutan
  (berbeda dari pola di `openapi.yaml`, yang perlu disesuaikan menjadi `^LW-[0-9]{8}-[0-9]{4,}-[A-Z2-9]{4}$`).
  `npm run db:setup` otomatis memberi kode pada nomor format lama.
- `POST /reports` wajib header `Idempotency-Key`; laporan, foto, dan riwayat awal disimpan dalam satu transaksi.
- Laporan yang tidak boleh dilihat dijawab `404`. Identitas pelapor tidak pernah tampil di laporan publik.
- Waktu disimpan UTC dan dikembalikan dalam format ISO 8601 `+07:00` (WIB).
- Foto disajikan lewat URL acak (UUID) tanpa pemeriksaan login, karena tag `<img>` tidak dapat mengirim token.
- Rate limit disimpan di memori (cukup untuk satu server).
- Peta memakai OpenStreetMap; tombol "Isi alamat dari peta" memakai Nominatim (butuh internet).
