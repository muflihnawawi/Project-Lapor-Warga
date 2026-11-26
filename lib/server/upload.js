import fs from 'node:fs/promises';
import path from 'node:path';
import { ApiError, Errors } from './http';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILES = 5;

export const storageRoot = () => path.resolve(process.cwd(), process.env.STORAGE_DIR || 'storage');

export function getFiles(form, name = 'photos') {
  return [...form.getAll(name), ...form.getAll(`${name}[]`)].filter(
    (f) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0
  );
}

function detectType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  return null;
}

export async function readPhotos(files, { min = 0, max = MAX_FILES, field = 'photos' } = {}) {
  if (files.length < min) {
    throw Errors.validation({ [field]: ['Minimal satu foto bukti wajib dilampirkan.'] });
  }
  if (files.length > max) {
    throw Errors.validation({ [field]: [`Maksimal ${max} foto per permintaan.`] });
  }
  const out = [];
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) throw new ApiError(413, 'FILE_TOO_LARGE', `Ukuran foto "${f.name}" melebihi 5 MB`);
    const buffer = Buffer.from(await f.arrayBuffer());
    const ext = detectType(buffer);
    if (!ext) {
      throw new ApiError(422, 'UNSUPPORTED_FILE_TYPE', `Format file "${f.name}" bukan JPEG, JPG, atau PNG`);
    }
    out.push({ buffer, ext, name: f.name });
  }
  return out;
}

export async function savePhotos(photos, reportId, type) {
  const dir = path.join(storageRoot(), 'reports', reportId);
  await fs.mkdir(dir, { recursive: true });
  const saved = [];
  for (const p of photos) {
    const id = crypto.randomUUID();
    const filename = `${type}-${id}.${p.ext}`;
    const absPath = path.join(dir, filename);
    await fs.writeFile(absPath, p.buffer);
    saved.push({ id, url: `/storage/reports/${reportId}/${filename}`, absPath });
  }
  return saved;
}

export async function removeFiles(saved) {
  await Promise.all(saved.map((s) => fs.unlink(s.absPath).catch(() => {})));
}
