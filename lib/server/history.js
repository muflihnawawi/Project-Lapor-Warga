import { query } from './db';
import { toIso } from './auth';
import { serializePhoto } from './reports';

export async function getHistory(reportId, onlyId) {
  const rows = await query(
    `SELECT h.*, u.name AS user_name, u.role AS user_role FROM status_histories h
     JOIN users u ON u.id = h.changed_by
     WHERE h.report_id = ? ${onlyId ? 'AND h.id = ?' : ''} ORDER BY h.changed_at DESC, h.id`,
    onlyId ? [reportId, onlyId] : [reportId]
  );
  const ids = rows.map((r) => r.id);
  const photos = ids.length
    ? await query('SELECT * FROM report_photos WHERE status_history_id IN (?) AND deleted_at IS NULL', [ids])
    : [];
  return rows.map((h) => ({
    id: h.id,
    report_id: h.report_id,
    from_status: h.from_status,
    to_status: h.to_status,
    notes: h.notes,
    reason: h.reason,
    photos: photos.filter((p) => p.status_history_id === h.id).map(serializePhoto),
    changed_by: { id: h.changed_by, name: h.user_name, role: h.user_role },
    changed_at: toIso(h.changed_at),
  }));
}
