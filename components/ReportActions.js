'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, BadgeCheck, XCircle, UserPlus, Repeat, Eye, Trash2, Pencil, PlayCircle, CheckCircle2, Lock, Globe2,
} from 'lucide-react';
import { api } from '@/lib/client/api';
import { useToast } from '@/components/Providers';
import { Modal, Field, Spinner } from '@/components/ui';
import PhotoPicker from '@/components/PhotoPicker';

function useAction(onDone) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const run = async (fn, success) => {
    setBusy(true);
    setErrors({});
    try {
      const r = await fn();
      toast.success(success || r?.message || 'Berhasil');
      await onDone?.();
      return true;
    } catch (e) {
      setErrors(e.errors || {});
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, errors, run, setErrors };
}

const Panel = ({ title, children, tone }) => (
  <div className={`card p-5 ${tone || ''}`}>
    <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">{title}</h3>
    <div className="space-y-2.5">{children}</div>
  </div>
);

export function CitizenActions({ report }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const { busy, run } = useAction();
  if (report.status !== 'submitted') {
    return (
      <Panel title="Aksi">
        <p className="flex gap-2 text-sm text-slate-500">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Laporan sudah diproses sehingga tidak dapat diubah atau dihapus.
        </p>
      </Panel>
    );
  }
  return (
    <Panel title="Aksi">
      <Link href={`/laporan/${report.id}/edit`} className="btn-secondary w-full"><Pencil className="h-4 w-4" /> Ubah laporan</Link>
      <button className="btn w-full text-rose-600 hover:bg-rose-50" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /> Hapus laporan</button>
      <p className="text-xs text-slate-400">Laporan hanya dapat diubah atau dihapus selama berstatus “Dikirim”.</p>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Hapus laporan?"
        footer={<>
          <button className="btn-secondary" onClick={() => setConfirm(false)}>Batal</button>
          <button className="btn-danger" disabled={busy} onClick={async () => {
            if (await run(() => api(`/reports/${report.id}`, { method: 'DELETE' }))) router.replace('/laporan');
          }}>{busy && <Spinner className="h-4 w-4" />} Hapus</button>
        </>}>
        <p className="text-sm text-slate-600">Laporan <b>{report.report_number}</b> akan dihapus dan tidak dapat dipulihkan.</p>
      </Modal>
    </Panel>
  );
}

export function OfficerActions({ report, onChanged }) {
  const [modal, setModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoErr, setPhotoErr] = useState('');
  const { busy, errors, run } = useAction(onChanged);

  const close = () => { setModal(null); setNotes(''); setPhotos([]); setPhotoErr(''); };

  const submit = async () => {
    let ok;
    if (modal === 'resolved' && photos.length) {
      const fd = new FormData();
      fd.append('status', 'resolved');
      if (notes) fd.append('notes', notes);
      photos.forEach((p) => fd.append('photos', p));
      ok = await run(() => api(`/reports/${report.id}/status`, { method: 'PATCH', form: fd }));
    } else {
      ok = await run(() => api(`/reports/${report.id}/status`, { method: 'PATCH', body: { status: modal, notes: notes || undefined } }));
    }
    if (ok) close();
  };

  return (
    <Panel title="Tindak lanjut petugas" tone="ring-1 ring-accent/20">
      {report.status === 'verified' && (
        <>
          <p className="text-sm text-slate-600">Laporan siap ditangani. Mulai penanganan saat Anda menuju lokasi.</p>
          <button className="btn-primary w-full" onClick={() => setModal('in_progress')}><PlayCircle className="h-4 w-4" /> Mulai Tangani</button>
        </>
      )}
      {report.status === 'in_progress' && (
        <>
          <p className="text-sm text-slate-600">Setelah masalah selesai, unggah foto bukti dan tandai laporan selesai.</p>
          <button className="btn-primary w-full" onClick={() => setModal('resolved')}><CheckCircle2 className="h-4 w-4" /> Tandai Selesai</button>
        </>
      )}
      {['resolved', 'rejected'].includes(report.status) && (
        <p className="flex gap-2 text-sm text-slate-500"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Laporan telah mencapai status akhir.</p>
      )}

      <Modal open={!!modal} onClose={close} title={modal === 'resolved' ? 'Selesaikan laporan' : 'Mulai penanganan'}
        footer={<>
          <button className="btn-secondary" onClick={close}>Batal</button>
          <button className="btn-primary" disabled={busy} onClick={submit}>{busy && <Spinner className="h-4 w-4" />} Simpan</button>
        </>}>
        <div className="space-y-4">
          <Field label="Catatan tindak lanjut" error={errors.notes} hint="Catatan ini terlihat oleh pelapor.">
            <textarea className="input min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={modal === 'resolved' ? 'Lubang jalan sudah ditambal dan diratakan.' : 'Petugas sedang menuju lokasi.'} />
          </Field>
          {modal === 'resolved' && (
            <Field label="Foto bukti penyelesaian (opsional)">
              <PhotoPicker files={photos} onChange={setPhotos} error={photoErr || errors.photos} onError={setPhotoErr} />
            </Field>
          )}
        </div>
      </Modal>
    </Panel>
  );
}

export function AdminActions({ report, onChanged }) {
  const router = useRouter();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [officers, setOfficers] = useState([]);
  const { busy, errors, run, setErrors } = useAction(onChanged);

  useEffect(() => {
    if (modal === 'assign' || modal === 'reassign') {
      api('/users?role=officer&is_active=true&per_page=100').then((r) => setOfficers(r.data)).catch(() => {});
    }
  }, [modal]);

  const open = (m, init = {}) => { setErrors({}); setForm(init); setModal(m); };
  const close = () => setModal(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const changeStatus = (status, extra = {}) =>
    run(() => api(`/reports/${report.id}/status`, { method: 'PATCH', body: { status, ...extra } })).then((ok) => ok && close());

  const s = report.status;
  const officer = report.assigned_officer;

  return (
    <>
      <Panel title="Verifikasi laporan" tone="ring-1 ring-accent/20">
        {s === 'submitted' && (
          <button className="btn-primary w-full" disabled={busy} onClick={() => changeStatus('under_review')}>
            <Search className="h-4 w-4" /> Mulai Periksa
          </button>
        )}
        {s === 'under_review' && (
          <>
            <button className="btn-primary w-full" onClick={() => open('verify')}><BadgeCheck className="h-4 w-4" /> Verifikasi</button>
            <button className="btn w-full border border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => open('reject')}>
              <XCircle className="h-4 w-4" /> Tolak
            </button>
          </>
        )}
        {s === 'verified' && !officer && (
          <button className="btn-primary w-full" onClick={() => open('assign')}><UserPlus className="h-4 w-4" /> Tugaskan Petugas</button>
        )}
        {['verified', 'in_progress'].includes(s) && officer && (
          <button className="btn-secondary w-full" onClick={() => open('reassign')}><Repeat className="h-4 w-4" /> Ganti Petugas</button>
        )}
        {s === 'in_progress' && <p className="text-xs text-slate-500">Menunggu petugas menyelesaikan penanganan.</p>}
        {['resolved', 'rejected'].includes(s) && <p className="text-sm text-slate-500">Laporan telah mencapai status akhir.</p>}
      </Panel>

      <Panel title="Pengaturan">
        <button className="btn-secondary w-full" onClick={() => open('visibility', {
          visibility: report.visibility,
          ids: report.photos.filter((p) => p.is_public).map((p) => p.id),
        })}>
          {report.visibility === 'public' ? <Globe2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Atur visibilitas publik
        </button>
        <button className="btn w-full text-rose-600 hover:bg-rose-50" onClick={() => open('delete')}><Trash2 className="h-4 w-4" /> Hapus laporan</button>
      </Panel>

      <Modal open={modal === 'verify'} onClose={close} title="Verifikasi laporan"
        footer={<><button className="btn-secondary" onClick={close}>Batal</button>
          <button className="btn-primary" disabled={busy} onClick={() => changeStatus('verified', { notes: form.notes || undefined })}>{busy && <Spinner className="h-4 w-4" />} Verifikasi</button></>}>
        <p className="mb-4 text-sm text-slate-600">Laporan dinyatakan valid dan dapat ditindaklanjuti. Setelah ini, tugaskan petugas.</p>
        <Field label="Catatan (opsional)"><textarea className="input" value={form.notes || ''} onChange={set('notes')} /></Field>
      </Modal>

      <Modal open={modal === 'reject'} onClose={close} title="Tolak laporan"
        footer={<><button className="btn-secondary" onClick={close}>Batal</button>
          <button className="btn-danger" disabled={busy} onClick={() => changeStatus('rejected', { reason: form.reason, notes: form.notes || undefined })}>{busy && <Spinner className="h-4 w-4" />} Tolak laporan</button></>}>
        <Field label="Alasan penolakan" required error={errors.reason} hint="Alasan akan dikirim ke pelapor.">
          <textarea className="input min-h-[110px]" value={form.reason || ''} onChange={set('reason')} placeholder="Contoh: Foto tidak menunjukkan permasalahan yang dilaporkan." />
        </Field>
      </Modal>

      <Modal open={modal === 'assign' || modal === 'reassign'} onClose={close} title={modal === 'assign' ? 'Tugaskan petugas' : 'Ganti petugas'}
        footer={<><button className="btn-secondary" onClick={close}>Batal</button>
          <button className="btn-primary" disabled={busy} onClick={() =>
            run(() => api(`/reports/${report.id}/assignment`, {
              method: modal === 'assign' ? 'POST' : 'PUT',
              body: { officer_id: form.officer_id, notes: form.notes || undefined, reason: form.reason },
            })).then((ok) => ok && close())
          }>{busy && <Spinner className="h-4 w-4" />} Simpan</button></>}>
        <div className="space-y-4">
          {modal === 'reassign' && officer && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm">Petugas saat ini: <b>{officer.name}</b></p>
          )}
          <Field label="Pilih petugas" required error={errors.officer_id}>
            <select className="input" value={form.officer_id || ''} onChange={set('officer_id')}>
              <option value="">— Pilih petugas aktif —</option>
              {officers.filter((o) => o.id !== officer?.id).map((o) => <option key={o.id} value={o.id}>{o.name} · {o.email}</option>)}
            </select>
          </Field>
          {modal === 'reassign' && (
            <Field label="Alasan penggantian" required error={errors.reason}>
              <textarea className="input" value={form.reason || ''} onChange={set('reason')} placeholder="Petugas sebelumnya sedang cuti." />
            </Field>
          )}
          <Field label="Catatan untuk petugas (opsional)">
            <textarea className="input" value={form.notes || ''} onChange={set('notes')} placeholder="Mohon lakukan pengecekan lokasi." />
          </Field>
        </div>
      </Modal>

      <Modal open={modal === 'visibility'} onClose={close} title="Visibilitas laporan publik"
        footer={<><button className="btn-secondary" onClick={close}>Batal</button>
          <button className="btn-primary" disabled={busy} onClick={() =>
            run(() => api(`/reports/${report.id}/visibility`, { method: 'PATCH', body: { visibility: form.visibility, public_photo_ids: form.ids } }))
              .then((ok) => ok && close())
          }>{busy && <Spinner className="h-4 w-4" />} Simpan</button></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[['private', Lock, 'Privat', 'Hanya pelapor, petugas, admin'], ['public', Globe2, 'Publik', 'Dapat dilihat pengguna lain']].map(([v, Icon, t, d]) => (
              <button key={v} type="button" onClick={() => setForm({
                ...form,
                visibility: v,
                ids: v === 'public' && !form.ids?.length ? report.photos.map((p) => p.id) : form.ids,
              })}
                className={`rounded-xl border p-3 text-left ${form.visibility === v ? 'border-accent bg-accent/5 ring-2 ring-accent/20' : 'border-slate-200'}`}>
                <Icon className="h-5 w-5 text-accent" />
                <p className="mt-2 text-sm font-bold">{t}</p>
                <p className="text-xs text-slate-500">{d}</p>
              </button>
            ))}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="label mb-0">Foto yang layak ditampilkan publik</p>
              <button type="button" className="text-xs font-semibold text-accent hover:underline"
                onClick={() => setForm({ ...form, ids: form.ids?.length === report.photos.length ? [] : report.photos.map((p) => p.id) })}>
                {form.ids?.length === report.photos.length ? 'Kosongkan' : 'Pilih semua'}
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Klik foto untuk memilih. Termasuk foto bukti penyelesaian, agar tampil sebagai “sebelum & sesudah” di halaman depan.
              Jangan pilih foto yang memuat wajah, pelat nomor, atau data pribadi.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {report.photos.map((p) => {
                const on = form.ids?.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => setForm({ ...form, ids: on ? form.ids.filter((x) => x !== p.id) : [...(form.ids || []), p.id] })}
                    className={`relative aspect-square overflow-hidden rounded-xl ring-2 ${on ? 'ring-accent' : 'ring-transparent opacity-60'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    {on && <CheckCircle2 className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white text-accent" />}
                  </button>
                );
              })}
            </div>
            {form.visibility === 'public' && !form.ids?.length && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                Belum ada foto yang dipilih. Laporan akan tampil di halaman depan tanpa foto.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">Identitas pelapor tidak pernah ditampilkan pada laporan publik.</p>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'delete'} onClose={close} title="Hapus laporan?"
        footer={<><button className="btn-secondary" onClick={close}>Batal</button>
          <button className="btn-danger" disabled={busy} onClick={async () => {
            if (await run(() => api(`/reports/${report.id}`, { method: 'DELETE' }))) router.replace('/laporan');
          }}>{busy && <Spinner className="h-4 w-4" />} Hapus</button></>}>
        <p className="text-sm text-slate-600">Laporan <b>{report.report_number}</b> akan dihapus (soft delete). Riwayat status tetap tersimpan dan tindakan ini tercatat di audit log.</p>
      </Modal>
    </>
  );
}
