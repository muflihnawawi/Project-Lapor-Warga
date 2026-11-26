import { handle, ok, readJson, Errors, isUuid, clientIp } from '@/lib/server/http';
import { query, queryOne, transaction, uuid } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { notify, audit } from '@/lib/server/events';
import { serializeAssignment } from '@/lib/server/assignments';
import { findAccessibleReport } from '@/lib/server/reports';

const notAllowed = (msg) => Errors.conflict('ASSIGNMENT_NOT_ALLOWED', msg);

async function findOfficer(id) {
  if (!isUuid(id)) throw Errors.validation({ officer_id: ['Petugas wajib dipilih.'] });
  const officer = await queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!officer) throw Errors.validation({ officer_id: ['Petugas tidak ditemukan.'] });
  if (officer.role !== 'officer' || !officer.is_active) throw notAllowed('Laporan hanya dapat ditugaskan ke akun petugas yang aktif');
  return officer;
}

export const POST = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const r = await findAccessibleReport(admin, params.reportId);
  const b = await readJson(req);
  const officer = await findOfficer(b.officer_id);
  const notes = b.notes ? String(b.notes).trim().slice(0, 1000) : null;
  const id = uuid();
  await transaction(async (conn) => {
    const locked = await queryOne('SELECT status, assigned_officer_id FROM reports WHERE id = ? FOR UPDATE', [r.id], conn);
    if (locked.status !== 'verified') throw notAllowed('Hanya laporan berstatus verified yang dapat ditugaskan');
    if (locked.assigned_officer_id) throw notAllowed('Laporan sudah memiliki petugas. Gunakan ganti petugas.');
    const now = new Date();
    await query('INSERT INTO assignments (id, report_id, officer_id, assigned_by, notes, is_current, assigned_at) VALUES (?,?,?,?,?,1,?)',
      [id, r.id, officer.id, admin.id, notes, now], conn);
    await query('UPDATE reports SET assigned_officer_id = ?, updated_at = ? WHERE id = ?', [officer.id, now, r.id], conn);
    await notify(conn, officer.id, 'report_assigned', 'Tugas baru untuk Anda',
      `Anda ditugaskan menangani laporan ${r.report_number}: ${r.title}.`, r);
    await audit(conn, admin.id, 'report.assigned', 'report', r.id, { officer_id: officer.id }, clientIp(req));
  });
  return ok(await serializeAssignment(id), 'Laporan berhasil ditugaskan', 201);
});

export const PUT = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const r = await findAccessibleReport(admin, params.reportId);
  const b = await readJson(req);
  const reason = String(b.reason ?? '').trim();
  if (reason.length < 5) throw Errors.validation({ reason: ['Alasan penggantian wajib diisi (minimal 5 karakter).'] });
  const officer = await findOfficer(b.officer_id);
  const notes = b.notes ? String(b.notes).trim().slice(0, 1000) : null;
  const id = uuid();
  await transaction(async (conn) => {
    const locked = await queryOne('SELECT status, assigned_officer_id FROM reports WHERE id = ? FOR UPDATE', [r.id], conn);
    if (!['verified', 'in_progress'].includes(locked.status)) throw notAllowed('Petugas hanya dapat diganti pada laporan verified atau in_progress');
    if (!locked.assigned_officer_id) throw notAllowed('Laporan belum memiliki petugas');
    if (locked.assigned_officer_id === officer.id) throw notAllowed('Petugas pengganti sama dengan petugas saat ini');
    const now = new Date();
    await query('UPDATE assignments SET is_current = 0 WHERE report_id = ?', [r.id], conn);
    await query('INSERT INTO assignments (id, report_id, officer_id, assigned_by, notes, reason, is_current, assigned_at) VALUES (?,?,?,?,?,?,1,?)',
      [id, r.id, officer.id, admin.id, notes, reason, now], conn);
    await query('UPDATE reports SET assigned_officer_id = ?, updated_at = ? WHERE id = ?', [officer.id, now, r.id], conn);
    await notify(conn, officer.id, 'report_assigned', 'Tugas baru untuk Anda',
      `Anda ditugaskan menangani laporan ${r.report_number}: ${r.title}.`, r);
    await audit(conn, admin.id, 'report.reassigned', 'report', r.id,
      { from_officer_id: locked.assigned_officer_id, to_officer_id: officer.id, reason }, clientIp(req));
  });
  return ok(await serializeAssignment(id), 'Petugas berhasil diganti');
});
