import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui';

export default function AuthLayout({ children }) {
  return (
    <div className="theme-citizen grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-[#1d6fd1] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <Link href="/" className="relative"><Logo light /></Link>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">Bersama menjaga lingkungan yang lebih baik.</h2>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Setiap laporan Anda membantu petugas bergerak lebih cepat dan tepat sasaran.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[['Laporkan', 'dengan foto & lokasi'], ['Pantau', 'status real-time'], ['Selesaikan', 'dengan bukti']].map(([a, b]) => (
              <div key={a} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="font-bold">{a}</p>
                <p className="mt-1 text-xs text-white/70">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-white/60">© LaporWarga</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between gap-4">
            <Link href="/" className="group inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-ink-900">
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              <span className="sm:hidden">Beranda</span>
              <span className="hidden sm:inline">Kembali ke beranda</span>
            </Link>
            <Link href="/" className="lg:hidden" aria-label="LaporWarga"><Logo /></Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
