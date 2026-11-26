import { handle, ok, Errors, assertUuid } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const res = await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [assertUuid(params.notificationId), user.id]);
  if (!res.affectedRows) throw Errors.notFound('Notifikasi tidak ditemukan');
  return ok(undefined, 'Notifikasi ditandai dibaca');
});
