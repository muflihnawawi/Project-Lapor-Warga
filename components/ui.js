'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Loader2, X, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { STATUS, initials } from '@/lib/client/constants';

export function Logo({ className = '', light = false }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <path d="M20 3C10.6 3 3 10.2 3 19.2c0 4.6 2 8.7 5.2 11.7L7 37l6.6-3.1c2 .8 4.1 1.2 6.4 1.2 9.4 0 17-7.2 17-16.1S29.4 3 20 3z" fill="#1d6fd1" />
        <rect x="11" y="15" width="5" height="12" rx="1" fill="#fff" />
        <rect x="17.5" y="10" width="5.5" height="17" rx="1" fill="#fff" opacity=".9" />
        <path d="M23 27c0-6 4-10.5 10-11.5-.5 6.5-4.5 11-10 11.5z" fill="#34b36b" />
      </svg>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>
        Lapor<span className={light ? 'text-emerald-300' : 'text-[#1d6fd1]'}>Warga</span>
      </span>
    </span>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function StatusBadge({ status, className = '' }) {
  const s = STATUS[status] || STATUS.submitted;
  return (
    <span className={`chip ${s.cls} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function Avatar({ name, className = 'h-9 w-9 text-sm' }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent ${className}`}>
      {initials(name)}
    </span>
  );
}

export function Field({ label, error, hint, children, required }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{Array.isArray(error) ? error[0] : error}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-accent">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'accent', hint }) {
  const tones = {
    accent: 'bg-accent/10 text-accent',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">{value ?? '–'}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title = 'Belum ada data', desc, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" />
      </span>
      <p className="font-semibold text-ink-900">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-slate-500">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full ${size} overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.last_page <= 1) return null;
  const { current_page: p, last_page: last, total } = meta;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
      <p className="text-slate-500">
        Halaman <b className="text-ink-900">{p}</b> dari {last} · {total} data
      </p>
      <div className="flex gap-2">
        <button className="btn-secondary px-3 py-1.5" disabled={p <= 1} onClick={() => onChange(p - 1)} aria-label="Sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="btn-secondary px-3 py-1.5" disabled={p >= last} onClick={() => onChange(p + 1)} aria-label="Berikutnya">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
}
