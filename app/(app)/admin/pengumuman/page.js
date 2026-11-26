'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/client/api';
import { formatDate, formatDateTime } from '@/lib/client/constants';
import { useToast } from '@/components/Providers';
import { PageHeader, PageLoader, Modal, Field, Spinner, ErrorBox, EmptyState } from '@/components/ui';
import { ANN_TYPE } from '@/components/Landing';

const EMPTY = { title: '', body: '', type: 'info', is_published: true, expires_at: '' };

export default function AnnouncementsAdminPage() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/announcements?all=true').then((r) => setItems(r.data)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const isExpired = (a) => a.expires_at && a.expires_at < today;

  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = { title: modal.title, body: modal.body, type: modal.type, is_published: modal.is_published, expires_at: modal.expires_at || null };
    try {
      if (modal.id) await api(`/announcements/${modal.id}`, { method: 'PATCH', body });
      else await api('/announcements', { method: 'POST', body });
      toast.success(modal.id ? 'Pengumuman diperbarui' : 'Pengumuman diterbitkan');
      setModal(null);
      load();
    } catch (e) { setErrors(e.errors || {}); toast.error(e.message); }
    setBusy(false);
  };

  const togglePublish = async (a) => {
    try {
      await api(`/announcements/${a.id}`, { method: 'PATCH', body: { is_published: !a.is_published } });
      toast.success(a.is_published ? 'Pengumuman disembunyikan' : 'Pengumuman diterbitkan');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async () => {
    try {
      await api(`/announcements/${del.id}`, { method: 'DELETE' });
      toast.success('Pengumuman dihapus');
      setDel(null);
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Pengumuman" subtitle="Informasi yang tampil di halaman depan untuk seluruh masyarakat, tanpa perlu login."
        action={<button className="btn-primary" onClick={() => { setErrors({}); setModal({ ...EMPTY }); }}><Plus className="h-4 w-4" /> Buat pengumuman</button>} />

      {error ? <ErrorBox message={error} /> : !items ? <PageLoader /> : items.length === 0 ? (
        <div className="card"><EmptyState icon={Megaphone} title="Belum ada pengumuman" desc="Buat pengumuman seperti jadwal perbaikan jalan, kerja bakti, atau gangguan layanan." /></div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const t = ANN_TYPE[a.type] || ANN_TYPE.info;
            const live = a.is_published && !isExpired(a);
            return (
              <div key={a.id} className={`card flex flex-wrap items-start gap-4 p-5 ${live ? '' : 'opacity-70'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip ${t.cls}`}><t.Icon className="h-3.5 w-3.5" /> {t.label}</span>
                    {live ? <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">Tampil</span>
                      : isExpired(a) ? <span className="chip bg-slate-100 text-slate-500 ring-slate-200">Kedaluwarsa</span>
                      : <span className="chip bg-slate-100 text-slate-500 ring-slate-200">Draf</span>}
                  </div>
                  <p className="mt-2 font-bold">{a.title}</p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Dibuat {formatDateTime(a.created_at)}{a.expires_at && ` · berlaku s.d. ${formatDate(`${a.expires_at}T12:00:00+07:00`)}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost px-2.5 py-1.5" title={a.is_published ? 'Sembunyikan' : 'Terbitkan'} onClick={() => togglePublish(a)}>
                    {a.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button className="btn-ghost px-2.5 py-1.5" title="Ubah" onClick={() => { setErrors({}); setModal({ ...a, expires_at: a.expires_at || '' }); }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost px-2.5 py-1.5 text-rose-600" title="Hapus" onClick={() => setDel(a)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Ubah pengumuman' : 'Buat pengumuman'}
        footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner className="h-4 w-4" />} Simpan</button></>}>
        {modal && (
          <div className="space-y-4">
            <Field label="Jenis" error={errors.type}>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ANN_TYPE).map(([k, t]) => (
                  <button key={k} type="button" onClick={() => setModal({ ...modal, type: k })}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm font-semibold ${modal.type === k ? 'border-accent bg-accent/5 ring-2 ring-accent/20' : 'border-slate-200'}`}>
                    <t.Icon className="h-4 w-4 text-accent" /> {t.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Judul" error={errors.title} required>
              <input className="input" maxLength={150} value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })}
                placeholder="Perbaikan Jl. Merdeka 1–3 Desember" />
            </Field>
            <Field label="Isi pengumuman" error={errors.body} required>
              <textarea className="input min-h-[140px]" maxLength={2000} value={modal.body} onChange={(e) => setModal({ ...modal, body: e.target.value })} />
            </Field>
            <Field label="Tampil sampai tanggal" error={errors.expires_at} hint="Kosongkan jika tidak ada batas waktu.">
              <input type="date" className="input" value={modal.expires_at} onChange={(e) => setModal({ ...modal, expires_at: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={modal.is_published}
                onChange={(e) => setModal({ ...modal, is_published: e.target.checked })} />
              Terbitkan di halaman depan
            </label>
          </div>
        )}
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Hapus pengumuman?"
        footer={<><button className="btn-secondary" onClick={() => setDel(null)}>Batal</button><button className="btn-danger" onClick={remove}>Hapus</button></>}>
        <p className="text-sm text-slate-600">Pengumuman <b>{del?.title}</b> akan dihapus permanen.</p>
      </Modal>
    </>
  );
}
