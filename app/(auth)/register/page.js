'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/client/api';
import { Field, ErrorBox, Spinner } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrors({});
    try {
      await api('/auth/register', { method: 'POST', body: { ...form, phone: form.phone || undefined } });
      router.push(`/login?registered=1&email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || {});
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Buat akun warga</h1>
      <p className="mt-2 text-slate-500">Daftar gratis untuk mulai melaporkan masalah di lingkungan Anda.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <ErrorBox message={error && !Object.keys(errors).length ? error : ''} />
        <Field label="Nama lengkap" error={errors.name} required>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Budi Santoso" required />
        </Field>
        <Field label="Email" error={errors.email} required>
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="nama@email.com" required />
        </Field>
        <Field label="Nomor telepon" error={errors.phone} hint="Opsional. Tidak akan ditampilkan ke publik.">
          <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="0812xxxxxxxx" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" error={errors.password} required>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 karakter" required />
          </Field>
          <Field label="Ulangi password" error={errors.password_confirmation} required>
            <input className="input" type="password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
          </Field>
        </div>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner /> : <UserPlus className="h-5 w-5" />} Daftar
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Sudah punya akun? <Link href="/login" className="font-semibold text-accent hover:underline">Masuk</Link>
      </p>
    </>
  );
}
