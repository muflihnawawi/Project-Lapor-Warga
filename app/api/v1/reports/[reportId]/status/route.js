import { handle, ok, readJson, readForm, Errors, ApiError, clientIp } from '@/lib/server/http';
import { query, queryOne, transaction, uuid } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { notify, audit } from '@/lib/server/events';
import { getFiles, readPhotos, savePhotos, removeFiles } from '@/lib/server/upload';
import { findAccessibleReport, STATUSES, TRANSITIONS, STATUS_LABEL } from '@/lib/server/reports';
import { getHistory } from '@/lib/server/history';

const NOTIF = {
  verified: ['report_verified', 'Laporan diverifikasi'],
  rejected: ['report_rejected', 'Laporan ditolak'],
  resolved: ['report_resolved', 'Laporan selesai ditangani'],
};

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(req);
  if (user.role === 'citizen') throw Errors.forbiddenRole('Masyarakat tidak dapat mengubah status laporan');
  const report = await findAccessibleReport(user, params.reportId);

  const isMultipart = (req.headers.get('content-type') || '').includes('multipart/form-data');
  let body;
  let files = [];
  if (isMultipart) {
    const form = await readForm(req);
    body = { status: form.get('status'), notes: form.get('notes'), reason: form.get('reason') };
    files = getFiles(form);
  } else {
    body = await readJson(req);
  }
  const to = body.status;
  const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null;
  const reason = body.reason ? String(body.reason).trim().slice(0, 2000) : null;

  if (!STATUSES.includes(to)) throw Errors.validation({ status: ['Status tidak valid.'] });
  const from = report.status;
  const requiredRole = TRANSITIONS[from]?.[to];
  if (!requiredRole) {
    throw new ApiError(422, 'INVALID_STATUS_TRANSITION', `Status tidak dapat diubah dari ${from} ke ${to}`);
  }
  if (user.role !== requiredRole) throw Errors.forbiddenRole('Role Anda tidak berwenang melakukan perubahan status ini');
  if (to === 'in_progress' && report.assigned_officer_id !== user.id) {
    throw Errors.forbiddenOwnership('Hanya petugas yang ditugaskan yang dapat memulai penanganan');
  }
  if (to === 'rejected' && !reason) throw Errors.validation({ reason: ['Alasan penolakan wajib diisi.'] });
  if (files.length && to !== 'resolved') throw Errors.validation({ photos: ['Foto hanya dapat dilampirkan saat menyelesaikan laporan.'] });

  const photos = files.length ? await readPhotos(files) : [];
  const saved = photos.length ? await savePhotos(photos, report.id, 'resolution') : [];
  const historyId = uuid();
  try {
    await transaction(async (conn) => {
      const locked = await queryOne('SELECT status, assigned_officer_id FROM reports WHERE id = ? FOR UPDATE', [report.id], conn);
      if (locked.status !== from) {
        throw new ApiError(422, 'INVALID_STATUS_TRANSITION', `Status tidak dapat diubah dari ${locked.status} ke ${to}`);
      }
      if (user.role === 'officer' && locked.assigned_officer_id !== user.id) throw Errors.notFound('Laporan tidak ditemukan');
      const now = new Date();
      await query(
        `UPDATE reports SET status = ?, updated_at = ?, rejection_reason = IF(? = 'rejected', ?, rejection_reason),
         resolved_at = IF(? = 'resolved', ?, resolved_at) WHERE id = ?`,
        [to, now, to, reason, to, now, report.id], conn
      );
      await query(
        'INSERT INTO status_histories (id, report_id, from_status, to_status, notes, reason, changed_by, changed_at) VALUES (?,?,?,?,?,?,?,?)',
        [historyId, report.id, from, to, notes, to === 'rejected' ? reason : null, user.id, now], conn
      );
      for (const s of saved) {
        await query(
          'INSERT INTO report_photos (id, report_id, status_history_id, type, url, is_public, created_at) VALUES (?,?,?,?,?,0,?)',
          [s.id, report.id, historyId, 'resolution', s.url, now], conn
        );
      }
      const [type, title] = NOTIF[to] || ['status_changed', 'Status laporan diperbarui'];
      let message = `Laporan ${report.report_number} kini berstatus "${STATUS_LABEL[to]}".`;
      if (to === 'rejected') message += ` Alasan: ${reason}`;
      await notify(conn, report.user_id, type, title, message, report);
      await audit(conn, user.id, 'report.status_changed', 'report', report.id, { from, to }, clientIp(req));
    });
  } catch (e) {
    await removeFiles(saved);
    throw e;
  }
  const [entry] = await getHistory(report.id, historyId);
  return ok(entry, 'Status laporan berhasil diperbarui');
});
