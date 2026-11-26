import { handle, ok, Errors } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { analyticsFilters } from '@/lib/server/analytics';
import { STATUS_LABEL } from '@/lib/server/reports';

const LOCAL = "DATE_ADD(r.created_at, INTERVAL 7 HOUR)";
const PERIOD = {
  day: `DATE_FORMAT(${LOCAL}, '%Y-%m-%d')`,
  week: `DATE_FORMAT(${LOCAL}, '%x-W%v')`,
  month: `DATE_FORMAT(${LOCAL}, '%Y-%m')`,
};

export const GET = handle(async (req) => {
  await requireUser(req, ['admin']);
  const sp = new URL(req.url).searchParams;
  const groupBy = sp.get('group_by');
  if (!['category', 'status', 'period', 'region'].includes(groupBy)) {
    throw Errors.validation({ group_by: ['group_by harus category, status, period, atau region.'] });
  }
  const interval = sp.get('interval') || 'month';
  if (!PERIOD[interval]) throw Errors.validation({ interval: ['interval harus day, week, atau month.'] });
  const { where, params } = analyticsFilters(sp);

  let sql;
  if (groupBy === 'category') {
    sql = `SELECT c.id AS k, c.name AS label, COUNT(*) AS total FROM reports r JOIN categories c ON c.id = r.category_id
           WHERE ${where} GROUP BY c.id, c.name ORDER BY total DESC`;
  } else if (groupBy === 'status') {
    sql = `SELECT r.status AS k, r.status AS label, COUNT(*) AS total FROM reports r WHERE ${where} GROUP BY r.status ORDER BY total DESC`;
  } else if (groupBy === 'region') {
    sql = `SELECT COALESCE(NULLIF(r.region, ''), '(Tanpa wilayah)') AS k, COALESCE(NULLIF(r.region, ''), '(Tanpa wilayah)') AS label,
           COUNT(*) AS total FROM reports r WHERE ${where} GROUP BY k, label ORDER BY total DESC`;
  } else {
    sql = `SELECT ${PERIOD[interval]} AS k, ${PERIOD[interval]} AS label, COUNT(*) AS total FROM reports r WHERE ${where}
           GROUP BY k, label ORDER BY k`;
  }
  const rows = await query(sql, params);
  const [agg] = await query(
    `SELECT COUNT(*) AS total, SUM(r.status = 'resolved') AS resolved,
            SUM(r.status IN ('submitted','under_review','verified')) AS unhandled FROM reports r WHERE ${where}`,
    params
  );
  return ok({
    group_by: groupBy,
    total: Number(agg.total || 0),
    resolved: Number(agg.resolved || 0),
    unhandled: Number(agg.unhandled || 0),
    items: rows.map((r) => ({
      key: String(r.k),
      label: groupBy === 'status' ? STATUS_LABEL[r.label] || r.label : String(r.label),
      total: Number(r.total),
    })),
  });
});
