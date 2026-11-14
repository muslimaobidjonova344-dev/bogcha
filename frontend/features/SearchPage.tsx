'use client';
import { useQuery } from '@tanstack/react-query';
import { LocateFixed, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Async, Button, Card, Empty, Field, Modal, PageTitle, Pagination, Tabs, useToast } from '@/components/ui/ui';
import { get } from '@/lib/api';
import { WEEKDAYS } from '@/lib/format';
import ProviderCard, { CompareBar } from './ProviderCard';
import { useMe } from '@/hooks/useAuth';

function useDebounced<T>(v: T, ms = 400) { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]); return d; }

function Filters({ type, f, set }: { type: string; f: any; set: (k: string, v: any) => void }) {
  const regions = useQuery({ queryKey: ['regions'], queryFn: () => get('/regions'), staleTime: Infinity });
  const districts = useQuery({ queryKey: ['districts', f.region_id], queryFn: () => get(`/regions/${f.region_id}/districts`), enabled: !!f.region_id });
  const subjects = useQuery({ queryKey: ['cat', 'subject'], queryFn: () => get('/categories', { kind: 'subject' }), enabled: type === 'tutor', staleTime: Infinity });
  const levels = useQuery({ queryKey: ['cat', 'level'], queryFn: () => get('/categories', { kind: 'education_level' }), enabled: type === 'tutor', staleTime: Infinity });
  const toast = useToast();
  const locate = () => {
    if (!navigator.geolocation) return toast.err('Brauzer geolokatsiyani qo‘llamaydi');
    navigator.geolocation.getCurrentPosition((p) => { set('lat', p.coords.latitude); set('lng', p.coords.longitude); if (!f.max_distance_km) set('max_distance_km', 10); toast.ok('Joylashuv aniqlandi'); }, () => toast.err('Joylashuvga ruxsat berilmadi'));
  };
  const sel = (k: string, opts: { v: any; l: string }[], ph: string) => (
    <select className="input" value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)}><option value="">{ph}</option>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
  );
  return (
    <div className="space-y-3">
      <Field label="Viloyat">{sel('region_id', (regions.data || []).map((r: any) => ({ v: r.id, l: r.name })), 'Barchasi')}</Field>
      {f.region_id && <Field label="Tuman">{sel('district_id', (districts.data || []).map((r: any) => ({ v: r.id, l: r.name })), 'Barchasi')}</Field>}
      {type === 'kindergarten' ? (
        <>
          <Field label="Farzand yoshi"><input className="input" type="number" min={0} max={18} value={f.age ?? ''} onChange={(e) => set('age', e.target.value)} placeholder="Masalan, 4" /></Field>
          <Field label="Turi">{sel('ownership', [{ v: 'state', l: 'Davlat' }, { v: 'private', l: 'Xususiy' }], 'Barchasi')}</Field>
          <Field label="Ovqatlanish"><input className="input" value={f.meal ?? ''} onChange={(e) => set('meal', e.target.value)} placeholder="Masalan, 4 mahal" /></Field>
          <Field label="Ish vaqti (shu vaqtda ochiq)"><input className="input" type="time" value={f.open_at ?? ''} onChange={(e) => set('open_at', e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-[#245C43]" checked={!!f.has_places} onChange={(e) => set('has_places', e.target.checked)} />Faqat bo‘sh joyi borlar</label>
        </>
      ) : (
        <>
          <Field label="Fan">{sel('subject', (subjects.data || []).map((s: any) => ({ v: s.name, l: s.name })), 'Barchasi')}</Field>
          <Field label="Sinf"><input className="input" value={f.grade ?? ''} onChange={(e) => set('grade', e.target.value)} placeholder="Masalan, 6" /></Field>
          <Field label="Ta'lim bosqichi">{sel('education_level', (levels.data || []).map((s: any) => ({ v: s.name, l: s.name })), 'Barchasi')}</Field>
          <Field label="Dars turi">{sel('mode', [{ v: 'online', l: 'Online' }, { v: 'offline', l: 'Offline' }], 'Barchasi')}</Field>
          <Field label="Dars tili">{sel('language', [{ v: 'uz', l: "O'zbek" }, { v: 'ru', l: 'Rus' }, { v: 'en', l: 'Ingliz' }], 'Barchasi')}</Field>
          <Field label="Bo'sh vaqt (hafta kuni)">{sel('weekday', WEEKDAYS.slice(1).map((l, i) => ({ v: i + 1, l })), 'Barchasi')}</Field>
          <Field label="Tajriba (kamida, yil)"><input className="input" type="number" min={0} value={f.min_experience ?? ''} onChange={(e) => set('min_experience', e.target.value)} /></Field>
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Narx dan"><input className="input" type="number" min={0} value={f.min_price ?? ''} onChange={(e) => set('min_price', e.target.value)} /></Field>
        <Field label="Narx gacha"><input className="input" type="number" min={0} value={f.max_price ?? ''} onChange={(e) => set('max_price', e.target.value)} /></Field>
      </div>
      <Field label="Reyting (kamida)">{sel('min_rating', [4.5, 4, 3.5, 3].map((v) => ({ v, l: `${v}+` })), 'Barchasi')}</Field>
      <div>
        <Button variant="outline" className="w-full" onClick={locate}><LocateFixed size={16} />Yaqinimdagilar (joylashuv)</Button>
        {f.lat && <Field label={`Masofa: ${f.max_distance_km || 10} km gacha`}><input type="range" min={1} max={50} value={f.max_distance_km || 10} onChange={(e) => set('max_distance_km', e.target.value)} className="w-full accent-[#245C43]" /></Field>}
      </div>
      <p className="text-xs text-black/50">Natijalarda faqat administrator tomonidan tasdiqlangan muassasalar ko‘rsatiladi.</p>
    </div>
  );
}

export default function SearchPage({ initialType = 'kindergarten', showTabs = true }: { initialType?: string; showTabs?: boolean }) {
  const [type, setType] = useState(initialType);
  const [f, setF] = useState<any>({ sort: 'rating' });
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const q = useDebounced(text);
  const set = (k: string, v: any) => { setF((s: any) => ({ ...s, [k]: v === '' ? undefined : v, ...(k === 'region_id' ? { district_id: undefined } : {}) })); setPage(1); };
  const params = useMemo(() => ({ ...f, q, page, page_size: 12 }), [f, q, page]);
  const res = useQuery({ queryKey: ['search', type, params], queryFn: () => get(type === 'kindergarten' ? '/kindergartens' : '/tutors', params), placeholderData: (p: any) => p });
  const me = useMe();
  const favs = useQuery({ queryKey: ['favorites'], queryFn: () => get('/favorites'), enabled: me.data?.role === 'parent' });
  const savedIds = new Set((favs.data || []).map((x: any) => x.id));
  const activeCount = Object.entries(f).filter(([k, v]) => v && k !== 'sort').length;
  return (
    <>
      <PageTitle title="Qidiruv" sub="Bog‘cha va repetitorlarni toping, solishtiring va ariza yuboring" />
      {showTabs && <div className="mb-3"><Tabs tabs={[{ id: 'kindergarten', label: "Bog'chalar" }, { id: 'tutor', label: 'Repetitorlar' }]} value={type} onChange={(v) => { setType(v); setF({ sort: 'rating' }); setPage(1); }} /></div>}
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block"><Card><h2 className="mb-3 font-bold text-primary">Filtrlar</h2><Filters type={type} f={f} set={set} /><Button variant="ghost" className="mt-2 w-full" onClick={() => { setF({ sort: 'rating' }); setText(''); }}>Tozalash</Button></Card></aside>
        <section>
          <div className="mb-3 flex gap-2">
            <input className="input" placeholder="Nomi yoki tavsif bo‘yicha qidirish..." value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} aria-label="Qidirish" />
            <select className="input !w-auto" value={f.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Saralash">
              <option value="rating">Reyting</option><option value="price_asc">Narx ↑</option><option value="price_desc">Narx ↓</option><option value="newest">Yangi</option><option value="distance">Masofa</option>
            </select>
            <Button variant="outline" className="lg:hidden" onClick={() => setOpen(true)}><SlidersHorizontal size={18} />{activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{activeCount}</span>}</Button>
          </div>
          <Async q={res} rows={4} empty={<Empty title="Hech narsa topilmadi" text="Filtrlarni o‘zgartirib ko‘ring yoki ularni tozalang." action={<Button variant="outline" onClick={() => { setF({ sort: 'rating' }); setText(''); }}>Filtrlarni tozalash</Button>} />}>
            {(d) => (
              <>
                <p className="mb-3 text-sm text-black/55">Jami: <b>{d.total}</b> ta natija</p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{d.items.map((p: any) => <ProviderCard key={p.id} p={p} saved={savedIds.has(p.id)} />)}</div>
                <Pagination page={page} pageSize={12} total={d.total} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              </>
            )}
          </Async>
        </section>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Filtrlar"><Filters type={type} f={f} set={set} /><Button className="mt-4 w-full" onClick={() => setOpen(false)}>Natijalarni ko‘rish</Button></Modal>
      <CompareBar />
    </>
  );
}
