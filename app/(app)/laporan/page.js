'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, FilePlus2, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { api, qs } from '@/lib/client/api';
import { STATUS } from '@/lib/client/constants';
import { PageHeader, PageLoader, EmptyState, Pagination, ErrorBox } from '@/components/ui';
import ReportItem from '@/components/ReportItem';

const TITLES = {
  citizen: ['Laporan Saya', 'Semua laporan yang pernah Anda kirim beserta statusnya.'],
  officer: ['Tugas Saya', 'Laporan yang ditugaskan kepada Anda.'],
  admin: ['Semua Laporan', 'Kelola, verifikasi, dan tugaskan laporan masyarakat.'],
};

function ReportList() {
  const { user } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [cats, setCats] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(sp.get('search') || '');
  const [showFilter, setShowFilter] = useState(false);

  const filters = {
    status: sp.get('status') || '',
    category_id: sp.get('category_id') || '',
    officer_id: sp.get('officer_id') || '',
    date_from: sp.get('date_from') || '',
    date_to: sp.get('date_to') || '',
    sort: sp.get('sort') || 'newest',
    search: sp.get('search') || '',
    page: sp.get('page') || '1',
  };
  const key = qs(filters);

  const setParam = (patch) => {
    const next = { ...filters, page: '1', ...patch };
    router.replace(`/laporan${qs(next)}`);
  };

  useEffect(() => {
    api('/categories').then((r) => setCats(r.data)).catch(() => {});
    if (user.role === 'admin') api('/users?role=officer&per_page=100').then((r) => setOfficers(r.data)).catch(() => {});
  }, [user.role]);

  useEffect(() => {
    setResult(null);
    setError('');
    api(`/reports${key}`).then(setResult).catch((e) => setError(e.message));
  }, [key]);

  const [title, subtitle] = TITLES[user.role];

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={user.role === 'citizen' && <Link href="/laporan/baru" className="btn-primary"><FilePlus2 className="h-4 w-4" /> Buat Laporan</Link>}
      />

      {/* Tab status cepat */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {[['', 'Semua'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k || 'all'} onClick={() => setParam({ status: k })}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              filters.status === k ? 'bg-accent text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <form className="relative min-w-[200px] flex-1" onSubmit={(e) => { e.preventDefault(); setParam({ search }); }}>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Cari judul atau nomor laporan…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <button className={`btn-secondary ${showFilter ? 'bg-slate-100' : ''}`} onClick={() => setShowFilter(!showFilter)}>
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>
        {showFilter && (
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <select className="input" value={filters.category_id} onChange={(e) => setParam({ category_id: e.target.value })} aria-label="Kategori">
              <option value="">Semua kategori</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {user.role === 'admin' && (
              <select className="input" value={filters.officer_id} onChange={(e) => setParam({ officer_id: e.target.value })} aria-label="Petugas">
                <option value="">Semua petugas</option>
                {officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            <input type="date" className="input" value={filters.date_from} onChange={(e) => setParam({ date_from: e.target.value })} aria-label="Dari tanggal" />
            <input type="date" className="input" value={filters.date_to} onChange={(e) => setParam({ date_to: e.target.value })} aria-label="Sampai tanggal" />
            <select className="input" value={filters.sort} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Urutan">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </div>
        )}

        {error ? (
          <div className="p-4"><ErrorBox message={error} /></div>
        ) : !result ? (
          <PageLoader />
        ) : result.data.length === 0 ? (
          <EmptyState
            title="Tidak ada laporan"
            desc={filters.status || filters.search ? 'Coba ubah filter atau kata kunci pencarian.' : user.role === 'officer' ? 'Belum ada laporan yang ditugaskan kepada Anda.' : 'Belum ada laporan.'}
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {result.data.map((r) => <ReportItem key={r.id} report={r} showOfficer={user.role !== 'citizen'} />)}
            </div>
            <Pagination meta={result.meta} onChange={(p) => setParam({ page: String(p) })} />
          </>
        )}
      </div>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<PageLoader />}><ReportList /></Suspense>;
}
