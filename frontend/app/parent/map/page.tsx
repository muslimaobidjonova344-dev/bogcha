import { Suspense } from 'react';
import MapView from '@/features/MapView';

export default function Page() {
  return <Suspense fallback={null}><MapView /></Suspense>;
}
