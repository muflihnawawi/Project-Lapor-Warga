import { handle, ok, clientIp } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { toIso } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

// Laporan publik yang sudah selesai, dengan foto sebelum/sesudah yang ditandai layak tampil oleh admin.
export const GET = handle(async (req) => {
  rateLimit(`landing:${clientIp(req)}`, 120, 60 * 1000);
  const rows = await query(
    `SELECT r.id, r.report_number, r.title, r.region, r.address, r.created_at, r.resolved_at, c.name AS category_name
     FROM reports r JOIN categories c ON c.id = r.category_id
     WHERE r.deleted_at IS NULL AND r.visibility = 'public' AND r.status = 'resolved'
     ORDER BY r.resolved_at DESC LIMIT 6`
  );
  const photos = rows.length
    ? await query(
        `SELECT report_id, type, url FROM report_photos
         WHERE report_id IN (?) AND is_public = 1 AND deleted_at IS NULL ORDER BY created_at`,
        [rows.map((r) => r.id)]
      )
    : [];
  return ok(rows.map((r) => {
    const mine = photos.filter((p) => p.report_id === r.id);
    return {
      report_number: r.report_number,
      title: r.title,
      category: r.category_name,
      region: r.region,
      address: r.address,
      before_url: mine.find((p) => p.type === 'evidence')?.url || null,
      after_url: mine.find((p) => p.type === 'resolution')?.url || null,
      duration_hours: r.resolved_at ? Math.round(((new Date(r.resolved_at) - new Date(r.created_at)) / 3600000) * 10) / 10 : null,
      created_at: toIso(r.created_at),
      resolved_at: toIso(r.resolved_at),
    };
  }));
});
