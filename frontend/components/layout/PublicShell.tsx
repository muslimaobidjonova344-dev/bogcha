'use client';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Logo } from '@/components/layout/AppShell';
import { CompareBar } from '@/features/ProviderCard';
import { useMe } from '@/hooks/useAuth';
import { ROLE_HOME } from '@/lib/format';

const LINKS = [{ href: '/kindergartens', label: 'Bog‘chalar' }, { href: '/tutors', label: 'Repetitorlar' }, { href: '/map', label: 'Xarita' }];

export default function PublicShell({ children }: { children: ReactNode }) {
  const me = useMe();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Logo />
          <nav className="ml-4 hidden gap-5 text-sm font-semibold sm:flex">{LINKS.map((l) => <Link key={l.href} href={l.href} className="text-primary/80 hover:text-primary">{l.label}</Link>)}</nav>
          <div className="ml-auto flex items-center gap-2">
            {me.data ? <Link href={ROLE_HOME[me.data.role] || '/'} className="btn btn-primary !min-h-[40px]">Kabinet</Link> : <><Link href="/login" className="btn btn-ghost !min-h-[40px]">Kirish</Link><Link href="/register" className="btn btn-primary !min-h-[40px]">Ro‘yxatdan o‘tish</Link></>}
          </div>
        </div>
        <nav className="flex justify-center gap-5 border-t border-black/5 py-1.5 text-sm font-semibold sm:hidden">{LINKS.map((l) => <Link key={l.href} href={l.href} className="text-primary/80">{l.label}</Link>)}</nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-black/5 py-6 text-center text-xs text-black/45">© {new Date().getFullYear()} Kichkintoy · O‘zbekiston</footer>
      <CompareBar />
    </div>
  );
}
