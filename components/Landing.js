'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Search, FileText, CheckCircle2, Timer, TrendingUp, Megaphone, Wrench, CalendarDays, AlertTriangle, Info,
  MapPin, ArrowRight, ChevronDown, ImageOff, Clock,
} from 'lucide-react';
import { STATUS, formatDate, formatDateTime } from '@/lib/client/constants';
import { categoryVisual } from '@/lib/client/categoryIcon';
import { StatusBadge, Spinner } from '@/components/ui';
import { StatusStepper } from '@/components/StatusTimeline';

const MultiMap = dynamic(() => import('./MultiMapInner'), {
  ssr: false,
  loading: () => <div className="flex h-[420px] items-center justify-center bg-slate-100 text-sm text-slate-400">Memuat peta…</div>,
});

async function getJson(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.success) throw new Error(j?.message || 'Gagal memuat data');
  return j.data;
}

export function formatDuration(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} menit`;
  if (hours < 48) return `${Math.round(hours)} jam`;
  return `${Math.round(hours / 24)} hari`;
}

function SectionTitle({ eyebrow, title, desc, center }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className="text-sm font-bold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h2>
      {desc && <p className="mt-3 text-slate-600">{desc}</p>}
    </div>
  );
}

export function TrackBox() {
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const n = number.trim().toUpperCase();
    if (!n) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await getJson(`/api/v1/landing/track/${encodeURIComponent(n)}`));
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div id="lacak" className="card scroll-mt-24 p-5 sm:p-6">
      <p className="flex items-center gap-2 font-bold"><Search className="h-5 w-5 text-brand-600" /> Cek status laporan</p>
      <p className="mt-1 text-sm text-slate-500">Masukkan nomor laporan lengkap yang Anda terima setelah melapor, termasuk 4 karakter kode di akhir.</p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input className="input font-mono uppercase" placeholder="LW-20261126-0001-K7QX" value={number}
          onChange={(e) => setNumber(e.target.value)} aria-label="Nomor laporan" maxLength={30} />
        <button className="btn-primary shrink-0" disabled={busy || !number.trim()}>
          {busy ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />} <span className="hidden sm:inline">Cek</span>
        </button>
      </form>
      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {result && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold">{result.report_number}</span>
            <StatusBadge status={result.status} />
          </div>
          <div className="mt-5"><StatusStepper status={result.status} /></div>
          <p className="mt-4 text-center text-sm text-slate-500">{STATUS[result.status].desc}</p>
          <ul className="mt-4 space-y-2 text-xs">
            {result.history.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-2 font-semibold text-ink-700">
                  <span className={`h-2 w-2 rounded-full ${STATUS[h.status].dot}`} /> {STATUS[h.status].label}
                </span>
                <span className="text-slate-500">{formatDateTime(h.changed_at)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Untuk melihat detail dan catatan petugas, silakan masuk ke akun Anda.</p>
        </div>
      )}
    </div>
  );
}

export function StatsSection() {
  const [s, setS] = useState(null);
  useEffect(() => { getJson('/api/v1/landing/stats').then(setS).catch(() => setS(false)); }, []);
  if (s === false) return null;

  const tiles = [
    [FileText, 'Laporan masuk', s?.total_reports, s ? `${s.last_30_days} dalam 30 hari terakhir` : ''],
    [CheckCircle2, 'Laporan selesai', s?.resolved, s ? `${s.in_process} sedang diproses` : ''],
    [TrendingUp, 'Tingkat penyelesaian', s ? (s.resolved_rate == null ? '—' : `${s.resolved_rate}%`) : null, 'dari laporan terverifikasi'],
    [Timer, 'Rata-rata penyelesaian', s ? formatDuration(s.avg_resolution_hours) : null, 'sejak laporan dikirim'],
  ];
  const max = Math.max(1, ...(s?.by_category || []).map((c) => c.total));

  return (
    <section id="statistik" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Transparansi" title="Data penanganan laporan" center
          desc="Angka diperbarui otomatis dari sistem. Tidak ada data pribadi pelapor yang ditampilkan." />
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map(([Icon, label, value, hint]) => (
            <div key={label} className="card p-5 sm:p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
              <p className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{value ?? <span className="text-slate-200">···</span>}</p>
              <p className="mt-1 text-sm font-semibold text-ink-700">{label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
            </div>
          ))}
        </div>
        {s && (
          <div className="card mt-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold">Laporan per kategori</h3>
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Selesai</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-100" /> Total</span>
              </div>
            </div>
            <div className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
              {s.by_category.map((c) => {
                const { Icon, cls } = categoryVisual(c.category.name);
                return (
                  <div key={c.category.id} className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="truncate font-medium">{c.category.name}</span>
                        <span className="shrink-0 text-slate-500"><b className="text-ink-900">{c.resolved}</b> / {c.total}</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-slate-100">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-100" style={{ width: `${(c.total / max) * 100}%` }} />
                        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-500" style={{ width: `${(c.resolved / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export const ANN_TYPE = {
  info: { label: 'Informasi', Icon: Info, cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  perbaikan: { label: 'Jadwal Perbaikan', Icon: Wrench, cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  kegiatan: { label: 'Kegiatan Warga', Icon: CalendarDays, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  gangguan: { label: 'Gangguan Layanan', Icon: AlertTriangle, cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export function AnnouncementsSection() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => { getJson('/api/v1/announcements').then(setItems).catch(() => {}); }, []);
  if (!items.length) return null;
  return (
    <section id="pengumuman" className="scroll-mt-16 border-t border-slate-100 bg-amber-50/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Megaphone className="h-5 w-5" /></span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Pengumuman</h2>
            <p className="text-sm text-slate-500">Informasi terbaru dari pengelola wilayah.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const t = ANN_TYPE[a.type] || ANN_TYPE.info;
            const long = a.body.length > 180;
            const expanded = open === a.id;
            return (
              <article key={a.id} className="card flex flex-col p-5">
                <span className={`chip w-fit ${t.cls}`}><t.Icon className="h-3.5 w-3.5" /> {t.label}</span>
                <h3 className="mt-3 font-bold">{a.title}</h3>
                <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {long && !expanded ? `${a.body.slice(0, 180)}…` : a.body}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{formatDate(a.created_at)}{a.expires_at && ` · berlaku s.d. ${formatDate(`${a.expires_at}T12:00:00+07:00`)}`}</span>
                  {long && (
                    <button className="font-semibold text-brand-600 hover:underline" onClick={() => setOpen(expanded ? null : a.id)}>
                      {expanded ? 'Tutup' : 'Selengkapnya'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Photo({ src, label }) {
  return (
    <div className="relative h-40 flex-1 overflow-hidden bg-slate-100">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-slate-400">
          <ImageOff className="h-6 w-6 text-slate-300" />
          <span className="text-[11px]">Foto belum dipublikasikan</span>
        </span>
      )}
      <span className="absolute left-2 top-2 rounded-md bg-slate-900/70 px-2 py-0.5 text-[11px] font-semibold text-white">{label}</span>
    </div>
  );
}

export function ResolvedSection({ reportHref }) {
  const [items, setItems] = useState(null);
  useEffect(() => { getJson('/api/v1/landing/resolved').then(setItems).catch(() => setItems([])); }, []);
  return (
    <section id="selesai" className="scroll-mt-16 border-t border-slate-100 bg-slate-50/70 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Bukti nyata" title="Sudah diselesaikan"
          desc="Laporan warga yang telah ditangani petugas, lengkap dengan foto sebelum dan sesudah." />
        {items === null ? (
          <div className="py-16 text-center text-slate-400"><Spinner className="mx-auto h-6 w-6" /></div>
        ) : items.length === 0 ? (
          <div className="card mt-10 flex flex-col items-center px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-brand-500" />
            <p className="mt-3 font-bold">Belum ada laporan selesai yang dipublikasikan</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">Laporan yang telah diselesaikan dan dibuka untuk umum oleh admin akan tampil di sini.</p>
            <Link href={reportHref} className="btn-primary mt-5">Mulai melapor <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => {
              const { Icon, cls } = categoryVisual(r.category);
              return (
                <article key={r.report_number} className="card overflow-hidden">
                  <div className="flex gap-0.5">
                    <Photo src={r.before_url} label="Sebelum" />
                    <Photo src={r.after_url} label="Sesudah" />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`chip ring-transparent ${cls}`}><Icon className="h-3.5 w-3.5" /> {r.category}</span>
                      <StatusBadge status="resolved" />
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-bold">{r.title}</h3>
                    <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {r.region || r.address}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                        <Clock className="h-3.5 w-3.5" /> Selesai dalam {formatDuration(r.duration_hours)}
                      </span>
                      <span className="text-slate-400">{formatDate(r.resolved_at)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function MapSection() {
  const [points, setPoints] = useState(null);
  const [filter, setFilter] = useState('');
  useEffect(() => { getJson('/api/v1/landing/map').then(setPoints).catch(() => setPoints([])); }, []);
  const shown = (points || []).filter((p) => !filter || p.status === filter);
  const count = (s) => (points || []).filter((p) => p.status === s).length;

  return (
    <section id="peta" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Di sekitar Anda" title="Peta sebaran laporan"
          desc="Lihat lokasi permasalahan yang dilaporkan warga dan statusnya saat ini. Hanya laporan yang dibuka untuk umum." />
        <div className="mt-8 flex flex-wrap gap-2">
          <button onClick={() => setFilter('')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${!filter ? 'bg-ink-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            Semua ({points?.length ?? 0})
          </button>
          {Object.entries(STATUS).map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${filter === k ? 'bg-ink-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${v.dot}`} /> {v.label} ({count(k)})
            </button>
          ))}
        </div>
        <div className="card relative mt-4 overflow-hidden">
          {points !== null && (
            <MultiMap points={shown} renderPopup={(p) => (
              <div className="min-w-[180px] font-sans">
                <p className="text-[11px] text-slate-400">{p.report_number} · {p.category}</p>
                <p className="mt-0.5 font-bold text-ink-900">{p.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{p.address}</p>
                <p className="mt-2"><StatusBadge status={p.status} /></p>
                <Link href={`/publik/${p.report_number}`} className="mt-2 inline-block text-xs font-semibold text-brand-600">Lihat detail (perlu masuk) →</Link>
              </div>
            )} />
          )}
          {points !== null && points.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
              <p className="rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-500 shadow">Belum ada laporan publik untuk ditampilkan.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ['Bagaimana cara membuat laporan?', 'Daftar dan masuk sebagai warga, pilih "Buat Laporan", lalu isi judul, kategori, deskripsi, unggah minimal satu foto bukti, dan tentukan lokasi lewat GPS atau klik pada peta. Setelah terkirim, Anda mendapat nomor laporan.'],
  ['Tips memotret foto bukti yang baik', 'Ambil foto di siang hari dengan pencahayaan cukup. Tampilkan masalah secara jelas beserta patokan sekitar (papan nama jalan, bangunan). Format JPG atau PNG, maksimal 5 MB per foto, hingga 5 foto. Hindari memotret wajah orang atau pelat nomor kendaraan.'],
  ['Apa saja yang boleh dilaporkan?', 'Masalah lingkungan dan fasilitas umum: jalan rusak atau berlubang, lampu jalan mati, saluran air tersumbat, sampah menumpuk, fasilitas umum rusak (bangku, taman), dan permasalahan lingkungan lain.'],
  ['Apa yang tidak boleh dilaporkan?', 'Keadaan darurat (kebakaran, kecelakaan, kriminal) — segera hubungi 112. Juga laporan palsu, sengketa pribadi, ujaran kebencian, atau konten yang memuat data pribadi orang lain.'],
  ['Berapa lama laporan diproses?', 'Admin memeriksa dan memverifikasi laporan, lalu menugaskan petugas. Lama penanganan bergantung pada jenis masalah — lihat rata-rata waktu penyelesaian di bagian statistik. Setiap perubahan status dikirim sebagai notifikasi.'],
  ['Apakah identitas saya aman?', 'Ya. Nama, email, dan nomor telepon Anda tidak pernah ditampilkan pada laporan publik. Admin juga dapat memoderasi komentar yang memuat data pribadi.'],
  ['Mengapa laporan saya ditolak?', 'Laporan dapat ditolak jika informasi tidak lengkap, foto tidak sesuai, atau di luar kewenangan pengelola wilayah. Alasan penolakan selalu dicantumkan dan dikirim kepada Anda.'],
  ['Bisakah laporan diubah setelah dikirim?', 'Bisa, selama status masih "Dikirim". Setelah admin mulai memeriksa, laporan tidak dapat diubah atau dihapus, namun Anda tetap dapat menambahkan komentar.'],
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-slate-100 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SectionTitle eyebrow="Panduan" title="Pertanyaan yang sering diajukan"
            desc="Belum menemukan jawaban? Sampaikan lewat kolom komentar pada laporan Anda." />
          <div className="mt-6 flex gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p><b>Keadaan darurat?</b> LaporWarga bukan layanan darurat. Hubungi <b>112</b> untuk kebakaran, kecelakaan, atau tindak kriminal.</p>
          </div>
        </div>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold">
                {q}
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
