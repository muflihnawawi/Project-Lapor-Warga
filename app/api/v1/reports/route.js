import crypto from 'node:crypto';
import { handle, ok, paged, readForm, Errors, getPagination, pageMeta, isUuid } from '@/lib/server/http';
import { query, queryOne, transaction, uuid } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rateLimit';
import { getFiles, readPhotos, savePhotos, removeFiles } from '@/lib/server/upload';
import { notify } from '@/lib/server/events';
import {
  REPORT_SELECT, buildReportFilters, serializeSummary, serializeDetail, getReportRow, validateReportFields, randomCode,
} from '@/lib/server/reports';

// GET /reports — cakupan data sesuai role pemanggil.
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const sp = new URL(req.url).searchParams;
  const { page, perPage, offset } = getPagination(sp);
  const where = [];
  const params = [];
  if (user.role === 'citizen') { where.push('r.user_id = ?'); params.push(user.id); }
  if (user.role === 'officer') { where.push('r.assigned_officer_id = ?'); params.push(user.id); }
  if (user.role === 'admin' && sp.get('officer_id')) {
    if (!isUuid(sp.get('officer_id'))) throw Errors.validation({ officer_id: ['officer_id tidak valid.'] });
    where.push('r.assigned_officer_id = ?');
    params.push(sp.get('officer_id'));
  }
  buildReportFilters(sp, where, params);
  const w = where.length ? ` AND ${where.join(' AND ')}` : '';
  const order = sp.get('sort') === 'oldest' ? 'ASC' : 'DESC';
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM reports r WHERE r.deleted_at IS NULL${w}`, params);
  const rows = await query(`${REPORT_SELECT}${w} ORDER BY r.created_at ${order} LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  return paged(rows.map(serializeSummary), pageMeta(page, perPage, total));
});

function todayKey() {
  const d = new Date(Date.now() + 7 * 3600000); // tanggal WIB
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function replay(reportId, user) {
  const row = await getReportRow(reportId);
  return ok(await serializeDetail(row, user), 'Laporan berhasil dikirim', 201, { 'Idempotent-Replayed': 'true' });
}

// POST /reports — kirim laporan baru (multipart + Idempotency-Key).
export const POST = handle(async (req) => {
  const user = await requireUser(req, ['citizen']);
  rateLimit(`report:${user.id}`, 10, 60 * 1000);

  const key = (req.headers.get('idempotency-key') || '').trim();
  if (key.length < 8 || key.length > 128) {
    throw Errors.badRequest('Header Idempotency-Key wajib diisi (8-128 karakter)');
  }

  const form = await readForm(req);
  const input = Object.fromEntries(['title', 'category_id', 'description', 'latitude', 'longitude', 'address', 'region'].map((k) => [k, form.get(k)]));

  // Validasi field & foto, kumpulkan semua error field sekaligus.
  let data;
  let fieldErrors = {};
  try { data = await validateReportFields(input); } catch (e) { if (e.code !== 'VALIDATION_ERROR') throw e; fieldErrors = e.errors; }
  const files = getFiles(form);
  if (!files.length) fieldErrors.photos = ['Minimal satu foto bukti wajib dilampirkan.'];
  if (Object.keys(fieldErrors).length) throw Errors.validation(fieldErrors);
  const photos = await readPhotos(files, { min: 1 });

  // Hash isi permintaan untuk mendeteksi kunci sama dengan isi berbeda.
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify([data.title, data.category_id, data.description, data.latitude, data.longitude, data.address, data.region ?? null]));
  for (const p of photos) h.update(p.buffer);
  const requestHash = h.digest('hex');

  const existing = await queryOne('SELECT * FROM idempotency_keys WHERE user_id = ? AND idem_key = ?', [user.id, key]);
  if (existing) {
    if (existing.request_hash !== requestHash) throw Errors.conflict('DUPLICATE_REPORT', 'Idempotency-Key sudah dipakai untuk laporan dengan isi berbeda');
    return replay(existing.report_id, user);
  }

  const reportId = uuid();
  const saved = await savePhotos(photos, reportId, 'evidence');
  try {
    await transaction(async (conn) => {
      const now = new Date();
      const dk = todayKey();
      await query(
        'INSERT INTO report_sequences (date_key, last_value) VALUES (?, LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE last_value = LAST_INSERT_ID(last_value + 1)',
        [dk], conn
      );
      const [{ seq }] = await query('SELECT LAST_INSERT_ID() AS seq', [], conn);
      const reportNumber = `LW-${dk}-${String(seq).padStart(4, '0')}-${randomCode()}`;

      await query(
        `INSERT INTO idempotency_keys (user_id, idem_key, request_hash, report_id, created_at) VALUES (?,?,?,?,?)`,
        [user.id, key, requestHash, reportId, now], conn
      );
      await query(
        `INSERT INTO reports (id, report_number, user_id, category_id, title, description, latitude, longitude, address, region,
          status, visibility, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'submitted','private',?,?)`,
        [reportId, reportNumber, user.id, data.category_id, data.title, data.description, data.latitude, data.longitude, data.address, data.region ?? null, now, now],
        conn
      );
      for (const s of saved) {
        await query('INSERT INTO report_photos (id, report_id, type, url, is_public, created_at) VALUES (?,?,?,?,0,?)', [s.id, reportId, 'evidence', s.url, now], conn);
      }
      await query(
        'INSERT INTO status_histories (id, report_id, from_status, to_status, notes, changed_by, changed_at) VALUES (?,?,NULL,?,?,?,?)',
        [uuid(), reportId, 'submitted', 'Laporan dikirim oleh pelapor.', user.id, now], conn
      );
      await notify(conn, user.id, 'report_submitted', 'Laporan berhasil dikirim',
        `Laporan ${reportNumber} telah kami terima dan akan segera diperiksa.`, { id: reportId, report_number: reportNumber });
    });
  } catch (e) {
    await removeFiles(saved);
    // Dua permintaan bersamaan dengan kunci yang sama: kembalikan laporan pertama.
    if (e.code === 'ER_DUP_ENTRY') {
      const again = await queryOne('SELECT * FROM idempotency_keys WHERE user_id = ? AND idem_key = ?', [user.id, key]);
      if (again) {
        if (again.request_hash !== requestHash) throw Errors.conflict('DUPLICATE_REPORT', 'Laporan ini sudah pernah dikirim');
        return replay(again.report_id, user);
      }
    }
    throw e;
  }

  const row = await getReportRow(reportId);
  return ok(await serializeDetail(row, user), 'Laporan berhasil dikirim', 201);
});
