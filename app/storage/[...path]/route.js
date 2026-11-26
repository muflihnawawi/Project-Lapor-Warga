import fs from 'node:fs/promises';
import path from 'node:path';
import { storageRoot } from '@/lib/server/upload';

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

// Menyajikan foto yang diunggah dari folder storage (di luar /public).
export async function GET(_req, { params }) {
  const root = storageRoot();
  const file = path.resolve(root, ...(params.path || []));
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(root + path.sep) || !type) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(data, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=86400' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
