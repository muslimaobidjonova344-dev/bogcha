'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Async, Button, Empty, PageTitle, Stars } from '@/components/ui/ui';
import { get } from '@/lib/api';
import { uzs } from '@/lib/format';
import { LocateFixed } from 'lucide-react';

function Inner() {
  const ids = useSearchParams().get('ids') || '';
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const q = useQuery({ queryKey: ['compare', ids, pos], queryFn: () => get('/compare', { ids, ...(pos || {}) }), enabled: ids.split(',').filter(Boolean).length >= 2 });
  if (ids.split(',').filter(Boolean).length < 2) return <Empty title="Taqqoslash uchun 2–4 ta muassasa tanlang" action={<Link className="btn btn-primary" href="/kindergartens">Qidiruvga o‘tish</Link>} />;
  return (
    <Async q={q}>
      {(items: any[]) => {
        const kg = items[0].type === 'kindergarten';
        const best = (vals: (number | null)[], low = true) => { const v = vals.filter((x) => x != null) as number[]; return v.length ? (low ? Math.min(...v) : Math.max(...v)) : null; };
        const prices = items.map((p) => (kg ? p.monthly_price : p.hourly_price));
        const rows: [string, (p: any) => any, (number | null)?][] = [
          ['Narx', (p) => uzs(kg ? p.monthly_price : p.hourly_price), best(prices)],
          ['Masofa', (p) => (p.distance_km != null ? `${p.distance_km} km` : '—')],
          ['Reyting', (p) => <span className="inline-flex items-center gap-1"><Stars value={p.rating_avg} size={13} />{p.rating_count ? p.rating_avg.toFixed(1) : 'Yangi'}</span>],
          ...(kg ? ([
            ["Bo'sh joy", (p: any) => p.free_places],
            ['Yosh', (p: any) => (p.min_age != null ? `${p.min_age}–${p.max_age}` : '—')],
            ['Turi', (p: any) => (p.ownership === 'state' ? 'Davlat' : p.ownership === 'private' ? 'Xususiy' : '—')],
            ['Ovqatlanish', (p: any) => p.meal_type || '—'],
            ['Ish vaqti', (p: any) => (p.work_open ? `${p.work_open}–${p.work_close}` : '—')],
            ['Xizmatlar', (p: any) => (p.amenities || []).join(', ') || '—'],
          ] as any) : ([
            ['Fanlar', (p: any) => (p.subjects || []).join(', ') || '—'],
            ['Tajriba', (p: any) => (p.experience_years != null ? `${p.experience_years} yil` : '—')],
            ['Dars turi', (p: any) => ({ online: 'Online', offline: 'Offline', both: 'Online + Offline' } as any)[p.lesson_mode] || '—'],
            ['Tillar', (p: any) => (p.languages || []).join(', ') || '—'],
            ['Xizmatlar', (p: any) => (p.services || []).map((s: any) => `${s.subject} (${s.duration_minutes} daq.)`).join(', ') || '—'],
          ] as any)),
        ];
        return (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 overflow-hidden rounded-2xl bg-white shadow-card text-sm">
              <thead><tr><th className="w-28 bg-primary-50 p-3 text-left" />{items.map((p) => <th key={p.id} className="bg-primary-50 p-3 text-left"><Link href={kg ? `/kindergartens/${p.id}` : `/tutors/${p.id}`} className="font-extrabold text-primary underline">{p.name}</Link></th>)}</tr></thead>
              <tbody>{rows.map(([label, fn, b]) => (
                <tr key={label as string}><td className="border-t border-black/5 p-3 font-semibold text-black/60">{label}</td>
                  {items.map((p, i) => <td key={p.id} className={`border-t border-black/5 p-3 ${b != null && prices[i] === b ? 'bg-primary-50 font-bold text-primary' : ''}`}>{fn(p)}</td>)}</tr>))}</tbody>
            </table>
          </div>
        );
      }}
    </Async>
  );
}

export default function CompareView() {
  return <><PageTitle title="Taqqoslash" /><Suspense><Inner /></Suspense></>;
}
