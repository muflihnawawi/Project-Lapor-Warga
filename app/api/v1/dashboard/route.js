import { handle, ok } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { REPORT_SELECT, STATUSES, serializeSummary } from '@/lib/server/reports';

async function countByStatus(where, params) {
  const rows = await query(`SELECT status, COUNT(*) AS total FROM reports r WHERE r.deleted_at IS NULL ${where} GROUP BY status`, params);
  const map = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) map[r.status] = r.total;
  return map;
}

const recent = async (where, params) =>
  (await query(`${REPORT_SELECT} ${where} ORDER BY r.created_at DESC LIMIT 5`, params)).map(serializeSummary);

export const GET = handle(async (req) => {
  const user = await requireUser(req);

  if (user.role === 'citizen') {
    const c = await countByStatus('AND r.user_id = ?', [user.id]);
    return ok({
      role: 'citizen',
      total_reports: Object.values(c).reduce((a, b) => a + b, 0),
      in_process: c.submitted + c.under_review + c.verified + c.in_progress,
      resolved: c.resolved,
      rejected: c.rejected,
      recent_reports: await recent('AND r.user_id = ?', [user.id]),
    });
  }

  if (user.role === 'officer') {
    const c = await countByStatus('AND r.assigned_officer_id = ?', [user.id]);
    return ok({
      role: 'officer',
      total_assigned: Object.values(c).reduce((a, b) => a + b, 0),
      not_yet_handled: c.verified,
      in_progress: c.in_progress,
      resolved: c.resolved,
      latest_reports: await recent('AND r.assigned_officer_id = ?', [user.id]),
    });
  }

  const c = await countByStatus('', []);
  const byCat = await query(
    `SELECT c.id, c.name, COUNT(r.id) AS total FROM categories c
     LEFT JOIN reports r ON r.category_id = c.id AND r.deleted_at IS NULL
     GROUP BY c.id, c.name ORDER BY total DESC, c.name`
  );
  return ok({
    role: 'admin',
    total_reports: Object.values(c).reduce((a, b) => a + b, 0),
    waiting_verification: c.submitted + c.under_review,
    in_process: c.verified + c.in_progress,
    resolved: c.resolved,
    rejected: c.rejected,
    unassigned: (await query(
      "SELECT COUNT(*) AS n FROM reports WHERE deleted_at IS NULL AND status = 'verified' AND assigned_officer_id IS NULL"
    ))[0].n,
    by_category: byCat.map((r) => ({ category: { id: r.id, name: r.name }, total: r.total })),
    by_status: STATUSES.map((s) => ({ status: s, total: c[s] })),
    latest_reports: await recent('', []),
  });
});
