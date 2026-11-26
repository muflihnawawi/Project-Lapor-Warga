import { handle, ok, readJson, Errors, ApiError, clientIp } from '@/lib/server/http';
import { queryOne } from '@/lib/server/db';
import { issueTokens, verifyPassword } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rateLimit';

export const POST = handle(async (req) => {
  rateLimit(`login:${clientIp(req)}`, 20, 10 * 60 * 1000);
  const b = await readJson(req);
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const errors = {};
  if (!email) errors.email = ['Email wajib diisi.'];
  if (!password) errors.password = ['Password wajib diisi.'];
  if (Object.keys(errors).length) throw Errors.validation(errors);

  const user = await queryOne('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }
  if (!user.is_active) throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Akun Anda telah dinonaktifkan');
  return ok(await issueTokens(user), 'Login berhasil');
});
