'use client';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Skeleton, Tabs, PageTitle, Card, Stars, Button } from '@/components/ui/ui';
import { get } from '@/lib/api';
import Link from 'next/link';
import { uzs } from '@/lib/format';
import { LocateFixed } from 'lucide-react';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => <Skeleton className="h-[60vh] w-full" /> });

export default function MapView() {
  const [type, setType] = useState('kindergarten');
  const [sel, setSel] = useState<any>(null);
  const [me, setMe] = useState<[number, number] | null>(null);
  const q = useQuery({ queryKey: ['map', type], queryFn: () => get('/map/providers', { type }) });
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setMe([p.coords.latitude, p.coords.longitude]), () => alert('Joylashuvga ruxsat berilmadi'));
  const kg = type === 'kindergarten';
  return (
    <>
      <PageTitle title="Xarita" sub="OpenStreetMap asosida muassasalar joylashuvi" action={<Button variant="outline" onClick={locate}><LocateFixed size={16} />Joylashuvim</Button>} />
      <div className="mb-3"><Tabs tabs={[{ id: 'kindergarten', label: "Bog'chalar" }, { id: 'tutor', label: 'Repetitorlar' }]} value={type} onChange={(v) => { setType(v); setSel(null); }} /></div>
      <div className="relative">
        <LeafletMap points={q.data || []} onSelect={setSel} me={me} />
        {sel && (
          <Card className="absolute inset-x-3 bottom-3 z-[500] sm:inset-x-auto sm:right-3 sm:w-80 shadow-pop">
            <div className="font-extrabold text-primary">{sel.name}</div>
            <div className="flex items-center gap-2 text-sm"><Stars value={sel.rating_avg} size={14} />{sel.rating_count ? sel.rating_avg.toFixed(1) : 'Yangi'}</div>
            <div className="text-sm text-black/60">{sel.address}</div>
            <div className="mt-1 font-bold text-primary">{uzs(kg ? sel.monthly_price : sel.hourly_price)}</div>
            <div className="mt-2 flex gap-2"><Link className="btn btn-primary flex-1" href={kg ? `/kindergartens/${sel.id}` : `/tutors/${sel.id}`}>Batafsil</Link><Button variant="outline" onClick={() => setSel(null)}>Yopish</Button></div>
          </Card>
        )}
      </div>
      {q.data?.length === 0 && <p className="mt-3 text-sm text-black/55">Koordinatalari kiritilgan tasdiqlangan muassasalar hali yo‘q.</p>}
    </>
  );
}
