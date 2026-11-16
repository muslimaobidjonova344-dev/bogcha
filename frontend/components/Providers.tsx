'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { ToastProvider } from '@/components/ui/ui';
import AppLock from '@/components/AppLock';
import BackExit from '@/components/BackExit';

export default function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: (n, e: any) => (e?.status >= 400 && e?.status < 500 ? false : n < 2), refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={qc}>
      {/* reducedMotion="user": foydalanuvchi sozlamasiga ko'ra animatsiyalar o'chadi */}
      <MotionConfig reducedMotion="user"><ToastProvider>{children}<AppLock /><BackExit /></ToastProvider></MotionConfig>
    </QueryClientProvider>
  );
}
