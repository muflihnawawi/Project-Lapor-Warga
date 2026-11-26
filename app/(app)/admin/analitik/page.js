'use client';

import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, CheckCircle2, Hourglass, FileText } from 'lucide-react';
import { api, qs } from '@/lib/client/api';
import { STATUS } from '@/lib/client/constants';
import { useToast } from '@/components/Providers';
import { PageHeader, PageLoader, StatCard, Spinner, ErrorBox, Avatar, EmptyState } from '@/components/ui';

const GROUPS = [['category', 'Kategori'], ['status', 'Status'], ['period', 'Periode'], ['region', 'Wilayah']];

export default function AnalyticsPage() {
  const toast = useToast();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ date_from: '', date_to: '', category_id: '', status: '' });
  const [group, setGroup] = useState('category');
  const [interval, setPeriodInterval] = useState('month');
  const [summary, setSummary] = useState(null);
  const [officers, setOfficers] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => { api('/categories?include_inactive=true').then((r) => setCats(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    setSummary(null);
    setError('');
    api(`/analytics/summary${qs({ ...f, group_by: group, interval: group === 'period' ? interval : '' })}`)
      .then((r) => setSummary(r.data)).catch((e) => setError(e.message));
  }, [f, group, interval]);

  useEffect(() => {
    api(`/analytics/officer-activity${qs({ date_from: f.date_from, date_to: f.date_to })}`).then((r) => setOfficers(r.data)).catch(() => setOfficers([]));
  }, [f.date_from, f.date_to]);

  const doExport = async (format) => {
    setExporting(format);
    try {
      const res = await api(`/analytics/export${qs({ ...f, format })}`, { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-laporwarga.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(e.message); }
    setExporting('');
  };

  const max = Math.max(1, ...(summary?.items || []).map((i) => i.total));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Statistik & Ekspor" subtitle="Analisis laporan berdasarkan kategori, status, periode, dan wilayah."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => doExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? <Spinner className="h-4 w-4" /> : <FileDown className="h-4 w-4" />} PDF
            </button>
            <button className="btn-secondary" onClick={() => doExport('xlsx')} disabled={!!exporting}>
              {exporting === 'xlsx' ? <Spinner className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
            </button>
          </div>
        } />

      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-slate-500">Dari tanggal<input type="date" className="input mt-1" value={f.date_from} onChange={set('date_from')} /></label>
        <label className="text-xs font-semibold text-slate-500">Sampai tanggal<input type="date" className="input mt-1" value={f.date_to} onChange={set('date_to')} /></label>
        <label className="text-xs font-semibold text-slate-500">Kategori
          <select className="input mt-1" value={f.category_id} onChange={set('category_id')}>
            <option value="">Semua kategori</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">Status
          <select className="input mt-1" value={f.status} onChange={set('status')}>
            <option value="">Semua status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="mb-6"><ErrorBox message={error} /></div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total laporan" value={summary?.total} icon={FileText} />
        <StatCard label="Diselesaikan" value={summary?.resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Belum ditangani" value={summary?.unhandled} icon={Hourglass} tone="amber" hint="Dikirim, diperiksa, atau terverifikasi" />
      </div>

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Jumlah laporan per {GROUPS.find((g) => g[0] === group)[1].toLowerCase()}</h2>
          <div className="flex flex-wrap gap-2">
            {GROUPS.map(([k, l]) => (
              <button key={k} onClick={() => setGroup(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${group === k ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
            ))}
            {group === 'period' && (
              <select className="input w-auto py-1.5 text-xs" value={interval} onChange={(e) => setPeriodInterval(e.target.value)} aria-label="Interval">
                <option value="day">Harian</option><option value="week">Mingguan</option><option value="month">Bulanan</option>
              </select>
            )}
          </div>
        </div>
        {!summary ? <PageLoader /> : summary.items.length === 0 ? <EmptyState title="Tidak ada data pada filter ini" /> : (
          <div className="mt-6 space-y-3">
            {summary.items.map((i) => (
              <div key={i.key} className="grid grid-cols-[minmax(90px,180px)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate font-medium text-ink-700" title={i.label}>{i.label}</span>
                <div className="h-7 rounded-lg bg-slate-100">
                  <div className={`h-7 rounded-lg ${group === 'status' ? STATUS[i.key]?.dot : 'bg-accent'}`} style={{ width: `${Math.max(2, (i.total / max) * 100)}%` }} />
                </div>
                <span className="w-10 text-right font-bold">{i.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Aktivitas petugas</h2></div>
        {!officers ? <PageLoader /> : officers.length === 0 ? <EmptyState title="Belum ada petugas" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Petugas</th><th className="px-5 py-3 text-right">Ditugaskan</th><th className="px-5 py-3 text-right">Ditangani</th><th className="px-5 py-3 text-right">Selesai</th><th className="px-5 py-3 text-right">Rata-rata penyelesaian</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((o) => (
                  <tr key={o.officer.id}>
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={o.officer.name} className="h-8 w-8 text-xs" /><span className="font-semibold">{o.officer.name}</span></div></td>
                    <td className="px-5 py-3 text-right">{o.assigned}</td>
                    <td className="px-5 py-3 text-right">{o.in_progress}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">{o.resolved}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{o.avg_resolution_hours == null ? '—' : `${o.avg_resolution_hours} jam`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
