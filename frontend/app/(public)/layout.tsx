import type { ReactNode } from 'react';
import PublicShell from '@/components/layout/PublicShell';

export default function Layout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
