import { handle, ok } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { findAccessibleReport } from '@/lib/server/reports';
import { getHistory } from '@/lib/server/history';

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const r = await findAccessibleReport(user, params.reportId);
  return ok(await getHistory(r.id));
});
