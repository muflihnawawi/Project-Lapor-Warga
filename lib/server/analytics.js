import { Errors, isUuid } from './http';
import { STATUSES } from './reports';

export function analyticsFilters(sp) {
  const where = ['r.deleted_at IS NULL'];
  const params = [];
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const from = sp.get('date_from');
  const to = sp.get('date_to');
  if (from) {
    if (!dateRe.test(from)) throw Errors.validation({ date_from: ['Format tanggal YYYY-MM-DD.'] });
    where.push('r.created_at >= ?'); params.push(new Date(`${from}T00:00:00+07:00`));
  }
  if (to) {
    if (!dateRe.test(to)) throw Errors.validation({ date_to: ['Format tanggal YYYY-MM-DD.'] });
    where.push('r.created_at <= ?'); params.push(new Date(`${to}T23:59:59.999+07:00`));
  }
  const cat = sp.get('category_id');
  if (cat) {
    if (!isUuid(cat)) throw Errors.validation({ category_id: ['category_id tidak valid.'] });
    where.push('r.category_id = ?'); params.push(cat);
  }
  const status = sp.get('status');
  if (status) {
    if (!STATUSES.includes(status)) throw Errors.validation({ status: ['Status tidak valid.'] });
    where.push('r.status = ?'); params.push(status);
  }
  return { where: where.join(' AND '), params };
}
