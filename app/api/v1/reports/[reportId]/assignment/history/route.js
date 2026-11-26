import { handle, ok, Errors } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { findAccessibleReport } from '@/lib/server/reports';
import { assignmentHistory } from '@/lib/server/assignments';

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(req);
  if (user.role === 'citizen') throw Errors.forbiddenRole('Riwayat penugasan hanya untuk admin dan petugas');
  const r = await findAccessibleReport(user, params.reportId);
  return ok(await assignmentHistory(r.id));
});
