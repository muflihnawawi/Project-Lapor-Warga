'use client';

import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { EmptyState } from '@/components/ui';

export default function AdminLayout({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <EmptyState icon={ShieldAlert} title="Akses ditolak" desc="Halaman ini hanya untuk administrator." />;
  }
  return children;
}
