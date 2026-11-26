'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api, getSession, setSession } from '@/lib/client/api';

const AuthCtx = createContext(null);
const ToastCtx = createContext(null);

export const useAuth = () => useContext(AuthCtx);
export const useToast = () => useContext(ToastCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s?.user) setUser(s.user);
    setReady(true);
    if (s?.access_token) {
      // Sinkronkan profil terbaru (role/nama) dari server.
      api('/me')
        .then((r) => {
          setUser(r.data);
          const cur = getSession();
          if (cur) setSession({ ...cur, user: r.data });
        })
        .catch(() => {});
    }
    const onLogout = () => setUser(null);
    window.addEventListener('lw-logout', onLogout);
    return () => window.removeEventListener('lw-logout', onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    setSession(r.data);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const logout = useCallback(async () => {
    const s = getSession();
    try { await api('/auth/logout', { method: 'POST', body: { refresh_token: s?.refresh_token } }); } catch {}
    setSession(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((u) => {
    setUser(u);
    const cur = getSession();
    if (cur) setSession({ ...cur, user: u });
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout, updateUser }), [user, ready, login, logout, updateUser]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, message, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  const toast = useMemo(() => ({ success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }), [push]);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[1000] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg ${
              t.type === 'error' ? 'border-rose-200' : 'border-emerald-200'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            )}
            <p className="flex-1 text-ink-700">{t.message}</p>
            <button onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))} className="text-slate-400 hover:text-slate-600" aria-label="Tutup">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
