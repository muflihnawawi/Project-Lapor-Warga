import { handle, ok, readJson, Errors, clientIp } from '@/lib/server/http';
import { query, transaction } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';
import { findAccessibleReport, serializeDetail, getReportRow, validateReportFields } from '@/lib/server/reports';

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findAccessibleReport(user, params.reportId);
  return ok(await serializeDetail(r, user));
});

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findAccessibleReport(user, params.reportId);
  if (user.role !== 'citizen') throw Errors.forbiddenRole('Hanya pemilik laporan yang dapat mengubah laporan');
  if (r.status !== 'submitted') throw Errors.conflict('REPORT_NOT_EDITABLE', 'Laporan tidak lagi berstatus submitted sehingga tidak dapat diubah');
  const data = await validateReportFields(await readJson(req), { partial: true });
  const keys = Object.keys(data);
  if (!keys.length) throw Errors.validation({ title: ['Tidak ada data yang diubah.'] });
  const res = await query(
    `UPDATE reports SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND status = 'submitted'`,
    [...keys.map((k) => data[k]), new Date(), r.id]
  );
  if (!res.affectedRows) throw Errors.conflict('REPORT_NOT_EDITABLE', 'Laporan tidak lagi berstatus submitted');
  return ok(await serializeDetail(await getReportRow(r.id), user), 'Laporan berhasil diperbarui');
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findAccessibleReport(user, params.reportId);
  if (user.role === 'officer') throw Errors.forbiddenRole('Petugas tidak dapat menghapus laporan');
  if (user.role === 'citizen' && r.status !== 'submitted') {
    throw Errors.conflict('REPORT_NOT_EDITABLE', 'Laporan yang sudah diproses tidak dapat dihapus');
  }
  await transaction(async (conn) => {
    await query('UPDATE reports SET deleted_at = ?, updated_at = ? WHERE id = ?', [new Date(), new Date(), r.id], conn);
    await audit(conn, user.id, 'report.deleted', 'report', r.id, { report_number: r.report_number, status: r.status }, clientIp(req));
  });
  return ok(undefined, 'Laporan berhasil dihapus');
});
