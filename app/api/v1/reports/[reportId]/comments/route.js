import { handle, ok, paged, readJson, Errors, getPagination, pageMeta } from '@/lib/server/http';
import { query, queryOne, uuid } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { findViewableReport, serializeComment, COMMENT_SELECT, validateBody } from '@/lib/server/comments';

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findViewableReport(user, params.reportId);
  const { page, perPage, offset } = getPagination(new URL(req.url).searchParams);
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM comments WHERE report_id = ? AND deleted_at IS NULL', [r.id]);
  const rows = await query(`${COMMENT_SELECT} AND c.report_id = ? ORDER BY c.created_at ASC LIMIT ? OFFSET ?`, [r.id, perPage, offset]);
  return paged(rows.map(serializeComment), pageMeta(page, perPage, total));
});

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findViewableReport(user, params.reportId);
  if (user.role === 'officer' && r.assigned_officer_id !== user.id) {
    throw Errors.forbiddenOwnership('Petugas hanya dapat berkomentar pada laporan yang ditugaskan kepadanya');
  }
  const body = validateBody(await readJson(req));
  const id = uuid();
  const now = new Date();
  await query('INSERT INTO comments (id, report_id, user_id, body, created_at, updated_at) VALUES (?,?,?,?,?,?)', [id, r.id, user.id, body, now, now]);
  return ok(serializeComment(await queryOne(`${COMMENT_SELECT} AND c.id = ?`, [id])), 'Komentar berhasil ditambahkan', 201);
});
