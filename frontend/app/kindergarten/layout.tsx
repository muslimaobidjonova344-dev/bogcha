'use client';
import AppShell from '@/components/layout/AppShell';
import { KG_NAV, KG_TABS } from '@/lib/nav';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell roles={['kindergarten_admin']} nav={KG_NAV} tabs={KG_TABS} base="/kindergarten">{children}</AppShell>;
}
