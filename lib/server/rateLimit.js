import { ApiError } from './http';

const g = globalThis;
const buckets = g.__lwRate || (g.__lwRate = new Map());

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    return;
  }
  b.count += 1;
  if (b.count > limit) throw new ApiError(429, 'RATE_LIMITED', 'Terlalu banyak permintaan, coba lagi beberapa saat lagi');
}
