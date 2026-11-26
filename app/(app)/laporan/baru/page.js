'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, CheckCircle2, Copy, Eye, FilePlus2 } from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { api } from '@/lib/client/api';
import { categoryVisual } from '@/lib/client/categoryIcon';
import { PageHeader, Field, ErrorBox, Spinner, EmptyState } from '@/components/ui';
import PhotoPicker from '@/components/PhotoPicker';
import LocationPicker from '@/components/LocationPicker';

const EMPTY = { title: '', category_id: '', description: '', latitude: '', longitude: '', address: '', region: '' };
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function NewReportPage() {
  const { user } = useAuth();
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const idemKey = useRef(newKey());

  useEffect(() => { api('/categories').then((r) => setCats(r.data)).catch(() => {}); }, []);

  if (user.role !== 'citizen') {
    return <EmptyState title="Khusus masyarakat" desc="Hanya akun masyarakat yang dapat mengirim laporan." />;
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = ['Judul laporan wajib diisi.'];
    if (!form.category_id) e.category_id = ['Kategori wajib dipilih.'];
    if (!form.description.trim()) e.description = ['Deskripsi wajib diisi.'];
    if (!photos.length) e.photos = ['Minimal satu foto bukti wajib dilampirkan.'];
    if (form.latitude === '' || form.longitude === '') e.latitude = ['Lokasi kejadian wajib ditentukan.'];
    if (!form.address.trim()) e.address = ['Alamat lokasi wajib diisi.'];
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setError('');
    if (Object.keys(e).length) {
      setError('Mohon lengkapi data yang wajib diisi.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v));
    photos.forEach((p) => fd.append('photos', p));
    try {
      const r = await api('/reports', { method: 'POST', form: fd, headers: { 'Idempotency-Key': idemKey.current } });
      setDone(r);
      idemKey.current = newKey();
      window.dispatchEvent(new Event('lw-notif'));
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.code === 'FILE_TOO_LARGE' || err.code === 'UNSUPPORTED_FILE_TYPE'
        ? `Upload foto gagal: ${err.message}`
        : `Laporan gagal dikirim: ${err.message}`);
      setErrors(err.errors || {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    const r = done.data;
    return (
      <div className="mx-auto max-w-lg py-6">
        <div className="card overflow-hidden text-center">
          <div className="bg-gradient-to-br from-emerald-500 to-brand-700 px-6 py-10 text-white">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 className="h-9 w-9" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold">{done.message}</h1>
            <p className="mt-1 text-white/80">Terima kasih telah peduli pada lingkungan sekitar.</p>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">Nomor laporan Anda</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="rounded-xl bg-slate-100 px-4 py-2 font-mono text-xl font-bold tracking-wide">{r.report_number}</span>
              <button className="btn-ghost p-2" onClick={() => navigator.clipboard?.writeText(r.report_number)} title="Salin" aria-label="Salin nomor laporan">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mx-auto mt-4 max-w-sm text-sm text-slate-500">
              Simpan nomor ini untuk memantau laporan. Anda akan menerima notifikasi setiap kali status laporan berubah.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href={`/laporan/${r.id}`} className="btn-primary"><Eye className="h-4 w-4" /> Lihat laporan</Link>
              <button className="btn-secondary" onClick={() => { setDone(null); setForm(EMPTY); setPhotos([]); setErrors({}); }}>
                <FilePlus2 className="h-4 w-4" /> Buat laporan lain
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Buat Laporan" subtitle="Ceritakan masalah yang Anda temukan. Kolom bertanda * wajib diisi." back="/dashboard" />
      <form onSubmit={submit} className="space-y-6" noValidate>
        <ErrorBox message={error} />

        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs text-white">1</span> Apa masalahnya?</h2>
          <Field label="Judul laporan" error={errors.title} required>
            <input className="input" maxLength={150} value={form.title} onChange={set('title')} placeholder="Contoh: Jalan berlubang di depan SD Negeri 5" />
          </Field>
          <Field label="Kategori" error={errors.category_id} required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cats.map((c) => {
                const { Icon, cls } = categoryVisual(c.name);
                const active = form.category_id === c.id;
                return (
                  <button type="button" key={c.id} onClick={() => setForm({ ...form, category_id: c.id })}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-semibold transition ${
                      active ? 'border-accent bg-accent/5 ring-2 ring-accent/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}><Icon className="h-4 w-4" /></span>
                    <span className="leading-tight">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Deskripsi" error={errors.description} required hint="Jelaskan kondisi, sejak kapan, dan dampaknya bagi warga.">
            <textarea className="input min-h-[120px]" value={form.description} onChange={set('description')} placeholder="Terdapat lubang besar yang membahayakan pengendara…" />
          </Field>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs text-white">2</span> Foto bukti <span className="text-rose-500">*</span></h2>
          <PhotoPicker files={photos} onChange={setPhotos} error={errors.photos} onError={(m) => setErrors((e) => ({ ...e, photos: m ? [m] : undefined }))} />
        </section>

        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs text-white">3</span> Di mana lokasinya? <span className="text-rose-500">*</span></h2>
          <LocationPicker value={form} onChange={setForm} errors={errors} />
          <Field label="Alamat / keterangan lokasi" error={errors.address} required>
            <input className="input" maxLength={255} value={form.address} onChange={set('address')} placeholder="Jl. Merdeka No. 21, dekat pos ronda" />
          </Field>
          <Field label="Kelurahan / kecamatan" error={errors.region} hint="Opsional, membantu statistik per wilayah.">
            <input className="input" maxLength={100} value={form.region} onChange={set('region')} placeholder="Medan Petisah" />
          </Field>
        </section>

        <div className="sticky bottom-20 z-10 lg:bottom-4">
          <button className="btn-primary w-full py-3.5 text-base shadow-lg" disabled={loading}>
            {loading ? <Spinner /> : <Send className="h-5 w-5" />} {loading ? 'Mengirim laporan…' : 'Kirim Laporan'}
          </button>
        </div>
      </form>
    </div>
  );
}
