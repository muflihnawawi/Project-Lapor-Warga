'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, FilePlus2, FileText, Globe2, Bell, UserCircle2, LogOut, Menu, X, LayoutDashboard, ClipboardList, Users, Tags,
  BarChart3, ScrollText, Megaphone,
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { Logo, Avatar, PageLoader } from '@/components/ui';
import { api } from '@/lib/client/api';
import { ROLE_LABEL } from '@/lib/client/constants';

// Tampilan & menu berbeda untuk setiap role.
const THEMES = {
  citizen: {
    panel: 'Portal Warga',
    sidebar: 'bg-white border-r border-slate-200',
    logoLight: false,
    group: 'text-slate-400',
    item: 'text-slate-600 hover:bg-slate-100 hover:text-ink-900',
    active: 'bg-accent/10 text-accent',
    footer: 'border-slate-100',
    nav: [
      { href: '/dashboard', label: 'Beranda', icon: Home },
      { href: '/laporan/baru', label: 'Buat Laporan', icon: FilePlus2 },
      { href: '/laporan', label: 'Laporan Saya', icon: FileText },
      { href: '/publik', label: 'Laporan Publik', icon: Globe2 },
      { href: '/notifikasi', label: 'Notifikasi', icon: Bell, badge: true },
      { href: '/profil', label: 'Profil', icon: UserCircle2 },
    ],
    mobile: ['/dashboard', '/laporan', '/laporan/baru', '/notifikasi', '/profil'],
  },
  officer: {
    panel: 'Panel Petugas',
    sidebar: 'bg-[#0b2a44] text-sky-100',
    logoLight: true,
    group: 'text-sky-300/60',
    item: 'text-sky-100/80 hover:bg-white/10 hover:text-white',
    active: 'bg-sky-500/20 text-white ring-1 ring-inset ring-sky-400/30',
    footer: 'border-white/10',
    nav: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/laporan', label: 'Tugas Saya', icon: ClipboardList },
      { href: '/publik', label: 'Laporan Publik', icon: Globe2 },
      { href: '/notifikasi', label: 'Notifikasi', icon: Bell, badge: true },
      { href: '/profil', label: 'Profil', icon: UserCircle2 },
    ],
  },
  admin: {
    panel: 'Panel Administrator',
    sidebar: 'bg-slate-900 text-slate-300',
    logoLight: true,
    group: 'text-slate-500',
    item: 'text-slate-300 hover:bg-white/5 hover:text-white',
    active: 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40',
    footer: 'border-white/10',
    nav: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/laporan', label: 'Semua Laporan', icon: ClipboardList },
      { href: '/publik', label: 'Laporan Publik', icon: Globe2 },
      { group: 'Manajemen' },
      { href: '/admin/pengguna', label: 'Pengguna', icon: Users },
      { href: '/admin/kategori', label: 'Kategori', icon: Tags },
      { href: '/admin/pengumuman', label: 'Pengumuman', icon: Megaphone },
      { group: 'Analitik' },
      { href: '/admin/analitik', label: 'Statistik & Ekspor', icon: BarChart3 },
      { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
      { group: 'Akun' },
      { href: '/notifikasi', label: 'Notifikasi', icon: Bell, badge: true },
      { href: '/profil', label: 'Profil', icon: UserCircle2 },
    ],
  },
};

function isActive(pathname, href) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/laporan') return pathname === '/laporan' || (pathname.startsWith('/laporan/') && !pathname.startsWith('/laporan/baru'));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  const loadUnread = useCallback(() => {
    api('/notifications?per_page=1')
      .then((r) => setUnread(r.meta.unread_count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    window.addEventListener('lw-notif', loadUnread);
    return () => { clearInterval(t); window.removeEventListener('lw-notif', loadUnread); };
  }, [user, loadUnread]);

  useEffect(() => setOpen(false), [pathname]);

  if (!ready || !user) return <PageLoader />;
  const theme = THEMES[user.role] || THEMES.citizen;

  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const navList = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {theme.nav.map((n, i) =>
        n.group ? (
          <p key={`g${i}`} className={`px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-wider ${theme.group}`}>{n.group}</p>
        ) : (
          <Link key={n.href} href={n.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive(pathname, n.href) ? theme.active : theme.item}`}>
            <n.icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{n.label}</span>
            {n.badge && unread > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>
            )}
          </Link>
        )
      )}
    </nav>
  );

  const sidebar = (
    <div className={`flex h-full w-72 flex-col ${theme.sidebar}`}>
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/dashboard"><Logo light={theme.logoLight} /></Link>
        <button className="rounded-lg p-1.5 opacity-70 hover:opacity-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-5">
        <span className="chip bg-accent/15 text-current ring-accent/30">{theme.panel}</span>
      </div>
      {navList}
      <div className={`border-t p-4 ${theme.footer}`}>
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs opacity-60">{ROLE_LABEL[user.role]}</p>
          </div>
          <button onClick={doLogout} className="rounded-lg p-2 opacity-70 hover:bg-black/5 hover:opacity-100" title="Keluar" aria-label="Keluar">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`theme-${user.role} min-h-screen`}>
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="chip hidden bg-accent/10 text-accent ring-accent/20 sm:inline-flex">{ROLE_LABEL[user.role]}</span>
            <Link href="/notifikasi" className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100" aria-label="Notifikasi">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
            </Link>
          </div>
        </header>

        <main className={`mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 ${theme.mobile ? 'pb-28 lg:pb-8' : ''}`}>{children}</main>
      </div>

      {/* Navigasi bawah khusus warga di ponsel */}
      {theme.mobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="mx-auto grid max-w-md grid-cols-5">
            {theme.mobile.map((href) => {
              const n = theme.nav.find((x) => x.href === href);
              const active = isActive(pathname, href);
              if (href === '/laporan/baru') {
                return (
                  <Link key={href} href={href} className="flex flex-col items-center justify-center py-2" aria-label="Buat laporan">
                    <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30">
                      <FilePlus2 className="h-6 w-6" />
                    </span>
                  </Link>
                );
              }
              return (
                <Link key={href} href={href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${active ? 'text-accent' : 'text-slate-500'}`}>
                  <n.icon className="h-5 w-5" />
                  {n.label.replace(' Saya', '')}
                  {n.badge && unread > 0 && <span className="absolute right-1/4 top-2 h-2 w-2 rounded-full bg-rose-500" />}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
