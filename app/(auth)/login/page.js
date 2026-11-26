'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { Field, ErrorBox, Spinner } from '@/components/ui';

const DEMO = [
  ['Warga', 'warga@laporwarga.test'],
  ['Petugas', 'petugas@laporwarga.test'],
  ['Admin', 'admin@laporwarga.test'],
];

function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: params.get('email') || '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (ready && user) router.replace('/dashboard');
  }, [ready, user, router]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrors({});
    try {
      await login(form.email, form.password);
      router.replace(params.get('next') || '/dashboard');
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || {});
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Masuk ke akun Anda</h1>
      <p className="mt-2 text-slate-500">Selamat datang kembali! Silakan masuk untuk melanjutkan.</p>
      {params.get('registered') && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Registrasi berhasil. Silakan masuk dengan akun baru Anda.
        </div>
      )}
      <form onSubmit={submit} className="mt-8 space-y-5">
        <ErrorBox message={error} />
        <Field label="Email" error={errors.email}>
          <input className="input" type="email" autoComplete="email" placeholder="nama@email.com" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Password" error={errors.password}>
          <div className="relative">
            <input className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
              aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner /> : <LogIn className="h-5 w-5" />} Masuk
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Belum punya akun? <Link href="/register" className="font-semibold text-accent hover:underline">Daftar sebagai warga</Link>
      </p>

      <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Akun demo · password: password123</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map(([label, email]) => (
            <button key={email} type="button" className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() => setForm({ email, password: 'password123' })}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
