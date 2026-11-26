import { handle, ok, readJson, Errors, clientIp } from '@/lib/server/http';
import { query, queryOne, uuid } from '@/lib/server/db';
import { hashPassword, serializeUser } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = handle(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const b = await readJson(req);
  const errors = {};
  const name = String(b.name ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = b.phone ? String(b.phone).trim() : null;
  const password = String(b.password ?? '');

  if (name.length < 2 || name.length > 100) errors.name = ['Nama wajib diisi (2-100 karakter).'];
  if (!EMAIL_RE.test(email)) errors.email = ['Format email tidak valid.'];
  if (phone && !/^[0-9+\-\s]{6,20}$/.test(phone)) errors.phone = ['Nomor telepon tidak valid.'];
  if (password.length < 8) errors.password = ['Password minimal 8 karakter.'];
  if (password !== String(b.password_confirmation ?? '')) errors.password_confirmation = ['Konfirmasi password tidak cocok.'];
  if (Object.keys(errors).length) throw Errors.validation(errors);

  if (await queryOne('SELECT id FROM users WHERE email = ?', [email])) {
    throw Errors.conflict('EMAIL_ALREADY_USED', 'Email sudah terdaftar');
  }
  const now = new Date();
  const user = { id: uuid(), name, email, phone, role: 'citizen', is_active: 1, created_at: now };
  await query(
    'INSERT INTO users (id, name, email, phone, password_hash, role, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,?)',
    [user.id, name, email, phone, await hashPassword(password), 'citizen', now, now]
  );
  return ok(serializeUser(user), 'Registrasi berhasil, silakan login', 201);
});
