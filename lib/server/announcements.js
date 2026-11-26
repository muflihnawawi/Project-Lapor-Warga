import { Errors } from './http';
import { toIso } from './auth';

export const ANN_TYPES = ['info', 'perbaikan', 'kegiatan', 'gangguan'];

export const serializeAnnouncement = (a) => ({
  id: a.id,
  title: a.title,
  body: a.body,
  type: a.type,
  is_published: !!a.is_published,
  expires_at: a.expires_at ? String(a.expires_at instanceof Date ? a.expires_at.toISOString().slice(0, 10) : a.expires_at).slice(0, 10) : null,
  created_at: toIso(a.created_at),
  updated_at: toIso(a.updated_at),
});

export function validateAnnouncement(b, partial) {
  const errors = {};
  const data = {};
  if (b.title !== undefined || !partial) {
    const t = String(b.title ?? '').trim();
    if (!t || t.length > 150) errors.title = ['Judul wajib diisi (maks 150 karakter).'];
    else data.title = t;
  }
  if (b.body !== undefined || !partial) {
    const t = String(b.body ?? '').trim();
    if (!t || t.length > 2000) errors.body = ['Isi pengumuman wajib diisi (maks 2000 karakter).'];
    else data.body = t;
  }
  if (b.type !== undefined) {
    if (!ANN_TYPES.includes(b.type)) errors.type = ['Jenis pengumuman tidak valid.'];
    else data.type = b.type;
  }
  if (b.is_published !== undefined) {
    if (typeof b.is_published !== 'boolean') errors.is_published = ['is_published harus boolean.'];
    else data.is_published = b.is_published ? 1 : 0;
  }
  if (b.expires_at !== undefined) {
    if (b.expires_at === null || b.expires_at === '') data.expires_at = null;
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.expires_at))) errors.expires_at = ['Format tanggal YYYY-MM-DD.'];
    else data.expires_at = b.expires_at;
  }
  if (Object.keys(errors).length) throw Errors.validation(errors);
  return data;
}
