'use client';
import AppShell from '@/components/layout/AppShell';
import { TUTOR_NAV, TUTOR_TABS } from '@/lib/nav';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell roles={['tutor']} nav={TUTOR_NAV} tabs={TUTOR_TABS} base="/tutor">{children}</AppShell>;
}
