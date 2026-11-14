import { Suspense } from 'react';
import { RegisterForm } from '@/features/AuthPages';

export const metadata = { title: 'Ro‘yxatdan o‘tish' };
export default function Page() { return <Suspense fallback={null}><RegisterForm /></Suspense>; }
