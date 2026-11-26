import { handle, paged, getPagination, pageMeta, Errors, isUuid } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { requireUser, toIso } from '@/lib/server/auth';

export const GET = handle(async (req) => {
  await requireUser(req, ['admin']);
  const sp = new URL(req.url).searchParams;
  const { page, perPage, offset } = getPagination(sp);
  const where = ['1=1'];
  const params = [];
  if (sp.get('actor_id')) {
    if (!isUuid(sp.get('actor_id'))) throw Errors.validation({ actor_id: ['actor_id tidak valid.'] });
    where.push('a.actor_id = ?'); params.push(sp.get('actor_id'));
  }
  if (sp.get('entity_type')) { where.push('a.entity_type = ?'); params.push(sp.get('entity_type')); }
  if (sp.get('action')) { where.push('a.action LIKE ?'); params.push(`%${sp.get('action')}%`); }
  if (sp.get('date_from')) { where.push('a.created_at >= ?'); params.push(new Date(`${sp.get('date_from')}T00:00:00+07:00`)); }
  if (sp.get('date_to')) { where.push('a.created_at <= ?'); params.push(new Date(`${sp.get('date_to')}T23:59:59.999+07:00`)); }
  if (params.some((p) => p instanceof Date && isNaN(p))) throw Errors.validation({ date_from: ['Format tanggal YYYY-MM-DD.'] });
  const w = where.join(' AND ');
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM audit_logs a WHERE ${w}`, params);
  const rows = await query(
    `SELECT a.*, u.name AS actor_name, u.role AS actor_role FROM audit_logs a JOIN users u ON u.id = a.actor_id
     WHERE ${w} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
  const data = rows.map((a) => {
    let metadata = null;
    try { metadata = a.metadata ? JSON.parse(a.metadata) : null; } catch {}
    return {
      id: a.id,
      actor: { id: a.actor_id, name: a.actor_name, role: a.actor_role },
      action: a.action,
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      metadata,
      ip_address: a.ip_address,
      created_at: toIso(a.created_at),
    };
  });
  return paged(data, pageMeta(page, perPage, total));
});
