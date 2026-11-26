import { handle, ok, readJson, Errors, assertUuid, clientIp } from '@/lib/server/http';
import { query, queryOne } from '@/lib/server/db';
import { requireUser, serializeUser, revokeAllTokens } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const target = await queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [assertUuid(params.userId)]);
  if (!target) throw Errors.notFound('Pengguna tidak ditemukan');
  const b = await readJson(req);
  if (typeof b.is_active !== 'boolean') throw Errors.validation({ is_active: ['is_active harus boolean.'] });
  if (target.id === admin.id && !b.is_active) throw Errors.validation({ is_active: ['Anda tidak dapat menonaktifkan akun sendiri.'] });
  await query('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?', [b.is_active ? 1 : 0, new Date(), target.id]);
  if (!b.is_active) await revokeAllTokens(target.id);
  await audit(undefined, admin.id, b.is_active ? 'user.activated' : 'user.deactivated', 'user', target.id, null, clientIp(req));
  const updated = await queryOne('SELECT * FROM users WHERE id = ?', [target.id]);
  return ok(serializeUser(updated), b.is_active ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
});
