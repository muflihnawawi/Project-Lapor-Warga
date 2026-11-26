import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(status, code, message, errors) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export const Errors = {
  badRequest: (msg = 'Format request tidak valid') => new ApiError(400, 'BAD_REQUEST', msg),
  validation: (errors, msg = 'Data yang dikirim tidak valid') => new ApiError(422, 'VALIDATION_ERROR', msg, errors),
  unauthenticated: (msg = 'Silakan login terlebih dahulu') => new ApiError(401, 'UNAUTHENTICATED', msg),
  forbiddenRole: (msg = 'Anda tidak memiliki akses untuk aksi ini') => new ApiError(403, 'FORBIDDEN_ROLE', msg),
  forbiddenOwnership: (msg = 'Anda bukan pemilik atau petugas yang ditugaskan') => new ApiError(403, 'FORBIDDEN_OWNERSHIP', msg),
  notFound: (msg = 'Data tidak ditemukan') => new ApiError(404, 'NOT_FOUND', msg),
  conflict: (code, msg) => new ApiError(409, code, msg),
};

export function ok(data, message = 'Data berhasil diambil', status = 200, headers) {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  return NextResponse.json(body, { status, headers });
}

export function paged(data, meta, message = 'Data berhasil diambil') {
  return NextResponse.json({ success: true, message, data, meta });
}

export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx || { params: {} });
    } catch (e) {
      if (e instanceof ApiError) {
        const body = { success: false, message: e.message, code: e.code };
        if (e.errors) body.errors = e.errors;
        return NextResponse.json(body, { status: e.status });
      }
      console.error('[API ERROR]', e);
      return NextResponse.json(
        { success: false, message: 'Terjadi kesalahan pada server', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}

export async function readJson(req) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('bad');
    return body;
  } catch {
    throw Errors.badRequest();
  }
}

export async function readForm(req) {
  try {
    return await req.formData();
  } catch {
    throw Errors.badRequest('Format multipart/form-data tidak valid');
  }
}

export function getPagination(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  let perPage = parseInt(searchParams.get('per_page') || '10', 10) || 10;
  perPage = Math.min(100, Math.max(1, perPage));
  return { page, perPage, offset: (page - 1) * perPage };
}

export function pageMeta(page, perPage, total) {
  return { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) };
}

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
}

export function parseBool(v) {
  if (v === null || v === undefined || v === '') return undefined;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function assertUuid(v) {
  if (!isUuid(v)) throw Errors.notFound();
  return v;
}
