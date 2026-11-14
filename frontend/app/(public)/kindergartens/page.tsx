import { Suspense } from 'react';
import SearchPage from '@/features/SearchPage';

export const metadata = { title: 'Bog‘chalar' };
export default function Page() { return <Suspense fallback={null}><SearchPage initialType="kindergarten" showTabs={false} /></Suspense>; }
