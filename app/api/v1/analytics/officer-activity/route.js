import { handle, ok, Errors } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';

export const GET = handle(async (req) => {
  await requireUser(req, ['admin']);
  const sp = new URL(req.url).searchParams;
  const cond = [];
  const params = [];
  for (const [k, suffix, op] of [['date_from', 'T00:00:00+07:00', '>='], ['date_to', 'T23:59:59.999+07:00', '<=']]) {
    const v = sp.get(k);
    if (!v) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw Errors.validation({ [k]: ['Format tanggal YYYY-MM-DD.'] });
    cond.push(`r.created_at ${op} ?`);
    params.push(new Date(`${v}${suffix}`));
  }
  const extra = cond.length ? `AND ${cond.join(' AND ')}` : '';
  const rows = await query(
    `SELECT u.id, u.name, u.role,
       COUNT(r.id) AS assigned,
       COALESCE(SUM(r.status = 'in_progress'), 0) AS in_progress,
       COALESCE(SUM(r.status = 'resolved'), 0) AS resolved,
       AVG(CASE WHEN r.status = 'resolved' THEN TIMESTAMPDIFF(MINUTE,
         (SELECT MAX(h.changed_at) FROM status_histories h WHERE h.report_id = r.id AND h.to_status = 'in_progress'),
         (SELECT MAX(h.changed_at) FROM status_histories h WHERE h.report_id = r.id AND h.to_status = 'resolved')) END) AS avg_minutes
     FROM users u
     LEFT JOIN reports r ON r.assigned_officer_id = u.id AND r.deleted_at IS NULL ${extra}
     WHERE u.role = 'officer' AND u.deleted_at IS NULL
     GROUP BY u.id, u.name, u.role ORDER BY resolved DESC, assigned DESC`,
    params
  );
  return ok(rows.map((r) => ({
    officer: { id: r.id, name: r.name, role: r.role },
    assigned: Number(r.assigned),
    in_progress: Number(r.in_progress),
    resolved: Number(r.resolved),
    avg_resolution_hours: r.avg_minutes == null ? null : Math.round((Number(r.avg_minutes) / 60) * 10) / 10,
  })));
});
