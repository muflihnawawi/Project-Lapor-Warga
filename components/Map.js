'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <div className="flex h-[320px] items-center justify-center bg-slate-100 text-sm text-slate-400">Memuat peta…</div>,
});

export default Map;
