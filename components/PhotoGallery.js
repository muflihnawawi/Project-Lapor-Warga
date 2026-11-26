'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ImageOff } from 'lucide-react';

export default function PhotoGallery({ photos, emptyText = 'Tidak ada foto.' }) {
  const [idx, setIdx] = useState(-1);
  if (!photos?.length) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        <ImageOff className="h-4 w-4" /> {emptyText}
      </div>
    );
  }
  const [first, ...rest] = photos;
  return (
    <>
      <div className={`grid gap-2 ${rest.length ? 'grid-cols-4' : 'grid-cols-1'}`}>
        <button onClick={() => setIdx(0)} className={`overflow-hidden rounded-xl bg-slate-100 ${rest.length ? 'col-span-4 sm:col-span-3 sm:row-span-2' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={first.url} alt="Foto 1" className="h-64 w-full object-cover transition hover:scale-[1.02] sm:h-80" />
        </button>
        {rest.map((p, i) => (
          <button key={p.id} onClick={() => setIdx(i + 1)} className="overflow-hidden rounded-xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`Foto ${i + 2}`} className="h-20 w-full object-cover transition hover:scale-105 sm:h-[9.5rem]" />
          </button>
        ))}
      </div>
      {idx >= 0 && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black/90 p-4" onClick={() => setIdx(-1)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Tutup"><X className="h-6 w-6" /></button>
          {photos.length > 1 && (
            <>
              <button className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Sebelumnya"
                onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + photos.length) % photos.length); }}>
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Berikutnya"
                onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % photos.length); }}>
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[idx].url} alt="" className="max-h-[88vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <p className="absolute bottom-4 text-sm text-white/70">{idx + 1} / {photos.length}</p>
        </div>
      )}
    </>
  );
}
