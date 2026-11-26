import { handle, paged, getPagination, pageMeta } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { REPORT_SELECT, buildReportFilters, getPhotos, serializePublic } from '@/lib/server/reports';

export const GET = handle(async (req) => {
  await requireUser(req);
  const sp = new URL(req.url).searchParams;
  const { page, perPage, offset } = getPagination(sp);
  const where = ["r.visibility = 'public'"];
  const params = [];
  buildReportFilters(sp, where, params);
  const w = ` AND ${where.join(' AND ')}`;
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM reports r WHERE r.deleted_at IS NULL${w}`, params);
  const rows = await query(`${REPORT_SELECT}${w} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  const photos = await getPhotos(rows.map((r) => r.id), { onlyPublic: true });
  const data = rows.map((r) => serializePublic(r, photos.filter((p) => p.report_id === r.id)));
  return paged(data, pageMeta(page, perPage, total));
});
