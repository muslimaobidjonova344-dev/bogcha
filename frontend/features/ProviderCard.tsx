'use client';
import { motion } from 'framer-motion';
import { BadgeCheck, Heart, MapPin, Scale } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { Badge, Stars, useToast } from '@/components/ui/ui';
import { ProviderCover, cleanName } from '@/components/ui/Art';
import { useMe } from '@/hooks/useAuth';
import { useCompare } from '@/hooks/useCompare';
import { del, put } from '@/lib/api';
import { uzs, errMsg } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';

export default function ProviderCard({ p, saved }: { p: any; saved?: boolean }) {
  const kg = p.type === 'kindergarten';
  const href = kg ? `/kindergartens/${p.id}` : `/tutors/${p.id}`;
  const me = useMe();
  const toast = useToast();
  const qc = useQueryClient();
  const cmp = useCompare();
  const inCmp = !!cmp.ids.find((x) => x.id === p.id);
  const fav = async () => {
    if (me.data?.role !== 'parent') return toast.err('Saqlash uchun ota-ona sifatida kiring');
    try { saved ? await del(`/favorites/${p.id}`) : await put(`/favorites/${p.id}`); toast.ok(saved ? 'Olib tashlandi' : 'Saqlandi'); qc.invalidateQueries({ queryKey: ['favorites'] }); } catch (e) { toast.err(errMsg(e)); }
  };
  return (
    <motion.article whileHover={{ y: -3 }} className="card overflow-hidden flex flex-col">
      <Link href={href} className="block">
        <div className="relative h-36 bg-gradient-to-br from-primary-100 to-peach-light">
          {p.cover_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.cover_url} alt={cleanName(p.name)} className="h-full w-full object-cover" loading="lazy" /> : <ProviderCover id={p.id} name={p.name} type={p.type} label={p.specialty || p.subjects?.[0]} className="h-full w-full" />}
          {p.verified && <span className="absolute left-2 top-2"><Badge cls="bg-white/95 text-primary"><BadgeCheck size={14} className="mr-1" />Tasdiqlangan</Badge></span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={href}><h3 className="line-clamp-1 text-base font-extrabold text-primary">{cleanName(p.name)}</h3></Link>
        <div className="flex items-center gap-2 text-sm"><Stars value={p.rating_avg} size={14} /><span className="font-semibold">{p.rating_count ? p.rating_avg.toFixed(1) : 'Yangi'}</span>{p.rating_count > 0 && <span className="text-black/45">({p.rating_count})</span>}</div>
        <div className="flex items-center gap-1 text-sm text-black/60"><MapPin size={14} />{[p.district, p.region].filter(Boolean).join(', ') || '—'}{p.distance_km != null && <span className="ml-1 font-semibold text-primary">· {p.distance_km} km</span>}</div>
        {kg ? (
          <div className="flex flex-wrap gap-1.5">
            {p.min_age != null && <Badge>{p.min_age}–{p.max_age} yosh</Badge>}
            {p.ownership && <Badge cls="bg-peach-light text-amber-900">{p.ownership === 'state' ? 'Davlat' : 'Xususiy'}</Badge>}
            <Badge cls={p.free_places > 0 ? 'bg-primary-100 text-primary' : 'bg-red-50 text-red-700'}>{p.free_places > 0 ? `${p.free_places} ta bo'sh joy` : "Bo'sh joy yo'q"}</Badge>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">{(p.subjects || []).slice(0, 3).map((s: string) => <Badge key={s}>{s}</Badge>)}{p.experience_years != null && <Badge cls="bg-sun-light text-amber-900">{p.experience_years} yil tajriba</Badge>}</div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="font-extrabold text-primary">{uzs(kg ? p.monthly_price : p.hourly_price)}<span className="text-xs font-medium text-black/45">{kg ? ' /oy' : ' /dars'}</span></div>
          <div className="flex gap-1">
            <button onClick={() => cmp.toggle({ id: p.id, type: p.type, name: p.name })} aria-label="Taqqoslash" aria-pressed={inCmp} className={clsx('rounded-xl p-2.5 transition', inCmp ? 'bg-primary text-white' : 'bg-primary-50 text-primary')}><Scale size={18} /></button>
            <button onClick={fav} aria-label="Saqlash" className="rounded-xl bg-primary-50 p-2.5 text-primary"><Heart size={18} className={saved ? 'fill-red-500 text-red-500' : ''} /></button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function CompareBar() {
  const { ids, clear } = useCompare();
  if (ids.length === 0) return null;
  return (
    <div className="pb-safe fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-primary p-3 text-white shadow-pop lg:bottom-4">
      <Scale size={20} /><div className="min-w-0 flex-1 text-sm"><b>{ids.length}</b> ta tanlandi{ids.length < 2 && ' (kamida 2 ta)'}<div className="truncate text-xs text-white/70">{ids.map((i) => i.name).join(' · ')}</div></div>
      <button onClick={clear} className="text-xs underline">Tozalash</button>
      {ids.length >= 2 && <Link href={`/compare?ids=${ids.map((i) => i.id).join(',')}`} className="btn bg-white !text-primary !py-2">Taqqoslash</Link>}
    </div>
  );
}
