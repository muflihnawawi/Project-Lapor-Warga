import { handle, ok, Errors, assertUuid } from '@/lib/server/http';
import { query, queryOne, transaction } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { findAccessibleReport } from '@/lib/server/reports';

export const DELETE = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findAccessibleReport(user, params.reportId);
  if (user.role !== 'citizen') throw Errors.forbiddenRole('Hanya pemilik laporan yang dapat menghapus foto');
  if (r.status !== 'submitted') throw Errors.conflict('REPORT_NOT_EDITABLE', 'Laporan tidak lagi berstatus submitted');
  const photo = await queryOne(
    "SELECT * FROM report_photos WHERE id = ? AND report_id = ? AND type = 'evidence' AND deleted_at IS NULL",
    [assertUuid(params.photoId), r.id]
  );
  if (!photo) throw Errors.notFound('Foto tidak ditemukan');

  await transaction(async (conn) => {
    const [{ n }] = await query(
      "SELECT COUNT(*) AS n FROM report_photos WHERE report_id = ? AND type = 'evidence' AND deleted_at IS NULL FOR UPDATE",
      [r.id], conn
    );
    if (n <= 1) throw Errors.validation({ photos: ['Laporan harus memiliki minimal satu foto bukti.'] });
    await query('UPDATE report_photos SET deleted_at = ? WHERE id = ?', [new Date(), photo.id], conn);
  });
  return ok(undefined, 'Foto berhasil dihapus');
});
