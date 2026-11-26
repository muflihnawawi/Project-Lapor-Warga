'use client';

const BASE = '/api/v1';
const KEY = 'lw_auth';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Terjadi kesalahan, silakan coba lagi');
    this.status = status;
    this.code = body?.code;
    this.errors = body?.errors;
  }
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export function setSession(s) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
}

let refreshing = null;
async function refreshTokens() {
  const s = getSession();
  if (!s?.refresh_token) return false;
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const json = await res.json();
        setSession(json.data);
        return true;
      })
      .catch(() => false)
      .finally(() => { setTimeout(() => { refreshing = null; }, 0); });
  }
  return refreshing;
}

/**
 * Panggil API LaporWarga.
 * @param {string} path contoh: '/reports'
 * @param {{method?: string, body?: any, form?: FormData, headers?: object, raw?: boolean}} opts
 * @returns {Promise<any>} JSON lengkap ({success, message, data, meta}) atau Response bila raw
 */
export async function api(path, opts = {}, retried = false) {
  const { method = 'GET', body, form, headers = {}, raw = false } = opts;
  const s = getSession();
  const h = { ...headers };
  if (s?.access_token) h.Authorization = `Bearer ${s.access_token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers: h, body: payload });
  } catch {
    throw new ApiError(0, { message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
  }

  if (res.status === 401 && !retried && !path.startsWith('/auth/login') && s?.refresh_token) {
    if (await refreshTokens()) return api(path, opts, true);
    setSession(null);
    window.dispatchEvent(new Event('lw-logout'));
  }
  if (raw && res.ok) return res;
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || !json?.success) throw new ApiError(res.status, json);
  return json;
}

export function qs(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}
