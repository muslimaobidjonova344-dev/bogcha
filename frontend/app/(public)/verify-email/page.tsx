import { Suspense } from 'react';
import { VerifyEmail } from '@/features/Auth';

export const metadata = { title: 'Emailni tasdiqlash' };
export default function Page() { return <Suspense fallback={null}><VerifyEmail /></Suspense>; }
