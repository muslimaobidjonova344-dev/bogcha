import { Suspense } from 'react';
import SearchPage from '@/features/SearchPage';

export default function Page() {
  return <Suspense fallback={null}><SearchPage /></Suspense>;
}
