import { NextResponse } from 'next/server';
import { handle, getPagination, pageMeta, parseBool } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser, toIso } from '@/lib/server/auth';

export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const sp = new URL(req.url).searchParams;
  const { page, perPage, offset } = getPagination(sp);
  const where = ['user_id = ?'];
  const params = [user.id];
  const isRead = parseBool(sp.get('is_read'));
  if (isRead !== undefined) { where.push('is_read = ?'); params.push(isRead ? 1 : 0); }
  const w = where.join(' AND ');
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM notifications WHERE ${w}`, params);
  const [{ unread }] = await query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [user.id]);
  const rows = await query(`SELECT * FROM notifications WHERE ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  return NextResponse.json({
    success: true,
    message: 'Data berhasil diambil',
    data: rows.map((n) => ({
      id: n.id, type: n.type, title: n.title, message: n.message, report_id: n.report_id,
      report_number: n.report_number, is_read: !!n.is_read, created_at: toIso(n.created_at),
    })),
    meta: { ...pageMeta(page, perPage, total), unread_count: unread },
  });
});
