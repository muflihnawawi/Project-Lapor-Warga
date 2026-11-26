'use client';

import { Check, X } from 'lucide-react';
import { STATUS, STATUS_FLOW, ROLE_LABEL, formatDateTime } from '@/lib/client/constants';
import PhotoGallery from '@/components/PhotoGallery';

/** Stepper kemajuan status laporan. */
export function StatusStepper({ status }) {
  const rejected = status === 'rejected';
  const steps = rejected ? ['submitted', 'under_review', 'rejected'] : STATUS_FLOW;
  const current = steps.indexOf(status);
  return (
    <div className="flex items-start">
      {steps.map((s, i) => {
        const done = i < current || (i === current && (s === 'resolved' || s === 'rejected'));
        const active = i === current;
        return (
          <div key={s} className="flex flex-1 flex-col items-center text-center last:flex-none sm:last:flex-1">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : i <= current ? 'bg-accent' : 'bg-slate-200'}`} />
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                s === 'rejected' ? 'bg-rose-500 text-white'
                  : done ? 'bg-accent text-white'
                  : active ? 'bg-accent/15 text-accent ring-4 ring-accent/10'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {s === 'rejected' ? <X className="h-4 w-4" /> : done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'invisible' : i < current ? 'bg-accent' : 'bg-slate-200'}`} />
            </div>
            <p className={`mt-2 px-1 text-[11px] font-semibold leading-tight sm:text-xs ${active ? 'text-ink-900' : 'text-slate-400'}`}>{STATUS[s].label}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Riwayat perubahan status (append-only). */
export default function StatusTimeline({ history }) {
  return (
    <ol className="relative space-y-6 border-l-2 border-slate-100 pl-6">
      {history.map((h) => (
        <li key={h.id} className="relative">
          <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full ring-4 ring-white ${STATUS[h.to_status].dot}`} />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold">
              {h.from_status ? <>{STATUS[h.from_status].label} → {STATUS[h.to_status].label}</> : STATUS[h.to_status].label}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDateTime(h.changed_at)} · oleh <b className="text-ink-700">{h.changed_by.name}</b> ({ROLE_LABEL[h.changed_by.role]})
          </p>
          {h.notes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-ink-700">{h.notes}</p>}
          {h.reason && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"><b>Alasan penolakan:</b> {h.reason}</p>
          )}
          {h.photos?.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">Foto bukti penyelesaian</p>
              <PhotoGallery photos={h.photos} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
