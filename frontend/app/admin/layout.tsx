'use client';
import AppShell from '@/components/layout/AppShell';
import { ADMIN_NAV, ADMIN_TABS } from '@/lib/nav';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell roles={['super_admin']} nav={ADMIN_NAV} tabs={ADMIN_TABS} base="/admin">{children}</AppShell>;
}
