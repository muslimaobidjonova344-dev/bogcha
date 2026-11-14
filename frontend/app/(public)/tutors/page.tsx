import { Suspense } from 'react';
import SearchPage from '@/features/SearchPage';

export const metadata = { title: 'Repetitorlar' };
export default function Page() { return <Suspense fallback={null}><SearchPage initialType="tutor" showTabs={false} /></Suspense>; }
