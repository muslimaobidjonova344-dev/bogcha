import { Suspense } from 'react';
import { VerifyEmail } from '@/features/AuthPages';

export const metadata = { title: 'Emailni tasdiqlash' };
export default function Page() { return <Suspense fallback={null}><VerifyEmail /></Suspense>; }
