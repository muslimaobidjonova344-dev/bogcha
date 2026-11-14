import { Suspense } from 'react';
import MapView from '@/features/MapView';

export const metadata = { title: 'Xarita' };
export default function Page() { return <Suspense fallback={null}><MapView /></Suspense>; }
