import { handle, ok, readJson } from '@/lib/server/http';
import { rotateRefreshToken } from '@/lib/server/auth';

export const POST = handle(async (req) => {
  const b = await readJson(req);
  return ok(await rotateRefreshToken(b.refresh_token), 'Token berhasil diperbarui');
});
