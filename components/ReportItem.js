'use client';

import Link from 'next/link';
import { MapPin, ChevronRight, UserCheck, ImageOff } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { timeAgo } from '@/lib/client/constants';
import { categoryVisual } from '@/lib/client/categoryIcon';

export default function ReportItem({ report: r, href, showOfficer = false }) {
  const { Icon, cls } = categoryVisual(r.category?.name);
  return (
    <Link href={href || `/laporan/${r.id}`} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-[72px] sm:w-[72px]">
        {r.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300"><ImageOff className="h-6 w-6" /></span>
        )}
        <span className={`absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-lg ${cls} ring-2 ring-white`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">{r.report_number}</span>
          <StatusBadge status={r.status} />
        </div>
        <p className="mt-1 truncate font-bold text-ink-900 group-hover:text-accent">{r.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{r.address || r.location?.address}</span></span>
          {showOfficer && (
            <span className="inline-flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5" /> {r.assigned_officer?.name || <i>Belum ditugaskan</i>}
            </span>
          )}
          <span>{timeAgo(r.created_at)}</span>
        </div>
      </div>
      <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-300 group-hover:text-accent sm:block" />
    </Link>
  );
}
