'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Calendar, Tag, UserCheck, User, Globe2, Lock, ExternalLink, History, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { api } from '@/lib/client/api';
import { STATUS, formatDateTime } from '@/lib/client/constants';
import { categoryVisual } from '@/lib/client/categoryIcon';
import { PageHeader, PageLoader, StatusBadge, EmptyState, Avatar } from '@/components/ui';
import Map from '@/components/Map';
import PhotoGallery from '@/components/PhotoGallery';
import StatusTimeline, { StatusStepper } from '@/components/StatusTimeline';
import CommentSection from '@/components/CommentSection';
import { CitizenActions, OfficerActions, AdminActions } from '@/components/ReportActions';

export default function ReportDetailPage({ params }) {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r, h] = await Promise.all([api(`/reports/${params.id}`), api(`/reports/${params.id}/status-history`)]);
      setReport(r.data);
      setHistory(h.data);
      if (user.role !== 'citizen') {
        api(`/reports/${params.id}/assignment/history`).then((a) => setAssignments(a.data)).catch(() => {});
      }
    } catch (e) {
      setError(e);
    }
  }, [params.id, user.role]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return <EmptyState title={error.status === 404 ? 'Laporan tidak ditemukan' : 'Gagal memuat laporan'} desc={error.message} />;
  }
  if (!report) return <PageLoader />;

  const { Icon, cls } = categoryVisual(report.category.name);
  const evidence = report.photos.filter((p) => p.type === 'evidence');
  const resolution = report.photos.filter((p) => p.type === 'resolution');
  const { latitude: lat, longitude: lng } = report.location;

  return (
    <>
      <PageHeader back="/laporan" title={report.title}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><span className="font-mono">{report.report_number}</span> · <StatusBadge status={report.status} /></span>} />

      <div className="card mb-6 p-5">
        <StatusStepper status={report.status} />
        <p className="mt-4 text-center text-sm text-slate-500">{STATUS[report.status].desc}</p>
        {report.status === 'rejected' && report.rejection_reason && (
          <p className="mx-auto mt-3 max-w-xl rounded-xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
            <b>Alasan penolakan:</b> {report.rejection_reason}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <PhotoGallery photos={evidence} emptyText="Belum ada foto bukti." />
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={`chip ring-transparent ${cls}`}><Icon className="h-3.5 w-3.5" /> {report.category.name}</span>
              <span className="chip bg-slate-50 text-slate-600 ring-slate-200">
                {report.visibility === 'public' ? <><Globe2 className="h-3.5 w-3.5" /> Publik</> : <><Lock className="h-3.5 w-3.5" /> Privat</>}
              </span>
            </div>
            <h2 className="mt-4 font-bold">Deskripsi</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{report.description}</p>
          </section>

          {resolution.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-bold text-emerald-700">Bukti penyelesaian</h2>
              <PhotoGallery photos={resolution} />
            </section>
          )}

          <section className="card overflow-hidden">
            <div className="p-5 pb-3">
              <h2 className="flex items-center gap-2 font-bold"><MapPin className="h-5 w-5 text-accent" /> Lokasi kejadian</h2>
              <p className="mt-1 text-sm text-ink-700">{report.location.address}</p>
              {report.location.region && <p className="text-xs text-slate-500">{report.location.region}</p>}
            </div>
            <Map lat={lat} lng={lng} height={280} />
            <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
              <span>{lat.toFixed(6)}, {lng.toFixed(6)}</span>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                Petunjuk arah <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-5 flex items-center gap-2 font-bold"><History className="h-5 w-5 text-accent" /> Riwayat status</h2>
            <StatusTimeline history={history} />
          </section>

          <section className="card p-5">
            <h2 className="mb-5 flex items-center gap-2 font-bold"><MessageSquare className="h-5 w-5 text-accent" /> Diskusi</h2>
            <CommentSection reportId={report.id} />
          </section>
        </div>

        <aside className="space-y-6">
          {user.role === 'citizen' && <CitizenActions report={report} />}
          {user.role === 'officer' && <OfficerActions report={report} onChanged={load} />}
          {user.role === 'admin' && <AdminActions report={report} onChanged={load} />}

          <div className="card divide-y divide-slate-100">
            {[
              [Calendar, 'Dikirim', formatDateTime(report.created_at)],
              [Tag, 'Kategori', report.category.name],
              report.reporter && [User, 'Pelapor', report.reporter.name],
              [UserCheck, 'Petugas', report.assigned_officer?.name || 'Belum ditugaskan'],
              report.resolved_at && [Calendar, 'Selesai', formatDateTime(report.resolved_at)],
            ].filter(Boolean).map(([I, k, v]) => (
              <div key={k} className="flex items-start gap-3 p-4">
                <I className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="text-sm font-semibold">{v}</p>
                </div>
              </div>
            ))}
          </div>

          {user.role !== 'citizen' && assignments.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400"><Users className="h-4 w-4" /> Riwayat penugasan</h3>
              <ul className="space-y-4">
                {assignments.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <Avatar name={a.officer.name} className="h-8 w-8 text-xs" />
                    <div className="text-sm">
                      <p className="font-semibold">{a.officer.name} {a.is_current && <span className="chip ml-1 bg-emerald-50 py-0 text-[10px] text-emerald-700 ring-emerald-200">Aktif</span>}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(a.assigned_at)} · oleh {a.assigned_by.name}</p>
                      {a.reason && <p className="mt-1 text-xs text-ink-700">Alasan: {a.reason}</p>}
                      {a.notes && <p className="mt-1 text-xs text-slate-500">Catatan: {a.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
