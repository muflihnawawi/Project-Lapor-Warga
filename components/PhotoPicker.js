'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';

export const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png'];

/** Validasi foto di sisi klien sebelum dikirim (server tetap memvalidasi ulang). */
export function checkFiles(files) {
  for (const f of files) {
    if (!TYPES.includes(f.type)) return `Format "${f.name}" tidak didukung. Gunakan JPG atau PNG.`;
    if (f.size > MAX_SIZE) return `Ukuran "${f.name}" melebihi 5 MB.`;
  }
  return '';
}

export default function PhotoPicker({ files, onChange, max = 5, error, onError }) {
  const input = useRef(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const add = (list) => {
    const incoming = [...list];
    const msg = checkFiles(incoming);
    if (msg) { onError?.(msg); return; }
    if (files.length + incoming.length > max) { onError?.(`Maksimal ${max} foto.`); return; }
    onError?.('');
    onChange([...files, ...incoming]);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {previews.map((src, i) => (
          <div key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900" aria-label="Hapus foto">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {files.length < max && (
          <button type="button" onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-slate-500 transition hover:border-accent hover:bg-accent/5 hover:text-accent ${
              error ? 'border-rose-300' : 'border-slate-300'
            }`}>
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-semibold">Tambah foto</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png" multiple capture="environment" hidden
        onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <p className="mt-2 text-xs text-slate-500">JPG atau PNG, maks. 5 MB per foto, hingga {max} foto.</p>
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{Array.isArray(error) ? error[0] : error}</p>}
    </div>
  );
}
