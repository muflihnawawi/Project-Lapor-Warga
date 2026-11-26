'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, ImageOff, Globe2 } from 'lucide-react';
import { api, qs } from '@/lib/client/api';
import { STATUS, timeAgo } from '@/lib/client/constants';
import { categoryVisual } from '@/lib/client/categoryIcon';
import { PageHeader, PageLoader, StatusBadge, EmptyState, Pagination, ErrorBox } from '@/components/ui';

export default function PublicReportsPage() {
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ search: '', category_id: '', status: '', page: 1 });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/categories').then((r) => setCats(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    setResult(null);
    api(`/public/reports${qs({ ...f, per_page: 12 })}`).then(setResult).catch((e) => setError(e.message));
  }, [f]);

  return (
    <>
      <PageHeader title="Laporan Publik" subtitle="Laporan yang dibuka untuk umum oleh administrator. Identitas pelapor tidak ditampilkan." />
      <div className="card mb-6 flex flex-wrap gap-3 p-4">
        <form className="relative min-w-[200px] flex-1" onSubmit={(e) => { e.preventDefault(); setF({ ...f, search, page: 1 }); }}>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Cari laporan…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <select className="input w-auto" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value, page: 1 })} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} aria-label="Status">
          <option value="">Semua status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {error ? <ErrorBox message={error} /> : !result ? <PageLoader /> : result.data.length === 0 ? (
        <div className="card"><EmptyState icon={Globe2} title="Belum ada laporan publik" desc="Laporan akan muncul di sini setelah dibuka untuk umum oleh admin." /></div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((r) => {
              const { Icon, cls } = categoryVisual(r.category.name);
              return (
                <Link key={r.report_number} href={`/publik/${r.report_number}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative h-44 bg-slate-100">
                    {r.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photos[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-8 w-8" /></span>
                    )}
                    <span className="absolute left-3 top-3"><StatusBadge status={r.status} className="bg-white" /></span>
                  </div>
                  <div className="p-4">
                    <span className={`chip ring-transparent ${cls}`}><Icon className="h-3.5 w-3.5" /> {r.category.name}</span>
                    <p className="mt-2 line-clamp-2 font-bold group-hover:text-accent">{r.title}</p>
                    <p className="mt-2 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" /> {r.location.address}</p>
                    <p className="mt-1 text-xs text-slate-400">{r.report_number} · {timeAgo(r.created_at)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="card mt-6"><Pagination meta={result.meta} onChange={(p) => setF({ ...f, page: p })} /></div>
        </>
      )}
    </>
  );
}
