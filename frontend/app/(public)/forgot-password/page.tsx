import { Suspense } from 'react';
import { ForgotPassword } from '@/features/Auth';

export const metadata = { title: 'Parolni tiklash' };
export default function Page() { return <Suspense fallback={null}><ForgotPassword /></Suspense>; }
