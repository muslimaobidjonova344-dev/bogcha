import { Suspense } from 'react';
import CompareView from '@/features/CompareView';

export const metadata = { title: 'Taqqoslash' };
export default function Page() { return <Suspense fallback={null}><CompareView /></Suspense>; }
