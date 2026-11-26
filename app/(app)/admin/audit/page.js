'use client';

import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { api, qs } from '@/lib/client/api';
import { ROLE_LABEL, formatDateTime } from '@/lib/client/constants';
import { PageHeader, PageLoader, EmptyState, Pagination, ErrorBox } from '@/components/ui';

const ACTION_LABEL = {
  'report.status_changed': 'Ubah status laporan',
  'report.assigned': 'Tugaskan petugas',
  'report.reassigned': 'Ganti petugas',
  'report.deleted': 'Hapus laporan',
  'report.visibility_changed': 'Ubah visibilitas',
  'comment.moderated': 'Moderasi komentar',
  'user.created': 'Buat akun',
  'user.updated': 'Ubah akun',
  'user.activated': 'Aktifkan akun',
  'user.deactivated': 'Nonaktifkan akun',
  'category.created': 'Tambah kategori',
  'category.updated': 'Ubah kategori',
  'announcement.created': 'Buat pengumuman',
  'announcement.updated': 'Ubah pengumuman',
  'announcement.deleted': 'Hapus pengumuman',
};

export default function AuditPage() {
  const [f, setF] = useState({ entity_type: '', date_from: '', date_to: '', page: 1 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setResult(null);
    api(`/audit-logs${qs({ ...f, per_page: 20 })}`).then(setResult).catch((e) => setError(e.message));
  }, [f]);

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Catatan aktivitas penting: perubahan status, penugasan, penghapusan, moderasi, dan perubahan akun." />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <select className="input w-auto" value={f.entity_type} onChange={(e) => setF({ ...f, entity_type: e.target.value, page: 1 })} aria-label="Jenis data">
            <option value="">Semua jenis</option>
            <option value="report">Laporan</option>
            <option value="user">Pengguna</option>
            <option value="category">Kategori</option>
            <option value="comment">Komentar</option>
            <option value="announcement">Pengumuman</option>
          </select>
          <input type="date" className="input w-auto" value={f.date_from} onChange={(e) => setF({ ...f, date_from: e.target.value, page: 1 })} aria-label="Dari tanggal" />
          <input type="date" className="input w-auto" value={f.date_to} onChange={(e) => setF({ ...f, date_to: e.target.value, page: 1 })} aria-label="Sampai tanggal" />
        </div>
        {error ? <div className="p-4"><ErrorBox message={error} /></div> : !result ? <PageLoader /> : result.data.length === 0 ? (
          <EmptyState icon={ScrollText} title="Belum ada aktivitas tercatat" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Pelaku</th><th className="px-5 py-3">Aktivitas</th><th className="px-5 py-3">Detail</th><th className="px-5 py-3">IP</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.data.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDateTime(a.created_at)}</td>
                      <td className="px-5 py-3"><p className="font-semibold">{a.actor.name}</p><p className="text-xs text-slate-400">{ROLE_LABEL[a.actor.role]}</p></td>
                      <td className="px-5 py-3"><span className="chip bg-slate-100 text-slate-700 ring-slate-200">{ACTION_LABEL[a.action] || a.action}</span></td>
                      <td className="max-w-xs px-5 py-3">
                        {a.metadata && <code className="block truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-600" title={JSON.stringify(a.metadata)}>{JSON.stringify(a.metadata)}</code>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">{a.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={result.meta} onChange={(p) => setF({ ...f, page: p })} />
          </>
        )}
      </div>
    </>
  );
}
