import { query } from './db';
import { toIso } from './auth';

const SELECT = `SELECT a.*, o.name AS officer_name, o.role AS officer_role, b.name AS by_name, b.role AS by_role
  FROM assignments a JOIN users o ON o.id = a.officer_id JOIN users b ON b.id = a.assigned_by`;

const serialize = (a) => ({
  id: a.id,
  report_id: a.report_id,
  officer: { id: a.officer_id, name: a.officer_name, role: a.officer_role },
  assigned_by: { id: a.assigned_by, name: a.by_name, role: a.by_role },
  notes: a.notes,
  reason: a.reason,
  is_current: !!a.is_current,
  assigned_at: toIso(a.assigned_at),
});

export async function serializeAssignment(id) {
  const [a] = await query(`${SELECT} WHERE a.id = ?`, [id]);
  return serialize(a);
}

export async function assignmentHistory(reportId) {
  const rows = await query(`${SELECT} WHERE a.report_id = ? ORDER BY a.assigned_at DESC`, [reportId]);
  return rows.map(serialize);
}
