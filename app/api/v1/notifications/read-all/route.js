import { handle, ok } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';

export const PATCH = handle(async (req) => {
  const user = await requireUser(req);
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [user.id]);
  return ok(undefined, 'Semua notifikasi ditandai dibaca');
});
