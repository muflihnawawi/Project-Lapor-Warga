import { Errors } from './http';

export const serializeCategory = (c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  is_active: !!c.is_active,
});

export function validateCategory(b, partial) {
  const errors = {};
  const data = {};
  if (b.name !== undefined || !partial) {
    const name = String(b.name ?? '').trim();
    if (!name || name.length > 100) errors.name = ['Nama kategori wajib diisi (maks 100 karakter).'];
    else data.name = name;
  }
  if (b.description !== undefined) {
    const d = b.description === null ? null : String(b.description).trim();
    if (d && d.length > 255) errors.description = ['Deskripsi maksimal 255 karakter.'];
    else data.description = d || null;
  }
  if (b.is_active !== undefined) {
    if (typeof b.is_active !== 'boolean') errors.is_active = ['is_active harus boolean.'];
    else data.is_active = b.is_active ? 1 : 0;
  }
  if (Object.keys(errors).length) throw Errors.validation(errors);
  return data;
}
