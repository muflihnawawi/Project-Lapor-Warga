import { handle, ok, paged, readJson, Errors, getPagination, pageMeta, parseBool, clientIp } from '@/lib/server/http';
import { query, queryOne, uuid } from '@/lib/server/db';
import { requireUser, serializeUser, hashPassword } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';

export const GET = handle(async (req) => {
  await requireUser(req, ['admin']);
  const sp = new URL(req.url).searchParams;
  const { page, perPage, offset } = getPagination(sp);
  const where = ['deleted_at IS NULL'];
  const params = [];
  const role = sp.get('role');
  if (role) {
    if (!['citizen', 'officer', 'admin'].includes(role)) throw Errors.validation({ role: ['Role tidak valid.'] });
    where.push('role = ?');
    params.push(role);
  }
  const active = parseBool(sp.get('is_active'));
  if (active !== undefined) { where.push('is_active = ?'); params.push(active ? 1 : 0); }
  const search = sp.get('search');
  if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const w = where.join(' AND ');
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM users WHERE ${w}`, params);
  const rows = await query(`SELECT * FROM users WHERE ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  return paged(rows.map(serializeUser), pageMeta(page, perPage, total));
});

export const POST = handle(async (req) => {
  const admin = await requireUser(req, ['admin']);
  const b = await readJson(req);
  const errors = {};
  const name = String(b.name ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = b.phone ? String(b.phone).trim() : null;
  const password = String(b.password ?? '');
  if (name.length < 2 || name.length > 100) errors.name = ['Nama wajib diisi (2-100 karakter).'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ['Format email tidak valid.'];
  if (password.length < 8) errors.password = ['Password minimal 8 karakter.'];
  if (!['officer', 'admin'].includes(b.role)) errors.role = ['Role harus officer atau admin.'];
  if (Object.keys(errors).length) throw Errors.validation(errors);
  if (await queryOne('SELECT id FROM users WHERE email = ?', [email])) {
    throw Errors.conflict('EMAIL_ALREADY_USED', 'Email sudah terdaftar');
  }
  const now = new Date();
  const id = uuid();
  await query(
    'INSERT INTO users (id, name, email, phone, password_hash, role, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,?)',
    [id, name, email, phone, await hashPassword(password), b.role, now, now]
  );
  await audit(undefined, admin.id, 'user.created', 'user', id, { role: b.role, email }, clientIp(req));
  return ok(serializeUser(await queryOne('SELECT * FROM users WHERE id = ?', [id])), 'Akun berhasil dibuat', 201);
});
