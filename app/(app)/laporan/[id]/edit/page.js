'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/client/api';
import { useToast } from '@/components/Providers';
import { PageHeader, PageLoader, Field, ErrorBox, Spinner, EmptyState } from '@/components/ui';
import LocationPicker from '@/components/LocationPicker';
import PhotoPicker from '@/components/PhotoPicker';

export default function EditReportPage({ params }) {
  const router = useRouter();
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPhotos, setNewPhotos] = useState([]);
  const [photoErr, setPhotoErr] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api(`/reports/${params.id}`);
      setReport(r.data);
      setForm((f) => f || {
        title: r.data.title, category_id: r.data.category.id, description: r.data.description,
        latitude: String(r.data.location.latitude), longitude: String(r.data.location.longitude),
        address: r.data.location.address, region: r.data.location.region || '',
      });
    } catch (e) { setError(e.message); }
  }, [params.id]);

  useEffect(() => { load(); api('/categories').then((r) => setCats(r.data)).catch(() => {}); }, [load]);

  if (error && !report) return <EmptyState title="Laporan tidak dapat dibuka" desc={error} />;
  if (!report || !form) return <PageLoader />;
  if (report.status !== 'submitted') {
    return <EmptyState title="Laporan tidak dapat diubah" desc="Laporan yang sudah diproses tidak dapat diubah lagi." />;
  }

  const evidence = report.photos.filter((p) => p.type === 'evidence');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setError('');
    try {
      await api(`/reports/${report.id}`, { method: 'PATCH', body: { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) } });
      toast.success('Laporan berhasil diperbarui');
      router.push(`/laporan/${report.id}`);
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || {});
      setSaving(false);
    }
  };

  const deletePhoto = async (id) => {
    try {
      await api(`/reports/${report.id}/photos/${id}`, { method: 'DELETE' });
      toast.success('Foto dihapus');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const upload = async () => {
    setUploading(true);
    const fd = new FormData();
    newPhotos.forEach((p) => fd.append('photos', p));
    try {
      await api(`/reports/${report.id}/photos`, { method: 'POST', form: fd });
      setNewPhotos([]);
      toast.success('Foto ditambahkan');
      load();
    } catch (err) { setPhotoErr(err.message); }
    setUploading(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ubah Laporan" subtitle={report.report_number} back={`/laporan/${report.id}`} />
      <div className="space-y-6">
        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="font-bold">Foto bukti</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {evidence.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {evidence.length > 1 && (
                  <button onClick={() => deletePhoto(p.id)} className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1.5 text-white hover:bg-rose-600" aria-label="Hapus foto">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {evidence.length < 5 && (
            <>
              <PhotoPicker files={newPhotos} onChange={setNewPhotos} max={5 - evidence.length} error={photoErr} onError={setPhotoErr} />
              {newPhotos.length > 0 && (
                <button className="btn-secondary" onClick={upload} disabled={uploading}>
                  {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Unggah {newPhotos.length} foto
                </button>
              )}
            </>
          )}
        </section>

        <form onSubmit={save} className="card space-y-5 p-5 sm:p-6" noValidate>
          <ErrorBox message={error} />
          <Field label="Judul laporan" error={errors.title} required>
            <input className="input" maxLength={150} value={form.title} onChange={set('title')} />
          </Field>
          <Field label="Kategori" error={errors.category_id} required>
            <select className="input" value={form.category_id} onChange={set('category_id')}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Deskripsi" error={errors.description} required>
            <textarea className="input min-h-[120px]" value={form.description} onChange={set('description')} />
          </Field>
          <LocationPicker value={form} onChange={setForm} errors={errors} />
          <Field label="Alamat / keterangan lokasi" error={errors.address} required>
            <input className="input" maxLength={255} value={form.address} onChange={set('address')} />
          </Field>
          <Field label="Kelurahan / kecamatan" error={errors.region}>
            <input className="input" maxLength={100} value={form.region} onChange={set('region')} />
          </Field>
          <button className="btn-primary w-full py-3" disabled={saving}>
            {saving ? <Spinner /> : <Save className="h-5 w-5" />} Simpan perubahan
          </button>
        </form>
      </div>
    </div>
  );
}
