import { Suspense } from 'react';
import { LoginForm } from '@/features/Auth';

export const metadata = { title: 'Kirish' };
export default function Page() { return <Suspense fallback={null}><LoginForm /></Suspense>; }
