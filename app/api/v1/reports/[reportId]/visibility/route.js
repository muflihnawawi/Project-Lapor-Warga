import { handle, ok, readJson, Errors, isUuid, clientIp } from '@/lib/server/http';
import { query, transaction } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';
import { findAccessibleReport, serializeDetail, getReportRow } from '@/lib/server/reports';

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const r = await findAccessibleReport(admin, params.reportId);
  const b = await readJson(req);
  const errors = {};
  if (!['private', 'public'].includes(b.visibility)) errors.visibility = ['Visibilitas harus private atau public.'];
  let ids;
  if (b.public_photo_ids !== undefined) {
    if (!Array.isArray(b.public_photo_ids) || !b.public_photo_ids.every(isUuid)) errors.public_photo_ids = ['Daftar foto tidak valid.'];
    else ids = b.public_photo_ids;
  }
  if (Object.keys(errors).length) throw Errors.validation(errors);

  await transaction(async (conn) => {
    await query('UPDATE reports SET visibility = ?, updated_at = ? WHERE id = ?', [b.visibility, new Date(), r.id], conn);
    if (ids) {
      await query('UPDATE report_photos SET is_public = 0 WHERE report_id = ?', [r.id], conn);
      if (ids.length) await query('UPDATE report_photos SET is_public = 1 WHERE report_id = ? AND id IN (?)', [r.id, ids], conn);
    }
    await audit(conn, admin.id, 'report.visibility_changed', 'report', r.id, { visibility: b.visibility, public_photo_ids: ids }, clientIp(req));
  });
  return ok(await serializeDetail(await getReportRow(r.id), admin), 'Visibilitas laporan diperbarui');
});
