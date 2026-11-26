import { handle, ok, clientIp } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  rateLimit(`landing:${clientIp(req)}`, 120, 60 * 1000);
  const rows = await query(
    `SELECT r.report_number, r.title, r.status, r.latitude, r.longitude, r.address, c.name AS category_name
     FROM reports r JOIN categories c ON c.id = r.category_id
     WHERE r.deleted_at IS NULL AND r.visibility = 'public'
     ORDER BY r.created_at DESC LIMIT 500`
  );
  return ok(rows.map((r) => ({
    report_number: r.report_number,
    title: r.title,
    status: r.status,
    category: r.category_name,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
  })));
});
