import { handle, ok, readJson, Errors, assertUuid, clientIp } from '@/lib/server/http';
import { query, queryOne } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';
import { serializeAnnouncement, validateAnnouncement } from '@/lib/server/announcements';

async function find(id) {
  const a = await queryOne('SELECT * FROM announcements WHERE id = ?', [assertUuid(id)]);
  if (!a) throw Errors.notFound('Pengumuman tidak ditemukan');
  return a;
}

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const a = await find(params.announcementId);
  const data = validateAnnouncement(await readJson(req), true);
  const keys = Object.keys(data);
  if (!keys.length) throw Errors.validation({ title: ['Tidak ada data yang diubah.'] });
  await query(`UPDATE announcements SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, [
    ...keys.map((k) => data[k]), new Date(), a.id,
  ]);
  await audit(undefined, admin.id, 'announcement.updated', 'announcement', a.id, data, clientIp(req));
  return ok(serializeAnnouncement(await find(a.id)), 'Pengumuman diperbarui');
});

export const DELETE = handle(async (req, { params }) => {
  const admin = await requireUser(req, ['admin']);
  const a = await find(params.announcementId);
  await query('DELETE FROM announcements WHERE id = ?', [a.id]);
  await audit(undefined, admin.id, 'announcement.deleted', 'announcement', a.id, { title: a.title }, clientIp(req));
  return ok(undefined, 'Pengumuman dihapus');
});
