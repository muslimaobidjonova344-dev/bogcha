import { Suspense } from 'react';
import { ForgotPassword } from '@/features/AuthPages';

export const metadata = { title: 'Parolni tiklash' };
export default function Page() { return <Suspense fallback={null}><ForgotPassword /></Suspense>; }
