import { handle, ok, readJson, Errors, clientIp } from '@/lib/server/http';
import { query, queryOne, uuid } from '@/lib/server/db';
import { getAuthUser, requireUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';
import { serializeCategory, validateCategory } from '@/lib/server/categories';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  const sp = new URL(req.url).searchParams;
  let includeInactive = false;
  if (sp.get('include_inactive') === 'true') {
    const user = await getAuthUser(req).catch(() => null);
    includeInactive = user?.role === 'admin';
  }
  const rows = await query(
    `SELECT * FROM categories ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY name = 'Lainnya', name`
  );
  return ok(rows.map(serializeCategory));
});

export const POST = handle(async (req) => {
  const admin = await requireUser(req, ['admin']);
  const data = validateCategory(await readJson(req), false);
  if (await queryOne('SELECT id FROM categories WHERE name = ?', [data.name])) {
    throw Errors.validation({ name: ['Nama kategori sudah digunakan.'] });
  }
  const id = uuid();
  const now = new Date();
  await query('INSERT INTO categories (id, name, description, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?)', [
    id, data.name, data.description ?? null, data.is_active ?? 1, now, now,
  ]);
  await audit(undefined, admin.id, 'category.created', 'category', id, { name: data.name }, clientIp(req));
  return ok(serializeCategory(await queryOne('SELECT * FROM categories WHERE id = ?', [id])), 'Kategori berhasil ditambahkan', 201);
});
