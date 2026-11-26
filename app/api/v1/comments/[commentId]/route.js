import { handle, ok, readJson, Errors, assertUuid, clientIp } from '@/lib/server/http';
import { query, queryOne, transaction } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';
import { findViewableReport, serializeComment, COMMENT_SELECT, validateBody } from '@/lib/server/comments';

async function findComment(user, id) {
  const c = await queryOne(`${COMMENT_SELECT} AND c.id = ?`, [assertUuid(id)]);
  if (!c) throw Errors.notFound('Komentar tidak ditemukan');
  await findViewableReport(user, c.report_id);
  return c;
}

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const c = await findComment(user, params.commentId);
  if (c.user_id !== user.id) throw Errors.forbiddenOwnership('Anda tidak dapat mengubah komentar milik pengguna lain');
  const body = validateBody(await readJson(req));
  await query('UPDATE comments SET body = ?, updated_at = ? WHERE id = ?', [body, new Date(), c.id]);
  return ok(serializeComment(await queryOne(`${COMMENT_SELECT} AND c.id = ?`, [c.id])), 'Komentar diperbarui');
});

export const DELETE = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const c = await findComment(admin, params.commentId);
  await transaction(async (conn) => {
    await query('UPDATE comments SET deleted_at = ? WHERE id = ?', [new Date(), c.id], conn);
    await audit(conn, admin.id, 'comment.moderated', 'comment', c.id, { report_id: c.report_id, body: c.body }, clientIp(req));
  });
  return ok(undefined, 'Komentar telah dimoderasi');
});
