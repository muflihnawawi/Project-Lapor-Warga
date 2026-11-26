import { toIso } from './auth';
import { Errors } from './http';
import { canAccess, getReportRow } from './reports';

export async function findViewableReport(user, id, conn) {
  const r = await getReportRow(id, conn);
  if (!r || !(canAccess(user, r) || r.visibility === 'public')) throw Errors.notFound('Laporan tidak ditemukan');
  return r;
}

export const serializeComment = (c) => ({
  id: c.id,
  report_id: c.report_id,
  author: { id: c.user_id, name: c.author_name, role: c.author_role },
  body: c.body,
  created_at: toIso(c.created_at),
  updated_at: toIso(c.updated_at),
});

export const COMMENT_SELECT = `SELECT c.*, u.name AS author_name, u.role AS author_role
  FROM comments c JOIN users u ON u.id = c.user_id WHERE c.deleted_at IS NULL`;

export function validateBody(b) {
  const body = String(b.body ?? '').trim();
  if (!body) throw Errors.validation({ body: ['Komentar tidak boleh kosong.'] });
  if (body.length > 1000) throw Errors.validation({ body: ['Komentar maksimal 1000 karakter.'] });
  return body;
}
