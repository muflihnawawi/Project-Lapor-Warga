'use client';

import { useState } from 'react';
import { Save, KeyRound, Mail, Shield, CalendarDays } from 'lucide-react';
import { useAuth, useToast } from '@/components/Providers';
import { api } from '@/lib/client/api';
import { ROLE_LABEL, formatDate } from '@/lib/client/constants';
import { PageHeader, Field, Spinner, Avatar } from '@/components/ui';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [pErr, setPErr] = useState({});
  const [pBusy, setPBusy] = useState(false);
  const [pw, setPw] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [pwErr, setPwErr] = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setPBusy(true);
    setPErr({});
    try {
      const r = await api('/me', { method: 'PATCH', body: { name: profile.name, phone: profile.phone || null } });
      updateUser(r.data);
      toast.success(r.message);
    } catch (err) { setPErr(err.errors || {}); toast.error(err.message); }
    setPBusy(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwBusy(true);
    setPwErr({});
    try {
      const r = await api('/auth/change-password', { method: 'POST', body: pw });
      setPw({ current_password: '', new_password: '', new_password_confirmation: '' });
      toast.success(r.message);
    } catch (err) { setPwErr(err.errors || {}); toast.error(err.message); }
    setPwBusy(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profil Saya" subtitle="Kelola informasi akun dan keamanan Anda." />
      <div className="card mb-6 flex flex-wrap items-center gap-5 p-6">
        <Avatar name={user.name} className="h-16 w-16 text-xl" />
        <div className="flex-1">
          <p className="text-xl font-extrabold">{user.name}</p>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> {user.email}</span>
            <span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4" /> {ROLE_LABEL[user.role]}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Bergabung {formatDate(user.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          <h2 className="font-bold">Informasi pribadi</h2>
          <Field label="Nama lengkap" error={pErr.name}>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </Field>
          <Field label="Nomor telepon" error={pErr.phone} hint="Tidak pernah ditampilkan ke publik.">
            <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </Field>
          <Field label="Email" hint="Email tidak dapat diubah.">
            <input className="input" value={user.email} disabled />
          </Field>
          <button className="btn-primary" disabled={pBusy}>{pBusy ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Simpan profil</button>
        </form>

        <form onSubmit={savePassword} className="card space-y-4 p-6">
          <h2 className="font-bold">Ubah password</h2>
          <Field label="Password saat ini" error={pwErr.current_password}>
            <input type="password" className="input" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} autoComplete="current-password" />
          </Field>
          <Field label="Password baru" error={pwErr.new_password}>
            <input type="password" className="input" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label="Ulangi password baru" error={pwErr.new_password_confirmation}>
            <input type="password" className="input" value={pw.new_password_confirmation} onChange={(e) => setPw({ ...pw, new_password_confirmation: e.target.value })} autoComplete="new-password" />
          </Field>
          <button className="btn-primary" disabled={pwBusy}>{pwBusy ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />} Ubah password</button>
          <p className="text-xs text-slate-400">Setelah password diubah, semua sesi login akan berakhir dan Anda perlu masuk kembali nanti.</p>
        </form>
      </div>
    </div>
  );
}
