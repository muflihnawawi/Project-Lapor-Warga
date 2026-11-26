import { handle, ok, Errors, clientIp } from '@/lib/server/http';
import { query, queryOne } from '@/lib/server/db';
import { toIso } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rateLimit';
import { REPORT_NUMBER_RE, LEGACY_NUMBER_RE } from '@/lib/server/reports';

export const dynamic = 'force-dynamic';

// Cek status lewat nomor laporan tanpa login.
// Sengaja hanya mengembalikan status dan tanggal: tanpa judul, foto, lokasi, catatan, atau identitas.
export const GET = handle(async (req, { params }) => {
  rateLimit(`track:${clientIp(req)}`, 20, 60 * 1000);
  const number = String(params.reportNumber || '').trim().toUpperCase();
  if (LEGACY_NUMBER_RE.test(number)) {
    throw Errors.validation(
      { report_number: ['Kode 4 karakter di akhir nomor belum diisi.'] },
      'Masukkan nomor laporan lengkap, termasuk 4 karakter kode di akhir (contoh: LW-20261126-0001-K7QX).'
    );
  }
  if (!REPORT_NUMBER_RE.test(number)) {
    throw Errors.validation({ report_number: ['Format tidak valid.'] }, 'Format nomor laporan: LW-YYYYMMDD-0001-XXXX');
  }
  const r = await queryOne('SELECT id, report_number, status, created_at, resolved_at FROM reports WHERE report_number = ? AND deleted_at IS NULL', [number]);
  if (!r) throw Errors.notFound('Nomor laporan tidak ditemukan');
  const history = await query('SELECT to_status, changed_at FROM status_histories WHERE report_id = ? ORDER BY changed_at ASC', [r.id]);
  return ok({
    report_number: r.report_number,
    status: r.status,
    created_at: toIso(r.created_at),
    resolved_at: toIso(r.resolved_at),
    history: history.map((h) => ({ status: h.to_status, changed_at: toIso(h.changed_at) })),
  });
});
