import AppShell from '@/components/layout/AppShell';
import { PARENT_NAV, PARENT_TABS } from '@/lib/nav';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell roles={['parent']} nav={PARENT_NAV} tabs={PARENT_TABS} base="/parent">{children}</AppShell>;
}
