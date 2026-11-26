import { handle, ok, Errors } from '@/lib/server/http';
import { queryOne } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { REPORT_SELECT, REPORT_NUMBER_RE, getPhotos, serializePublic } from '@/lib/server/reports';

export const GET = handle(async (req, { params }) => {
  await requireUser(req);
  const number = String(params.reportNumber || '').toUpperCase();
  if (!REPORT_NUMBER_RE.test(number)) throw Errors.notFound('Laporan publik tidak ditemukan');
  const r = await queryOne(`${REPORT_SELECT} AND r.report_number = ? AND r.visibility = 'public'`, [number]);
  if (!r) throw Errors.notFound('Laporan publik tidak ditemukan');
  const photos = await getPhotos([r.id], { onlyPublic: true });
  // Sertakan id internal agar klien dapat memuat komentar; identitas pelapor tetap tidak dikirim.
  return ok({ id: r.id, ...serializePublic(r, photos) });
});
