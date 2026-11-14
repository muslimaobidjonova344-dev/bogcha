import { Suspense } from 'react';
import { AdminUsers } from '@/features/Admin';

export default function Page() {
  return <Suspense fallback={null}><AdminUsers /></Suspense>;
}
