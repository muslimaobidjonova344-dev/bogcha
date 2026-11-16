'use client';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Avatar, cleanName } from '@/components/ui/Art';
import { Card, PageTitle } from '@/components/ui/ui';
import { useLogout, useMe } from '@/hooks/useAuth';
import { ROLE_LABEL } from '@/lib/format';
import type { NavItem } from '@/lib/nav';

/** Mobil "Kabinet" bo'limi: qolgan barcha sahifalar karta ko'rinishida. */
export default function Cabinet({ nav, base }: { nav: NavItem[]; base: string }) {
  const me = useMe();
  const logout = useLogout();
  return (
    <>
      <Card className="mb-4 flex items-center gap-3">
        <Avatar name={me.data?.full_name} id={me.data?.id} src={(me.data as any)?.avatar_url} size={56} />
        <div><div className="font-extrabold text-primary">{cleanName(me.data?.full_name)}</div><div className="text-sm text-black/55">{me.data && ROLE_LABEL[me.data.role]} · {me.data?.email}</div></div>
      </Card>
      <PageTitle title="Kabinet" />
      <div className="grid grid-cols-2 gap-3">
        {nav.filter((n) => n.href !== base).map((n) => { const Icon = n.icon; return (
          <Link key={n.href} href={n.href}><Card className="flex min-h-[88px] flex-col items-start justify-between !p-3 active:scale-[0.97] transition"><Icon className="text-primary" size={22} /><span className="text-sm font-bold">{n.label}</span></Card></Link>); })}
        <button onClick={logout} className="card flex min-h-[88px] flex-col items-start justify-between p-3 text-red-600"><LogOut size={22} /><span className="text-sm font-bold">Chiqish</span></button>
      </div>
    </>
  );
}
