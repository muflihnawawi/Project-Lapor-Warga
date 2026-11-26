import { handle, ok, readJson, Errors } from '@/lib/server/http';
import { query, queryOne } from '@/lib/server/db';
import { requireUser, serializeUser } from '@/lib/server/auth';

export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return ok(serializeUser(user));
});

export const PATCH = handle(async (req) => {
  const user = await requireUser(req);
  const b = await readJson(req);
  const errors = {};
  const sets = [];
  const params = [];
  if (b.name !== undefined) {
    const name = String(b.name ?? '').trim();
    if (name.length < 2 || name.length > 100) errors.name = ['Nama 2-100 karakter.'];
    else { sets.push('name = ?'); params.push(name); }
  }
  if (b.phone !== undefined) {
    const phone = b.phone ? String(b.phone).trim() : null;
    if (phone && !/^[0-9+\-\s]{6,20}$/.test(phone)) errors.phone = ['Nomor telepon tidak valid.'];
    else { sets.push('phone = ?'); params.push(phone); }
  }
  if (Object.keys(errors).length) throw Errors.validation(errors);
  if (!sets.length) throw Errors.validation({ name: ['Tidak ada data yang diubah.'] });
  await query(`UPDATE users SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...params, new Date(), user.id]);
  return ok(serializeUser(await queryOne('SELECT * FROM users WHERE id = ?', [user.id])), 'Profil berhasil diperbarui');
});
