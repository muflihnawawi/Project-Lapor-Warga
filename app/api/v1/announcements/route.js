import { handle, ok, readJson, clientIp } from '@/lib/server/http';
import { query, queryOne, uuid } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/events';
import { rateLimit } from '@/lib/server/rateLimit';
import { serializeAnnouncement, validateAnnouncement } from '@/lib/server/announcements';

export const dynamic = 'force-dynamic';

// Publik: pengumuman yang terbit dan belum kedaluwarsa. Admin dengan ?all=true: semua pengumuman.
export const GET = handle(async (req) => {
  rateLimit(`landing:${clientIp(req)}`, 120, 60 * 1000);
  const all = new URL(req.url).searchParams.get('all') === 'true';
  if (all) {
    await requireUser(req, ['admin']);
    const rows = await query('SELECT * FROM announcements ORDER BY created_at DESC');
    return ok(rows.map(serializeAnnouncement));
  }
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); // tanggal WIB
  const rows = await query(
    `SELECT * FROM announcements WHERE is_published = 1 AND (expires_at IS NULL OR expires_at >= ?)
     ORDER BY created_at DESC LIMIT 6`,
    [today]
  );
  return ok(rows.map(serializeAnnouncement));
});

export const POST = handle(async (req) => {
  const admin = await requireUser(req, ['admin']);
  const data = validateAnnouncement(await readJson(req), false);
  const id = uuid();
  const now = new Date();
  await query(
    'INSERT INTO announcements (id, title, body, type, is_published, expires_at, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, data.title, data.body, data.type || 'info', data.is_published ?? 1, data.expires_at ?? null, admin.id, now, now]
  );
  await audit(undefined, admin.id, 'announcement.created', 'announcement', id, { title: data.title }, clientIp(req));
  return ok(serializeAnnouncement(await queryOne('SELECT * FROM announcements WHERE id = ?', [id])), 'Pengumuman berhasil dibuat', 201);
});
