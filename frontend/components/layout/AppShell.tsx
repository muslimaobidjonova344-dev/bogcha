'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Bell, CircleHelp, LogOut, Menu, Sprout } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Avatar, cleanName } from '@/components/ui/Art';
import { Drawer, Skeleton } from '@/components/ui/ui';
import { useLogout, useRequireRole } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useWs';
import { get } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/format';
import type { NavItem } from '@/lib/nav';

type Tab = { href: string; label: string; icon: any; badge?: 'messages' | 'notifications' | 'moderation' };

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold text-lg">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white"><Sprout size={20} /></span>
      <span className={light ? 'text-white' : 'text-primary'}>Kichkintoy</span>
    </Link>
  );
}

function useBadges(enabled: boolean, role: string) {
  const n = useQuery({ queryKey: ['notifications', 'badge'], queryFn: () => get('/notifications', { unread_only: true, page_size: 1 }), enabled, refetchInterval: 60_000 });
  const c = useQuery({ queryKey: ['conversations'], queryFn: () => get('/conversations'), enabled: enabled && role !== 'super_admin', refetchInterval: 60_000 });
  const m = useQuery({ queryKey: ['admin', 'badge'], queryFn: () => get('/admin/dashboard'), enabled: enabled && role === 'super_admin', refetchInterval: 120_000 });
  return {
    notifications: n.data?.unread || 0,
    messages: (c.data || []).reduce((s: number, x: any) => s + x.unread_count, 0),
    moderation: m.data?.pending_providers || 0,
  } as Record<string, number>;
}

function Dot({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-peach px-1.5 text-[11px] font-bold text-primary">{n > 99 ? '99+' : n}</span>;
}

export default function AppShell({ roles, nav, tabs, base, children }: { roles: string[]; nav: NavItem[]; tabs: Tab[]; base: string; children: ReactNode }) {
  const me = useRequireRole(roles);
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const logout = useLogout();
  const ok = !!me.data && roles.includes(me.data.role);
  useRealtime(ok);
  const badges = useBadges(ok, me.data?.role || '');

  if (me.isLoading || !ok) {
    return <div className="grid min-h-screen place-items-center"><div className="w-64 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-24" /></div></div>;
  }
  const active = (href: string) => { const h = href.split('?')[0]; return h === base ? path === base : path === h || path.startsWith(h + '/'); };

  const NavList = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex flex-col gap-1" aria-label="Asosiy menyu">
      {nav.map((it) => {
        const Icon = it.icon; const a = active(it.href);
        return (
          <Link key={it.href} href={it.href} onClick={onNav}
            className={clsx('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', a ? 'bg-primary text-white shadow-card' : 'text-ink/75 hover:bg-primary-50 hover:text-primary')}>
            <Icon size={18} /><span className="truncate">{it.label}</span>{it.badge && <Dot n={badges[it.badge]} />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen print:!hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white p-4 lg:flex">
        <Logo />
        <div className="mt-1 text-xs font-semibold text-secondary">{ROLE_LABEL[me.data.role]}</div>
        <div className="mt-4 flex-1 overflow-y-auto pr-1"><NavList /></div>
        <button onClick={logout} className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={18} />Chiqish</button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 print:hidden flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
          <button className="rounded-xl p-2 hover:bg-black/5 lg:hidden" onClick={() => setDrawer(true)} aria-label="Menyu"><Menu size={22} /></button>
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/help" className="rounded-xl p-2 hover:bg-black/5" aria-label="Yo‘riqnoma" title="Yo‘riqnoma"><CircleHelp size={20} /></Link>
            <Link href={`${base}/notifications`} className="relative rounded-xl p-2 hover:bg-black/5" aria-label="Bildirishnomalar">
              <Bell size={20} />{badges.notifications > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-peach ring-2 ring-white" />}
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar name={me.data.full_name} id={me.data.id} src={(me.data as any).avatar_url} size={36} />
              <div className="leading-tight"><div className="text-sm font-bold">{cleanName(me.data.full_name)}</div><div className="text-xs text-black/50">{ROLE_LABEL[me.data.role]}</div></div>
            </div>
          </div>
        </header>

                  <motion.main key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="flex-1 px-4 py-5 pb-28 md:px-8 lg:pb-10">
            {!me.data.email_verified && (
              <div className="mb-4 rounded-xl bg-sun-light px-4 py-3 text-sm text-amber-900">
                Emailingiz tasdiqlanmagan — ariza yuborish va chat uchun tasdiqlang. <Link href="/verify-email" className="font-bold underline">Tasdiqlash</Link>
              </div>
            )}
            {children}
          </motion.main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="pb-safe print:hidden fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-black/10 bg-white lg:hidden" aria-label="Pastki menyu">
        {tabs.map((t) => {
          const Icon = t.icon; const a = active(t.href);
          return (
            <Link key={t.href} href={t.href} className={clsx('relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', a ? 'text-primary' : 'text-black/45')}>
              {a && <motion.span layoutId="tab-ind" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
              <span className="relative"><Icon size={22} />{t.badge && badges[t.badge] > 0 && <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-peach px-1 text-[10px] font-bold text-primary">{badges[t.badge]}</span>}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Drawer open={drawer} onClose={() => setDrawer(false)}>
        <div className="mb-4"><Logo /></div>
        <NavList onNav={() => setDrawer(false)} />
        <button onClick={logout} className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={18} />Chiqish</button>
      </Drawer>
    </div>
  );
}
