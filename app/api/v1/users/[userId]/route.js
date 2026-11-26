import { handle, ok, readJson, Errors, assertUuid, clientIp } from '@/lib/server/http';
import { query, queryOne } from '@/lib/server/db';
import { requireUser, serializeUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';

async function findUser(id) {
  const u = await queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [assertUuid(id)]);
  if (!u) throw Errors.notFound('Pengguna tidak ditemukan');
  return u;
}

export const GET = handle(async (req, { params }) => {
  await requireUser(req, ['admin']);
  return ok(serializeUser(await findUser(params.userId)));
});

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const target = await findUser(params.userId);
  const b = await readJson(req);
  const errors = {};
  const sets = [];
  const vals = [];
  if (b.name !== undefined) {
    const name = String(b.name ?? '').trim();
    if (name.length < 2 || name.length > 100) errors.name = ['Nama 2-100 karakter.'];
    else { sets.push('name = ?'); vals.push(name); }
  }
  if (b.phone !== undefined) {
    const phone = b.phone ? String(b.phone).trim() : null;
    if (phone && !/^[0-9+\-\s]{6,20}$/.test(phone)) errors.phone = ['Nomor telepon tidak valid.'];
    else { sets.push('phone = ?'); vals.push(phone); }
  }
  if (b.role !== undefined) {
    if (!['citizen', 'officer', 'admin'].includes(b.role)) errors.role = ['Role tidak valid.'];
    else if (target.id === admin.id && b.role !== 'admin') errors.role = ['Anda tidak dapat mengubah role akun sendiri.'];
    else { sets.push('role = ?'); vals.push(b.role); }
  }
  if (Object.keys(errors).length) throw Errors.validation(errors);
  if (!sets.length) throw Errors.validation({ name: ['Tidak ada data yang diubah.'] });
  await query(`UPDATE users SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...vals, new Date(), target.id]);
  await audit(undefined, admin.id, 'user.updated', 'user', target.id, b, clientIp(req));
  return ok(serializeUser(await findUser(target.id)), 'Data pengguna diperbarui');
});
