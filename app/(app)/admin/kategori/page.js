'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { api } from '@/lib/client/api';
import { categoryVisual } from '@/lib/client/categoryIcon';
import { useToast } from '@/components/Providers';
import { PageHeader, PageLoader, Modal, Field, Spinner, ErrorBox } from '@/components/ui';

export default function CategoriesPage() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/categories?include_inactive=true').then((r) => setItems(r.data)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    setBusy(true);
    setErrors({});
    const { id, name, description, is_active } = modal;
    try {
      if (id) await api(`/categories/${id}`, { method: 'PATCH', body: { name, description: description || null, is_active } });
      else await api('/categories', { method: 'POST', body: { name, description: description || undefined, is_active } });
      toast.success(id ? 'Kategori diperbarui' : 'Kategori ditambahkan');
      setModal(null);
      load();
    } catch (e) { setErrors(e.errors || {}); toast.error(e.message); }
    setBusy(false);
  };

  const toggle = async (c) => {
    try {
      await api(`/categories/${c.id}`, { method: 'PATCH', body: { is_active: !c.is_active } });
      toast.success(c.is_active ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan');
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Kategori Laporan" subtitle="Kategori nonaktif tidak dapat dipilih untuk laporan baru, namun laporan lama tetap menyimpan kategorinya."
        action={<button className="btn-primary" onClick={() => { setErrors({}); setModal({ name: '', description: '', is_active: true }); }}><Plus className="h-4 w-4" /> Tambah kategori</button>} />
      {error ? <ErrorBox message={error} /> : !items ? <PageLoader /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const { Icon, cls } = categoryVisual(c.name);
            return (
              <div key={c.id} className={`card p-5 ${c.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${cls}`}><Icon className="h-5 w-5" /></span>
                  <button className="btn-ghost px-2 py-1.5" onClick={() => { setErrors({}); setModal({ ...c, description: c.description || '' }); }} aria-label="Ubah">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-4 font-bold">{c.name}</p>
                <p className="mt-1 min-h-[1.25rem] text-sm text-slate-500">{c.description || '—'}</p>
                <label className="mt-4 flex cursor-pointer items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  <span className="font-medium text-ink-700">{c.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  <button type="button" role="switch" aria-checked={c.is_active} onClick={() => toggle(c)}
                    className={`relative h-6 w-11 rounded-full transition ${c.is_active ? 'bg-accent' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${c.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </label>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Ubah kategori' : 'Tambah kategori'}
        footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner className="h-4 w-4" />} Simpan</button></>}>
        {modal && (
          <div className="space-y-4">
            <Field label="Nama kategori" error={errors.name} required>
              <input className="input" maxLength={100} value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
            </Field>
            <Field label="Contoh permasalahan" error={errors.description}>
              <input className="input" maxLength={255} value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={modal.is_active} onChange={(e) => setModal({ ...modal, is_active: e.target.checked })} />
              Kategori aktif
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
