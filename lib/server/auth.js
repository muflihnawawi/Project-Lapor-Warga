import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { query, queryOne, uuid } from './db';
import { ApiError, Errors } from './http';

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET belum diatur di .env.local');
  return new TextEncoder().encode(s);
};

export const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL || 3600);
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);

export const hashPassword = (p) => bcrypt.hash(p, 10);
export const verifyPassword = (p, h) => bcrypt.compare(p, h);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function signAccessToken(user) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(secret());
}

export async function issueTokens(user) {
  const access_token = await signAccessToken(user);
  const refresh_token = crypto.randomBytes(48).toString('hex');
  const now = new Date();
  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?,?,?,?,?)',
    [uuid(), user.id, sha256(refresh_token), new Date(now.getTime() + REFRESH_DAYS * 86400000), now]
  );
  return { access_token, refresh_token, token_type: 'Bearer', expires_in: ACCESS_TTL, user: serializeUser(user) };
}

export async function rotateRefreshToken(token) {
  if (!token || typeof token !== 'string') throw Errors.unauthenticated('Refresh token tidak valid');
  const row = await queryOne(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?',
    [sha256(token), new Date()]
  );
  if (!row) throw Errors.unauthenticated('Refresh token tidak valid atau kedaluwarsa');
  await query('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?', [new Date(), row.id]);
  const user = await queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [row.user_id]);
  if (!user) throw Errors.unauthenticated();
  if (!user.is_active) throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Akun Anda telah dinonaktifkan');
  return issueTokens(user);
}

export async function revokeRefreshToken(token, userId) {
  if (!token) return;
  await query('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND user_id = ? AND revoked_at IS NULL', [
    new Date(), sha256(token), userId,
  ]);
}

export async function revokeAllTokens(userId) {
  await query('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [new Date(), userId]);
}

export async function getAuthUser(req) {
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  let payload;
  try {
    ({ payload } = await jwtVerify(m[1], secret()));
  } catch {
    throw Errors.unauthenticated('Token tidak valid atau kedaluwarsa');
  }
  const user = await queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [payload.sub]);
  if (!user) throw Errors.unauthenticated();
  if (!user.is_active) throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Akun Anda telah dinonaktifkan');
  return user;
}

export async function requireUser(req, roles) {
  const user = await getAuthUser(req);
  if (!user) throw Errors.unauthenticated();
  if (roles && !roles.includes(user.role)) throw Errors.forbiddenRole();
  return user;
}

export function serializeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    role: u.role,
    is_active: !!u.is_active,
    created_at: toIso(u.created_at),
  };
}

export function toIso(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  const local = new Date(date.getTime() + 7 * 3600000);
  return local.toISOString().replace(/\.\d{3}Z$/, '+07:00');
}
