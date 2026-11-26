export const STATUS = {
  submitted: { label: 'Dikirim', cls: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400', desc: 'Laporan berhasil dikirim dan menunggu pemeriksaan.' },
  under_review: { label: 'Diperiksa', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', desc: 'Admin sedang memeriksa kelengkapan laporan.' },
  verified: { label: 'Terverifikasi', cls: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500', desc: 'Laporan valid dan siap ditindaklanjuti.' },
  in_progress: { label: 'Ditangani', cls: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', desc: 'Petugas sedang menangani permasalahan.' },
  resolved: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', desc: 'Permasalahan telah diselesaikan.' },
  rejected: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', desc: 'Laporan tidak dapat ditindaklanjuti.' },
};

export const STATUS_FLOW = ['submitted', 'under_review', 'verified', 'in_progress', 'resolved'];

export const ROLE_LABEL = { citizen: 'Masyarakat', officer: 'Petugas', admin: 'Administrator' };

const dtf = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
const df = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' });

export const formatDateTime = (s) => (s ? dtf.format(new Date(s)) : '-');
export const formatDate = (s) => (s ? df.format(new Date(s)) : '-');

export function timeAgo(s) {
  if (!s) return '';
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(s);
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
