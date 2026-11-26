'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Camera, ShieldCheck, ArrowRight, CheckCircle2, Users, HardHat, LayoutDashboard, Send, Eye, Wrench, Menu, X,
} from 'lucide-react';
import { Logo } from '@/components/ui';
import { useAuth } from '@/components/Providers';
import { categoryVisual } from '@/lib/client/categoryIcon';
import {
  TrackBox, StatsSection, AnnouncementsSection, ResolvedSection, MapSection, FaqSection,
} from '@/components/Landing';

const FALLBACK_CATS = [
  { name: 'Infrastruktur Jalan', description: 'Jalan berlubang, jalan rusak' },
  { name: 'Penerangan Jalan', description: 'Lampu jalan mati' },
  { name: 'Drainase', description: 'Saluran air tersumbat' },
  { name: 'Kebersihan', description: 'Sampah menumpuk' },
  { name: 'Fasilitas Umum', description: 'Bangku, taman, fasilitas rusak' },
  { name: 'Lainnya', description: 'Permasalahan lingkungan lain' },
];

const NAV = [
  ['#lacak', 'Cek Status'],
  ['#statistik', 'Statistik'],
  ['#selesai', 'Sudah Selesai'],
  ['#peta', 'Peta'],
  ['#faq', 'Panduan'],
];

export default function Home() {
  const { user, ready } = useAuth();
  const [cats, setCats] = useState(FALLBACK_CATS);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    fetch('/api/v1/categories')
      .then((r) => r.json())
      .then((j) => j.success && j.data.length && setCats(j.data))
      .catch(() => {});
  }, []);

  const reportHref = user ? (user.role === 'citizen' ? '/laporan/baru' : '/dashboard') : '/register';

  return (
    <div className="theme-citizen min-h-screen scroll-smooth bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink-900">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {ready && user ? (
              <Link href="/dashboard" className="btn-primary"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost hidden sm:inline-flex">Masuk</Link>
                <Link href="/register" className="btn-primary">Daftar</Link>
              </>
            )}
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="border-t border-slate-100 px-4 py-2 lg:hidden">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{label}</a>
            ))}
            {!user && <Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Masuk</Link>}
          </nav>
        )}
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Layanan pengaduan warga yang transparan
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Lihat masalah di lingkunganmu?{' '}
              <span className="bg-gradient-to-r from-brand-600 to-[#1d6fd1] bg-clip-text text-transparent">Laporkan sekarang.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Jalan berlubang, lampu jalan mati, saluran tersumbat, atau sampah menumpuk — kirim laporan lengkap dengan foto dan
              lokasi, lalu pantau penanganannya hingga selesai.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={reportHref} className="btn-primary px-6 py-3 text-base"><Send className="h-5 w-5" /> Buat Laporan</Link>
              <a href="#cara-kerja" className="btn-secondary px-6 py-3 text-base">Cara Kerja <ArrowRight className="h-5 w-5" /></a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Gratis untuk warga', 'Identitas pelapor dilindungi', 'Notifikasi tiap perubahan status'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}</span>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <TrackBox />
          </div>
        </div>
      </section>

      <AnnouncementsSection />
      <StatsSection />

      <section id="cara-kerja" className="scroll-mt-16 border-y border-slate-100 bg-ink-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Laporkan · Pantau · Selesaikan</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Tiga langkah sederhana</h2>
            <p className="mt-3 text-slate-300">Tidak perlu antre atau mencari saluran yang tepat. Semua laporan tercatat rapi dan dapat ditelusuri.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              [Camera, 'Laporkan', 'Isi judul, pilih kategori, unggah foto bukti, dan tandai lokasi lewat GPS atau peta.'],
              [Eye, 'Pantau', 'Dapatkan nomor laporan unik dan notifikasi setiap kali status laporan berubah.'],
              [Wrench, 'Selesaikan', 'Petugas menangani di lapangan dan mengunggah foto bukti penyelesaian.'],
            ].map(([Icon, t, d], i) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white"><Icon className="h-6 w-6" /></span>
                  <span className="text-sm font-bold text-white/30">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ResolvedSection reportHref={reportHref} />
      <MapSection />

      <section className="border-t border-slate-100 bg-slate-50/70 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Apa yang bisa dilaporkan?</h2>
              <p className="mt-2 text-slate-600">Pilih kategori yang paling sesuai dengan permasalahan di sekitarmu.</p>
            </div>
            <Link href={reportHref} className="btn-secondary">Mulai Melapor <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {cats.map((c) => {
              const { Icon, cls } = categoryVisual(c.name);
              return (
                <div key={c.name} className="card p-5">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cls}`}><Icon className="h-6 w-6" /></span>
                  <p className="mt-4 font-bold">{c.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{c.description || '—'}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight">Satu platform, tiga peran</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              [Users, 'Masyarakat', 'Mengirim laporan, memantau status, dan berdiskusi lewat komentar.', 'bg-emerald-50 text-emerald-600'],
              [HardHat, 'Petugas', 'Menangani laporan yang ditugaskan dan mengunggah bukti penyelesaian.', 'bg-sky-50 text-sky-600'],
              [LayoutDashboard, 'Administrator', 'Memverifikasi laporan, menugaskan petugas, dan memantau statistik.', 'bg-indigo-50 text-indigo-600'],
            ].map(([Icon, t, d, cls]) => (
              <div key={t} className="card p-6">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cls}`}><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqSection />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-[#1d6fd1] px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Bersama menjaga lingkungan yang lebih baik</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Satu laporan Anda membantu petugas bergerak lebih cepat dan tepat sasaran.</p>
          <Link href={reportHref} className="btn mt-8 bg-white px-6 py-3 text-base text-brand-700 hover:bg-emerald-50">
            Gabung & Laporkan Sekarang <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Logo />
          <p className="max-w-xl md:text-right">
            LaporWarga adalah platform pencatatan dan koordinasi pengaduan. Penanganan laporan bergantung pada kerja sama dengan pengelola wilayah.
          </p>
        </div>
      </footer>
    </div>
  );
}
