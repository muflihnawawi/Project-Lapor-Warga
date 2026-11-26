import { handle, ok, clientIp } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  rateLimit(`landing:${clientIp(req)}`, 120, 60 * 1000);
  const [a] = await query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'resolved'), 0) AS resolved,
            COALESCE(SUM(status IN ('submitted','under_review','verified','in_progress')), 0) AS in_process,
            COALESCE(SUM(status IN ('verified','in_progress','resolved')), 0) AS verified_total,
            AVG(CASE WHEN status = 'resolved' THEN TIMESTAMPDIFF(MINUTE, created_at, resolved_at) END) AS avg_minutes,
            COALESCE(SUM(created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)), 0) AS last_30_days
     FROM reports WHERE deleted_at IS NULL`
  );
  const byCat = await query(
    `SELECT c.id, c.name, COUNT(r.id) AS total, COALESCE(SUM(r.status = 'resolved'), 0) AS resolved
     FROM categories c LEFT JOIN reports r ON r.category_id = c.id AND r.deleted_at IS NULL
     WHERE c.is_active = 1 GROUP BY c.id, c.name ORDER BY total DESC, c.name`
  );
  const verified = Number(a.verified_total);
  return ok({
    total_reports: Number(a.total),
    resolved: Number(a.resolved),
    in_process: Number(a.in_process),
    last_30_days: Number(a.last_30_days),
    resolved_rate: verified ? Math.round((Number(a.resolved) / verified) * 100) : null,
    avg_resolution_hours: a.avg_minutes == null ? null : Math.round((Number(a.avg_minutes) / 60) * 10) / 10,
    by_category: byCat.map((c) => ({ category: { id: c.id, name: c.name }, total: Number(c.total), resolved: Number(c.resolved) })),
  });
});
