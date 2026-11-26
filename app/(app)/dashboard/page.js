'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, Hourglass, CheckCircle2, XCircle, FilePlus2, ArrowRight, ClipboardList, PlayCircle, Inbox, UserX, Globe2,
  Users, BarChart3, Wrench,
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { api } from '@/lib/client/api';
import { STATUS, STATUS_FLOW } from '@/lib/client/constants';
import { PageLoader, StatCard, EmptyState, ErrorBox } from '@/components/ui';
import ReportItem from '@/components/ReportItem';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard').then((r) => setData(r.data)).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <PageLoader />;
  if (data.role === 'citizen') return <CitizenDashboard d={data} name={user.name} />;
  if (data.role === 'officer') return <OfficerDashboard d={data} name={user.name} />;
  return <AdminDashboard d={data} name={user.name} />;
}

function Greeting({ name }) {
  const h = Number(new Intl.DateTimeFormat('id-ID', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()));
  const g = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  return `${g}, ${name.split(' ')[0]}`;
}

function RecentList({ title, items, emptyTitle, emptyDesc, action, showOfficer, moreHref }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold">{title}</h2>
        {items.length > 0 && (
          <Link href={moreHref} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Lihat semua <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {items.length ? (
        <div className="divide-y divide-slate-100">{items.map((r) => <ReportItem key={r.id} report={r} showOfficer={showOfficer} />)}</div>
      ) : (
        <EmptyState title={emptyTitle} desc={emptyDesc} action={action} />
      )}
    </div>
  );
}

function CitizenDashboard({ d, name }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-[#1d6fd1] p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-white/80"><Greeting name={name} /></p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Ada masalah di sekitar Anda hari ini?</h1>
            <p className="mt-2 max-w-lg text-white/80">Laporkan dengan foto dan lokasi. Kami akan memberi kabar setiap ada perkembangan.</p>
          </div>
          <Link href="/laporan/baru" className="btn bg-white px-5 py-3 text-base text-brand-700 shadow hover:bg-emerald-50">
            <FilePlus2 className="h-5 w-5" /> Buat Laporan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total laporan" value={d.total_reports} icon={FileText} />
        <StatCard label="Sedang diproses" value={d.in_process} icon={Hourglass} tone="amber" />
        <StatCard label="Selesai" value={d.resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Ditolak" value={d.rejected} icon={XCircle} tone="rose" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentList
            title="Laporan terbaru saya"
            items={d.recent_reports}
            moreHref="/laporan"
            emptyTitle="Belum ada laporan"
            emptyDesc="Laporan yang Anda kirim akan muncul di sini beserta statusnya."
            action={<Link href="/laporan/baru" className="btn-primary"><FilePlus2 className="h-4 w-4" /> Buat laporan pertama</Link>}
          />
        </div>
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-bold">Perjalanan laporan Anda</h2>
            <ol className="mt-4 space-y-4">
              {STATUS_FLOW.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${STATUS[s].dot}`}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-bold">{STATUS[s].label}</p>
                    <p className="text-xs text-slate-500">{STATUS[s].desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Link href="/publik" className="card flex items-center gap-4 p-5 transition hover:shadow-md">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Globe2 className="h-5 w-5" /></span>
            <div className="flex-1">
              <p className="font-bold">Laporan publik</p>
              <p className="text-xs text-slate-500">Lihat masalah yang dilaporkan warga lain</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function OfficerDashboard({ d, name }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent"><Greeting name={name} /></p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Ringkasan tugas lapangan</h1>
          <p className="mt-1 text-sm text-slate-500">Laporan yang ditugaskan kepada Anda oleh administrator.</p>
        </div>
        <Link href="/laporan?status=verified" className="btn-primary"><PlayCircle className="h-4 w-4" /> Mulai tangani tugas</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total ditugaskan" value={d.total_assigned} icon={ClipboardList} />
        <StatCard label="Belum ditindaklanjuti" value={d.not_yet_handled} icon={Inbox} tone="amber" hint="Status terverifikasi" />
        <StatCard label="Sedang ditangani" value={d.in_progress} icon={Wrench} tone="violet" />
        <StatCard label="Selesai" value={d.resolved} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentList
            title="Tugas terbaru"
            items={d.latest_reports}
            moreHref="/laporan"
            emptyTitle="Belum ada tugas"
            emptyDesc="Laporan yang ditugaskan admin kepada Anda akan tampil di sini."
          />
        </div>
        <div className="card h-fit p-5">
          <h2 className="font-bold">Alur kerja petugas</h2>
          <ol className="mt-4 space-y-4 text-sm">
            {[
              ['Buka tugas', 'Periksa detail laporan, foto, dan titik lokasi pada peta.'],
              ['Mulai tangani', 'Ubah status menjadi "Ditangani" saat menuju lokasi.'],
              ['Selesaikan', 'Unggah foto bukti penyelesaian lalu tandai selesai.'],
            ].map(([t, desc], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                <div><p className="font-bold">{t}</p><p className="text-xs text-slate-500">{desc}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ d, name }) {
  const maxCat = Math.max(1, ...d.by_category.map((c) => c.total));
  const total = Math.max(1, d.total_reports);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent"><Greeting name={name} /></p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard Administrator</h1>
          <p className="mt-1 text-sm text-slate-500">Pantau seluruh laporan yang masuk ke sistem.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/laporan?status=submitted" className="btn-primary"><Inbox className="h-4 w-4" /> Laporan masuk</Link>
          <Link href="/admin/analitik" className="btn-secondary"><BarChart3 className="h-4 w-4" /> Analitik</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total laporan" value={d.total_reports} icon={FileText} />
        <StatCard label="Menunggu verifikasi" value={d.waiting_verification} icon={Hourglass} tone="amber" />
        <StatCard label="Diproses" value={d.in_process} icon={Wrench} tone="violet" />
        <StatCard label="Selesai" value={d.resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Ditolak" value={d.rejected} icon={XCircle} tone="rose" />
        <StatCard label="Belum ditugaskan" value={d.unassigned} icon={UserX} tone="sky" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Laporan per kategori</h2>
          <div className="mt-5 space-y-3.5">
            {d.by_category.map((c) => (
              <div key={c.category.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-ink-700">{c.category.name}</span>
                  <span className="font-bold">{c.total}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Distribusi status</h2>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100">
            {d.by_status.filter((s) => s.total > 0).map((s) => (
              <div key={s.status} className={`${STATUS[s.status].dot} border-r-2 border-white last:border-r-0`} style={{ width: `${(s.total / total) * 100}%` }}
                title={`${STATUS[s.status].label}: ${s.total}`} />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {d.by_status.map((s) => (
              <Link key={s.status} href={`/laporan?status=${s.status}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                <span className={`h-3 w-3 rounded-full ${STATUS[s.status].dot}`} />
                <span className="flex-1 text-sm text-ink-700">{STATUS[s.status].label}</span>
                <span className="font-bold">{s.total}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentList title="Laporan terbaru" items={d.latest_reports} moreHref="/laporan" showOfficer emptyTitle="Belum ada laporan masuk" />
        </div>
        <div className="space-y-3">
          {[
            ['/admin/pengguna', Users, 'Kelola pengguna', 'Buat akun petugas, aktif/nonaktifkan akun'],
            ['/admin/kategori', FileText, 'Kelola kategori', 'Tambah dan atur kategori laporan'],
            ['/admin/analitik', BarChart3, 'Statistik & ekspor', 'Ringkasan, aktivitas petugas, PDF/Excel'],
          ].map(([href, Icon, t, desc]) => (
            <Link key={href} href={href} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent"><Icon className="h-5 w-5" /></span>
              <div className="flex-1"><p className="font-bold">{t}</p><p className="text-xs text-slate-500">{desc}</p></div>
              <ArrowRight className="h-5 w-5 text-slate-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
