import { Suspense } from 'react';
import { ResetPassword } from '@/features/Auth';

export const metadata = { title: 'Yangi parol' };
export default function Page() { return <Suspense fallback={null}><ResetPassword /></Suspense>; }
