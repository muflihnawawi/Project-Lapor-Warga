'use client';

import { useEffect, useState } from 'react';
import { MapPin, Calendar, ShieldCheck, MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { api } from '@/lib/client/api';
import { formatDateTime } from '@/lib/client/constants';
import { categoryVisual } from '@/lib/client/categoryIcon';
import { PageHeader, PageLoader, StatusBadge, EmptyState } from '@/components/ui';
import Map from '@/components/Map';
import PhotoGallery from '@/components/PhotoGallery';
import { StatusStepper } from '@/components/StatusTimeline';
import CommentSection from '@/components/CommentSection';

export default function PublicReportDetail({ params }) {
  const { user } = useAuth();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/public/reports/${encodeURIComponent(params.number)}`).then((x) => setR(x.data)).catch((e) => setError(e.message));
  }, [params.number]);

  if (error) return <EmptyState title="Laporan publik tidak ditemukan" desc={error} />;
  if (!r) return <PageLoader />;
  const { Icon, cls } = categoryVisual(r.category.name);

  return (
    <>
      <PageHeader back="/publik" title={r.title} subtitle={<span className="inline-flex items-center gap-2"><span className="font-mono">{r.report_number}</span> · <StatusBadge status={r.status} /></span>} />
      <div className="card mb-6 p-5"><StatusStepper status={r.status} /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <PhotoGallery photos={r.photos} emptyText="Tidak ada foto yang ditampilkan untuk publik." />
            <span className={`chip mt-5 ring-transparent ${cls}`}><Icon className="h-3.5 w-3.5" /> {r.category.name}</span>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{r.description}</p>
          </section>
          <section className="card p-5">
            <h2 className="mb-5 flex items-center gap-2 font-bold"><MessageSquare className="h-5 w-5 text-accent" /> Diskusi</h2>
            <CommentSection reportId={r.id} canPost={user.role !== 'officer'}
              disabledReason="Petugas hanya dapat berkomentar pada laporan yang ditugaskan kepadanya." />
          </section>
        </div>
        <aside className="space-y-6">
          <div className="card overflow-hidden">
            <Map lat={r.location.latitude} lng={r.location.longitude} height={220} />
            <div className="space-y-3 p-4 text-sm">
              <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {r.location.address}</p>
              <p className="flex gap-2"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {formatDateTime(r.created_at)}</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            Identitas pelapor dilindungi dan tidak ditampilkan pada laporan publik.
          </div>
        </aside>
      </div>
    </>
  );
}
