'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Send, BadgeCheck, RefreshCw, XCircle, CheckCircle2, ClipboardList } from 'lucide-react';
import { api, qs } from '@/lib/client/api';
import { timeAgo } from '@/lib/client/constants';
import { useToast } from '@/components/Providers';
import { PageHeader, PageLoader, EmptyState, Pagination, ErrorBox } from '@/components/ui';

const TYPE = {
  report_submitted: [Send, 'bg-slate-100 text-slate-600'],
  report_verified: [BadgeCheck, 'bg-sky-50 text-sky-600'],
  status_changed: [RefreshCw, 'bg-violet-50 text-violet-600'],
  report_rejected: [XCircle, 'bg-rose-50 text-rose-600'],
  report_resolved: [CheckCircle2, 'bg-emerald-50 text-emerald-600'],
  report_assigned: [ClipboardList, 'bg-amber-50 text-amber-600'],
};

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/notifications${qs({ is_read: tab, page, per_page: 15 })}`).then(setResult).catch((e) => setError(e.message));
  }, [tab, page]);
  useEffect(() => { setResult(null); load(); }, [load]);

  const open = async (n) => {
    if (!n.is_read) {
      await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
      window.dispatchEvent(new Event('lw-notif'));
    }
    if (n.report_id) router.push(`/laporan/${n.report_id}`);
    else load();
  };

  const readAll = async () => {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      window.dispatchEvent(new Event('lw-notif'));
      toast.success('Semua notifikasi ditandai dibaca');
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifikasi" subtitle={result ? `${result.meta.unread_count} belum dibaca` : ' '}
        action={<button className="btn-secondary" onClick={readAll}><CheckCheck className="h-4 w-4" /> Tandai semua dibaca</button>} />
      <div className="mb-4 flex gap-2">
        {[['', 'Semua'], ['false', 'Belum dibaca'], ['true', 'Sudah dibaca']].map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-accent text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        {error ? <div className="p-4"><ErrorBox message={error} /></div> : !result ? <PageLoader /> : result.data.length === 0 ? (
          <EmptyState icon={Bell} title="Tidak ada notifikasi" desc="Kabar terbaru tentang laporan Anda akan muncul di sini." />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {result.data.map((n) => {
                const [Icon, cls] = TYPE[n.type] || TYPE.status_changed;
                return (
                  <li key={n.id}>
                    <button onClick={() => open(n)} className={`flex w-full gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${n.is_read ? '' : 'bg-accent/[0.04]'}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cls}`}><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${n.is_read ? 'font-semibold text-ink-700' : 'font-bold text-ink-900'}`}>{n.title}</p>
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-accent" />}
                        </div>
                        <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Pagination meta={result.meta} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
