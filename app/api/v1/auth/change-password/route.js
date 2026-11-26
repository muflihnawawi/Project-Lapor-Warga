import { handle, ok, readJson, Errors } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser, verifyPassword, hashPassword, revokeAllTokens } from '@/lib/server/auth';

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const b = await readJson(req);
  const errors = {};
  const current = String(b.current_password ?? '');
  const next = String(b.new_password ?? '');
  if (!current) errors.current_password = ['Password saat ini wajib diisi.'];
  else if (!(await verifyPassword(current, user.password_hash))) errors.current_password = ['Password saat ini salah.'];
  if (next.length < 8) errors.new_password = ['Password baru minimal 8 karakter.'];
  if (next !== String(b.new_password_confirmation ?? '')) errors.new_password_confirmation = ['Konfirmasi password tidak cocok.'];
  if (Object.keys(errors).length) throw Errors.validation(errors);

  await query('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [await hashPassword(next), new Date(), user.id]);
  await revokeAllTokens(user.id);
  return ok(undefined, 'Password berhasil diubah');
});
