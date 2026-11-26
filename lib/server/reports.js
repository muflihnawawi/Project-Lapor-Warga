import { query, queryOne } from './db';
import { Errors, isUuid } from './http';
import { toIso } from './auth';

import crypto from 'node:crypto';

// Nomor laporan: LW-YYYYMMDD-0001-K7QX. Kode acak di akhir membuat nomor tidak dapat ditebak berurutan.
// Huruf/angka yang mirip (0/O, 1/I/L) tidak dipakai agar mudah diketik ulang oleh warga.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REPORT_NUMBER_RE = /^LW-[0-9]{8}-[0-9]{4,}-[A-Z2-9]{4}$/;
export const LEGACY_NUMBER_RE = /^LW-[0-9]{8}-[0-9]{4,}$/;

export function randomCode(length = 4) {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return s;
}

export const STATUSES = ['submitted', 'under_review', 'verified', 'in_progress', 'resolved', 'rejected'];

export const STATUS_LABEL = {
  submitted: 'Dikirim',
  under_review: 'Sedang Diperiksa',
  verified: 'Terverifikasi',
  in_progress: 'Sedang Ditangani',
  resolved: 'Selesai',
  rejected: 'Ditolak',
};

/** Alur status: dari -> ke -> role yang berwenang. */
export const TRANSITIONS = {
  submitted: { under_review: 'admin' },
  under_review: { verified: 'admin', rejected: 'admin' },
  verified: { in_progress: 'officer' },
  in_progress: { resolved: 'officer' },
};

export const REPORT_SELECT = `
  SELECT r.*, c.name AS category_name,
         u.name AS reporter_name, u.role AS reporter_role,
         o.name AS officer_name, o.role AS officer_role,
         (SELECT p.url FROM report_photos p WHERE p.report_id = r.id AND p.type = 'evidence' AND p.deleted_at IS NULL
          ORDER BY p.created_at LIMIT 1) AS thumbnail_url
  FROM reports r
  JOIN categories c ON c.id = r.category_id
  JOIN users u ON u.id = r.user_id
  LEFT JOIN users o ON o.id = r.assigned_officer_id
  WHERE r.deleted_at IS NULL`;

export async function getReportRow(id, conn) {
  if (!isUuid(id)) return null;
  return queryOne(`${REPORT_SELECT} AND r.id = ?`, [id], conn);
}

/** Apakah user berhak melihat detail lengkap laporan (pemilik / petugas ditugaskan / admin). */
export function canAccess(user, r) {
  if (user.role === 'admin') return true;
  if (user.role === 'citizen') return r.user_id === user.id;
  if (user.role === 'officer') return r.assigned_officer_id === user.id;
  return false;
}

/** Ambil laporan yang boleh diakses user; selain itu 404 agar keberadaannya tidak terungkap. */
export async function findAccessibleReport(user, id, conn) {
  const r = await getReportRow(id, conn);
  if (!r || !canAccess(user, r)) throw Errors.notFound('Laporan tidak ditemukan');
  return r;
}

export async function getPhotos(reportIds, { onlyPublic = false } = {}) {
  if (!reportIds.length) return [];
  return query(
    `SELECT * FROM report_photos WHERE report_id IN (?) AND deleted_at IS NULL ${onlyPublic ? 'AND is_public = 1' : ''}
     ORDER BY created_at`,
    [reportIds]
  );
}

export const serializePhoto = (p) => ({
  id: p.id,
  url: p.url,
  type: p.type,
  is_public: !!p.is_public,
  created_at: toIso(p.created_at),
});

const brief = (id, name, role) => (id ? { id, name, role } : null);

export function serializeSummary(r) {
  return {
    id: r.id,
    report_number: r.report_number,
    title: r.title,
    category: { id: r.category_id, name: r.category_name },
    status: r.status,
    visibility: r.visibility,
    thumbnail_url: r.thumbnail_url || null,
    address: r.address,
    region: r.region,
    assigned_officer: brief(r.assigned_officer_id, r.officer_name, r.officer_role),
    created_at: toIso(r.created_at),
  };
}

export async function serializeDetail(r, user) {
  const photos = await getPhotos([r.id]);
  const out = {
    id: r.id,
    report_number: r.report_number,
    title: r.title,
    description: r.description,
    category: { id: r.category_id, name: r.category_name },
    photos: photos.map(serializePhoto),
    location: { latitude: r.latitude, longitude: r.longitude, address: r.address, region: r.region },
    status: r.status,
    visibility: r.visibility,
    rejection_reason: r.rejection_reason,
    assigned_officer: brief(r.assigned_officer_id, r.officer_name, r.officer_role),
    created_at: toIso(r.created_at),
    updated_at: toIso(r.updated_at),
    resolved_at: toIso(r.resolved_at),
  };
  // Identitas pelapor hanya untuk pemilik dan admin (tanpa email/telepon).
  if (user && (user.role === 'admin' || user.id === r.user_id)) {
    out.reporter = brief(r.user_id, r.reporter_name, r.reporter_role);
  }
  return out;
}

export function serializePublic(r, photos) {
  return {
    report_number: r.report_number,
    title: r.title,
    category: { id: r.category_id, name: r.category_name },
    description: r.description,
    location: { latitude: r.latitude, longitude: r.longitude, address: r.address, region: r.region },
    photos: photos.map(serializePhoto),
    status: r.status,
    created_at: toIso(r.created_at),
  };
}

/** Bangun klausa filter umum untuk daftar laporan. */
export function buildReportFilters(sp, where, params) {
  const search = sp.get('search');
  if (search) {
    where.push('(r.title LIKE ? OR r.report_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const categoryId = sp.get('category_id');
  if (categoryId) {
    if (!isUuid(categoryId)) throw Errors.validation({ category_id: ['category_id tidak valid.'] });
    where.push('r.category_id = ?');
    params.push(categoryId);
  }
  const status = sp.get('status');
  if (status) {
    if (!STATUSES.includes(status)) throw Errors.validation({ status: ['Status tidak valid.'] });
    where.push('r.status = ?');
    params.push(status);
  }
  const region = sp.get('region');
  if (region) {
    where.push('r.region LIKE ?');
    params.push(`%${region}%`);
  }
  const dateFrom = sp.get('date_from');
  if (dateFrom) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) throw Errors.validation({ date_from: ['Format tanggal YYYY-MM-DD.'] });
    where.push('r.created_at >= ?');
    params.push(new Date(`${dateFrom}T00:00:00+07:00`));
  }
  const dateTo = sp.get('date_to');
  if (dateTo) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) throw Errors.validation({ date_to: ['Format tanggal YYYY-MM-DD.'] });
    where.push('r.created_at <= ?');
    params.push(new Date(`${dateTo}T23:59:59.999+07:00`));
  }
}

/** Validasi field laporan (dipakai saat kirim & ubah). */
export async function validateReportFields(input, { partial = false } = {}) {
  const errors = {};
  const data = {};
  const has = (k) => input[k] !== undefined && input[k] !== null;
  const str = (k) => (has(k) ? String(input[k]).trim() : undefined);

  const check = (k, label, max, required = true) => {
    const v = str(k);
    if (v === undefined || v === '') {
      if (!partial && required) errors[k] = [`${label} wajib diisi.`];
      else if (partial && v === '' && required) errors[k] = [`${label} tidak boleh kosong.`];
      else if (v === '') data[k] = null;
      return;
    }
    if (max && v.length > max) errors[k] = [`${label} maksimal ${max} karakter.`];
    else data[k] = v;
  };
  check('title', 'Judul laporan', 150);
  check('description', 'Deskripsi', 5000);
  check('address', 'Alamat lokasi', 255);
  check('region', 'Wilayah', 100, false);

  const cat = str('category_id');
  if (cat === undefined || cat === '') {
    if (!partial || cat === '') errors.category_id = ['Kategori wajib dipilih.'];
  } else {
    const row = isUuid(cat) ? await queryOne('SELECT id FROM categories WHERE id = ? AND is_active = 1', [cat]) : null;
    if (!row) errors.category_id = ['Kategori tidak ditemukan atau tidak aktif.'];
    else data.category_id = cat;
  }

  for (const [k, label, min, max] of [['latitude', 'Latitude', -90, 90], ['longitude', 'Longitude', -180, 180]]) {
    const v = str(k);
    if (v === undefined || v === '') {
      if (!partial || v === '') errors[k] = ['Lokasi kejadian wajib ditentukan.'];
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) errors[k] = [`${label} harus antara ${min} dan ${max}.`];
    else data[k] = n;
  }

  if (Object.keys(errors).length) throw Errors.validation(errors);
  return data;
}
