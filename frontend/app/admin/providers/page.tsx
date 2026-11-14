import { Suspense } from 'react';
import { AdminProviders } from '@/features/Admin';

export default function Page() {
  return <Suspense fallback={null}><AdminProviders /></Suspense>;
}
