import { handle, ok } from '@/lib/server/http';
import { requireUser, revokeRefreshToken } from '@/lib/server/auth';

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  let body = {};
  try { body = await req.json(); } catch {}
  await revokeRefreshToken(body?.refresh_token, user.id);
  return ok(undefined, 'Berhasil logout');
});
