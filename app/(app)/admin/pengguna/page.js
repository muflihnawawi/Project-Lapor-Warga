'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, UserPlus, Pencil, Power } from 'lucide-react';
import { api, qs } from '@/lib/client/api';
import { ROLE_LABEL, formatDate } from '@/lib/client/constants';
import { useAuth, useToast } from '@/components/Providers';
import { PageHeader, PageLoader, EmptyState, Pagination, Modal, Field, Spinner, Avatar, ErrorBox } from '@/components/ui';

const ROLE_CHIP = {
  citizen: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  officer: 'bg-sky-50 text-sky-700 ring-sky-200',
  admin: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ role: '', is_active: '', search: '', page: 1 });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', data}
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/users${qs(f)}`).then(setResult).catch((e) => setError(e.message));
  }, [f]);
  useEffect(() => { setResult(null); load(); }, [load]);

  const save = async () => {
    setBusy(true);
    setErrors({});
    const d = modal.data;
    try {
      if (modal.mode === 'create') {
        await api('/users', { method: 'POST', body: { name: d.name, email: d.email, phone: d.phone || undefined, password: d.password, role: d.role } });
        toast.success('Akun berhasil dibuat');
      } else {
        await api(`/users/${d.id}`, { method: 'PATCH', body: { name: d.name, phone: d.phone || null, role: d.role } });
        toast.success('Data pengguna diperbarui');
      }
      setModal(null);
      load();
    } catch (e) { setErrors(e.errors || {}); toast.error(e.message); }
    setBusy(false);
  };

  const toggle = async (u) => {
    try {
      const r = await api(`/users/${u.id}/status`, { method: 'PATCH', body: { is_active: !u.is_active } });
      toast.success(r.message);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const setD = (k) => (e) => setModal({ ...modal, data: { ...modal.data, [k]: e.target.value } });

  return (
    <>
      <PageHeader title="Manajemen Pengguna" subtitle="Buat akun petugas dan kelola status akun pengguna."
        action={<button className="btn-primary" onClick={() => { setErrors({}); setModal({ mode: 'create', data: { role: 'officer' } }); }}><UserPlus className="h-4 w-4" /> Tambah akun</button>} />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <form className="relative min-w-[200px] flex-1" onSubmit={(e) => { e.preventDefault(); setF({ ...f, search, page: 1 }); }}>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Cari nama atau email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <select className="input w-auto" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, page: 1 })} aria-label="Role">
            <option value="">Semua role</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input w-auto" value={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.value, page: 1 })} aria-label="Status">
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>

        {error ? <div className="p-4"><ErrorBox message={error} /></div> : !result ? <PageLoader /> : result.data.length === 0 ? <EmptyState title="Tidak ada pengguna" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Pengguna</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Bergabung</th><th className="px-5 py-3 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} className="h-9 w-9 text-xs" />
                        <div><p className="font-semibold">{u.name} {u.id === me.id && <span className="text-xs text-slate-400">(Anda)</span>}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className={`chip ${ROLE_CHIP[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                    <td className="px-5 py-3">
                      <span className={`chip ${u.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost px-2.5 py-1.5" title="Ubah" onClick={() => { setErrors({}); setModal({ mode: 'edit', data: { ...u, phone: u.phone || '' } }); }}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        {u.id !== me.id && (
                          <button className={`btn-ghost px-2.5 py-1.5 ${u.is_active ? 'text-rose-600' : 'text-emerald-600'}`} title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggle(u)}>
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={result.meta} onChange={(p) => setF({ ...f, page: p })} />
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Tambah akun petugas / admin' : 'Ubah pengguna'}
        footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner className="h-4 w-4" />} Simpan</button></>}>
        {modal && (
          <div className="space-y-4">
            <Field label="Nama" error={errors.name} required><input className="input" value={modal.data.name || ''} onChange={setD('name')} /></Field>
            {modal.mode === 'create' ? (
              <Field label="Email" error={errors.email} required><input className="input" type="email" value={modal.data.email || ''} onChange={setD('email')} /></Field>
            ) : (
              <Field label="Email"><input className="input" value={modal.data.email} disabled /></Field>
            )}
            <Field label="Telepon" error={errors.phone}><input className="input" value={modal.data.phone || ''} onChange={setD('phone')} /></Field>
            <Field label="Role" error={errors.role} required>
              <select className="input" value={modal.data.role} onChange={setD('role')}>
                {modal.mode === 'edit' && <option value="citizen">Masyarakat</option>}
                <option value="officer">Petugas</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>
            {modal.mode === 'create' && (
              <Field label="Password awal" error={errors.password} required hint="Minimal 8 karakter. Minta pengguna mengganti setelah login.">
                <input className="input" type="password" value={modal.data.password || ''} onChange={setD('password')} />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
