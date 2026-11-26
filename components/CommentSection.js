'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send, Pencil, ShieldOff, MessageCircle } from 'lucide-react';
import { api } from '@/lib/client/api';
import { useAuth, useToast } from '@/components/Providers';
import { Avatar, Spinner, Modal } from '@/components/ui';
import { ROLE_LABEL, formatDateTime } from '@/lib/client/constants';

const ROLE_CHIP = {
  citizen: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  officer: 'bg-sky-50 text-sky-700 ring-sky-200',
  admin: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
};

export default function CommentSection({ reportId, canPost = true, disabledReason }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(null);
  const [moderate, setModerate] = useState(null);

  const load = useCallback(() => {
    api(`/reports/${reportId}/comments?per_page=100`).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [reportId]);
  useEffect(load, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await api(`/reports/${reportId}/comments`, { method: 'POST', body: { body } });
      setBody('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
    setSending(false);
  };

  const saveEdit = async () => {
    try {
      await api(`/comments/${editing.id}`, { method: 'PATCH', body: { body: editing.body } });
      setEditing(null);
      toast.success('Komentar diperbarui');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const doModerate = async () => {
    try {
      await api(`/comments/${moderate.id}`, { method: 'DELETE' });
      setModerate(null);
      toast.success('Komentar disembunyikan');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      {items === null ? (
        <div className="py-6 text-center text-slate-400"><Spinner className="mx-auto h-5 w-5" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center text-sm text-slate-400">
          <MessageCircle className="mb-2 h-8 w-8" /> Belum ada komentar. Mulai diskusi di sini.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => {
            const mine = c.author.id === user.id;
            return (
              <li key={c.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar name={c.author.name} className="h-9 w-9 text-xs" />
                <div className={`max-w-[85%] ${mine ? 'items-end text-right' : ''} flex flex-col`}>
                  <div className={`flex flex-wrap items-center gap-2 ${mine ? 'justify-end' : ''}`}>
                    <span className="text-sm font-bold">{mine ? 'Anda' : c.author.name}</span>
                    <span className={`chip py-0.5 text-[10px] ${ROLE_CHIP[c.author.role]}`}>{ROLE_LABEL[c.author.role]}</span>
                  </div>
                  <div className={`mt-1 whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-sm ${mine ? 'rounded-tr-sm bg-accent text-white' : 'rounded-tl-sm bg-slate-100 text-ink-700'}`}>
                    {c.body}
                  </div>
                  <div className={`mt-1 flex items-center gap-3 text-[11px] text-slate-400 ${mine ? 'justify-end' : ''}`}>
                    <span>{formatDateTime(c.created_at)}{c.updated_at !== c.created_at && ' · diedit'}</span>
                    {mine && (
                      <button className="inline-flex items-center gap-1 hover:text-accent" onClick={() => setEditing({ id: c.id, body: c.body })}>
                        <Pencil className="h-3 w-3" /> Ubah
                      </button>
                    )}
                    {user.role === 'admin' && !mine && (
                      <button className="inline-flex items-center gap-1 hover:text-rose-600" onClick={() => setModerate(c)}>
                        <ShieldOff className="h-3 w-3" /> Moderasi
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canPost ? (
        <form onSubmit={send} className="mt-6 flex items-end gap-2 border-t border-slate-100 pt-4">
          <textarea className="input min-h-[44px] flex-1 resize-none" rows={2} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Tulis komentar terkait laporan ini… (jangan cantumkan data pribadi)" />
          <button className="btn-primary h-11 w-11 p-0" disabled={sending || !body.trim()} aria-label="Kirim komentar">
            {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      ) : (
        disabledReason && <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">{disabledReason}</p>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Ubah komentar"
        footer={<><button className="btn-secondary" onClick={() => setEditing(null)}>Batal</button><button className="btn-primary" onClick={saveEdit}>Simpan</button></>}>
        <textarea className="input min-h-[120px]" maxLength={1000} value={editing?.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
      </Modal>
      <Modal open={!!moderate} onClose={() => setModerate(null)} title="Moderasi komentar"
        footer={<><button className="btn-secondary" onClick={() => setModerate(null)}>Batal</button><button className="btn-danger" onClick={doModerate}>Sembunyikan</button></>}>
        <p className="text-sm text-slate-600">Komentar berikut akan disembunyikan dari semua pengguna dan dicatat di audit log:</p>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">{moderate?.body}</p>
      </Modal>
    </div>
  );
}
