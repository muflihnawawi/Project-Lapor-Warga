import { handle, ok, readJson, Errors, assertUuid, clientIp } from '@/lib/server/http';
import { query, queryOne } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';
import { serializeCategory, validateCategory } from '@/lib/server/categories';

async function find(id) {
  const c = await queryOne('SELECT * FROM categories WHERE id = ?', [assertUuid(id)]);
  if (!c) throw Errors.notFound('Kategori tidak ditemukan');
  return c;
}

export const GET = handle(async (_req, { params }) => ok(serializeCategory(await find(params.categoryId))));

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const cat = await find(params.categoryId);
  const data = validateCategory(await readJson(req), true);
  if (!Object.keys(data).length) throw Errors.validation({ name: ['Tidak ada data yang diubah.'] });
  if (data.name && (await queryOne('SELECT id FROM categories WHERE name = ? AND id <> ?', [data.name, cat.id]))) {
    throw Errors.validation({ name: ['Nama kategori sudah digunakan.'] });
  }
  const keys = Object.keys(data);
  await query(`UPDATE categories SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, [
    ...keys.map((k) => data[k]), new Date(), cat.id,
  ]);
  await audit(undefined, admin.id, 'category.updated', 'category', cat.id, data, clientIp(req));
  return ok(serializeCategory(await find(cat.id)), 'Kategori diperbarui');
});
