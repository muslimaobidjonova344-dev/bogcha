'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, ClipboardList, Clock, Layers, Pencil, Plus, Trash2, Users, XCircle, Baby, DoorOpen } from 'lucide-react';
import { useState } from 'react';
import { Async, Button, Card, Confirm, Empty, Field, Modal, PageTitle, StatCard, useToast, Skeleton } from '@/components/ui/ui';
import { del, get, patch, post, put, uploadFile } from '@/lib/api';
import { WEEKDAYS, errMsg, uzs } from '@/lib/format';
import { Bars, VerificationBanner, useMyProvider } from './ProviderCommon';

export function KgDashboard() {
  const q = useQuery({ queryKey: ['prov-dashboard'], queryFn: () => get('/me/provider/dashboard') });
  return (
    <>
      <PageTitle title="Umumiy sahifa" />
      <VerificationBanner />
      <Async q={q} rows={3}>{(d) => (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Jami arizalar" value={d.total_applications} href="/kindergarten/applications" icon={<ClipboardList size={16} />} />
            <StatCard label="Yangi arizalar" value={d.new_applications} href="/kindergarten/applications" tone="yellow" icon={<Clock size={16} />} />
            <StatCard label="Ko‘rib chiqilmoqda" value={d.under_review} href="/kindergarten/applications" tone="peach" />
            <StatCard label="Qabul qilinganlar" value={d.accepted} href="/kindergarten/children" icon={<CheckCircle2 size={16} />} />
            <StatCard label="Rad etilganlar" value={d.rejected} href="/kindergarten/applications" tone="plain" icon={<XCircle size={16} />} />
            <StatCard label="Bolalar soni" value={d.total_children} href="/kindergarten/children" icon={<Baby size={16} />} />
            <StatCard label="Guruhlar" value={d.groups_count} href="/kindergarten/groups" icon={<Layers size={16} />} tone="peach" />
            <StatCard label="Bo‘sh o‘rinlar" value={d.free_places} href="/kindergarten/vacancies" icon={<DoorOpen size={16} />} tone="yellow" />
          </div>
          <Card><h2 className="mb-3 font-bold text-primary">Oylik arizalar statistikasi</h2><Bars data={d.applications_by_month.map((x: any) => ({ k: x.month, v: x.count }))} /></Card>
        </div>)}
      </Async>
    </>
  );
}

/* ---------- Guruhlar ---------- */
export function Groups() {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['groups'], queryFn: () => get('/me/provider/groups') });
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => get('/me/provider/staff') });
  const [f, setF] = useState<any>(null); const [delId, setDelId] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => { const b = { name: f.name, min_age: +f.min_age, max_age: +f.max_age, capacity: +f.capacity, teacher_id: f.teacher_id || null, schedule_text: f.schedule_text || null, meal_type: f.meal_type || null, extra_services: (typeof f.extra_services === 'string' ? f.extra_services.split(',') : f.extra_services || []).map((s: string) => s.trim()).filter(Boolean), monthly_price: f.monthly_price ? +f.monthly_price : null }; return f.id ? patch(`/me/provider/groups/${f.id}`, b) : post('/me/provider/groups', b); },
    onSuccess: () => { toast.ok('Saqlandi'); setF(null); qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['prov-dashboard'] }); }, onError: (e) => toast.err(errMsg(e)),
  });
  const rm = useMutation({ mutationFn: (id: string) => del(`/me/provider/groups/${id}`), onSuccess: () => { toast.ok('O‘chirildi'); setDelId(null); qc.invalidateQueries({ queryKey: ['groups'] }); }, onError: (e) => { toast.err(errMsg(e)); setDelId(null); } });
  const I = (k: string, label: string, props: any = {}) => <Field label={label}><input className="input" value={f?.[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /></Field>;
  return (
    <>
      <PageTitle title="Guruhlar" action={<Button onClick={() => setF({ name: '', min_age: 3, max_age: 6, capacity: 20 })}><Plus size={18} />Yangi guruh</Button>} />
      <Async q={q} empty={<Empty title="Guruhlar yo‘q" text="Birinchi guruhni yarating — ota-onalar shu guruhga ariza yuboradi." action={<Button onClick={() => setF({ name: '', min_age: 3, max_age: 6, capacity: 20 })}>Guruh yaratish</Button>} />}>
        {(list) => <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((g: any) => (
          <Card key={g.id}><div className="flex items-start justify-between"><div><div className="text-lg font-extrabold text-primary">{g.name}</div><div className="text-sm text-black/55">{g.min_age}–{g.max_age} yosh</div></div>
            <div className="flex gap-1"><button className="rounded-lg p-2 hover:bg-black/5" aria-label="Tahrirlash" onClick={() => setF({ ...g, extra_services: (g.extra_services || []).join(', ') })}><Pencil size={17} /></button><button className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="O‘chirish" onClick={() => setDelId(g.id)}><Trash2 size={17} /></button></div></div>
            <div className="mt-3 h-2 rounded-full bg-black/10"><div className="h-2 rounded-full bg-primary" style={{ width: `${(g.current_count / g.capacity) * 100}%` }} /></div>
            <div className="mt-1 flex justify-between text-sm"><span>{g.current_count} / {g.capacity} bola</span><b className={g.free_places ? 'text-primary' : 'text-red-600'}>{g.free_places} bo‘sh</b></div>
            <div className="mt-2 text-sm text-black/60">Tarbiyachi: {g.teacher_name || '—'}</div>{g.meal_type && <div className="text-sm text-black/60">Ovqat: {g.meal_type}</div>}{g.monthly_price && <div className="text-sm font-semibold">{uzs(g.monthly_price)}</div>}</Card>))}</div>}
      </Async>
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Guruhni tahrirlash' : 'Yangi guruh'}>
        <div className="space-y-3">{I('name', 'Guruh nomi')}
          <div className="grid grid-cols-3 gap-2">{I('min_age', 'Min yosh', { type: 'number', min: 0, max: 18 })}{I('max_age', 'Maks yosh', { type: 'number', min: 0, max: 18 })}{I('capacity', 'Sig‘im', { type: 'number', min: 1 })}</div>
          <Field label="Tarbiyachi"><select className="input" value={f?.teacher_id ?? ''} onChange={(e) => setF({ ...f, teacher_id: e.target.value })}><option value="">Tanlanmagan</option>{staff.data?.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>
          {I('meal_type', 'Ovqatlanish turi')}{I('monthly_price', 'Oylik narx (so‘m)', { type: 'number' })}{I('extra_services', 'Qo‘shimcha xizmatlar (vergul bilan)')}
          <Field label="Mashg‘ulot jadvali"><textarea className="input" rows={3} value={f?.schedule_text ?? ''} onChange={(e) => setF({ ...f, schedule_text: e.target.value })} /></Field>
          <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></div>
      </Modal>
      <Confirm open={!!delId} onClose={() => setDelId(null)} onYes={() => rm.mutate(delId!)} loading={rm.isPending} danger title="Guruhni o‘chirish" text="Guruh o‘chiriladi (faqat bolalari yo‘q bo‘lsa)." />
    </>
  );
}

/* ---------- Tarbiyachilar ---------- */
export function Staff() {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['staff'], queryFn: () => get('/me/provider/staff') });
  const [f, setF] = useState<any>(null);
  const save = useMutation({ mutationFn: () => { const b = { full_name: f.full_name, position: f.position || 'Tarbiyachi', phone: f.phone || null, experience_years: f.experience_years ? +f.experience_years : null, photo_url: f.photo_url || null }; return f.id ? put(`/me/provider/staff/${f.id}`, b) : post('/me/provider/staff', b); }, onSuccess: () => { toast.ok('Saqlandi'); setF(null); qc.invalidateQueries({ queryKey: ['staff'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const rm = useMutation({ mutationFn: (id: string) => del(`/me/provider/staff/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }) });
  const I = (k: string, label: string, props: any = {}) => <Field label={label}><input className="input" value={f?.[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /></Field>;
  return (
    <>
      <PageTitle title="Tarbiyachilar" action={<Button onClick={() => setF({ full_name: '', position: 'Tarbiyachi' })}><Plus size={18} />Qo‘shish</Button>} />
      <Async q={q} empty={<Empty title="Tarbiyachilar kiritilmagan" />}>
        {(list) => <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((s: any) => (<Card key={s.id} className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-secondary-light font-bold text-primary">{s.full_name.charAt(0)}</div><div className="min-w-0 flex-1"><div className="truncate font-bold">{s.full_name}</div><div className="text-sm text-black/55">{s.position}{s.experience_years != null ? ` · ${s.experience_years} yil` : ''}</div>{s.phone && <div className="text-sm">{s.phone}</div>}</div><button className="p-2" onClick={() => setF(s)} aria-label="Tahrirlash"><Pencil size={16} /></button><button className="p-2 text-red-600" onClick={() => rm.mutate(s.id)} aria-label="O‘chirish"><Trash2 size={16} /></button></Card>))}</div>}
      </Async>
      <Modal open={!!f} onClose={() => setF(null)} title="Tarbiyachi"><div className="space-y-3">{I('full_name', 'Ism va familiya')}{I('position', 'Lavozim')}{I('phone', 'Telefon')}{I('experience_years', 'Tajriba (yil)', { type: 'number' })}<Button className="w-full" loading={save.isPending} disabled={!f?.full_name} onClick={() => save.mutate()}>Saqlash</Button></div></Modal>
    </>
  );
}

/* ---------- Bolalar ---------- */
export function KgChildren() {
  const qc = useQueryClient(); const toast = useToast();
  const [gid, setGid] = useState('');
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => get('/me/provider/groups') });
  const q = useQuery({ queryKey: ['students', gid], queryFn: () => get('/me/provider/students', { group_id: gid }) });
  const [mv, setMv] = useState<any>(null); const [to, setTo] = useState('');
  const move = useMutation({ mutationFn: () => post(`/me/provider/students/${mv.id}/move`, { group_id: to }), onSuccess: () => { toast.ok('Ko‘chirildi'); setMv(null); qc.invalidateQueries({ queryKey: ['students'] }); qc.invalidateQueries({ queryKey: ['groups'] }); }, onError: (e) => toast.err(errMsg(e)) });
  return (
    <>
      <PageTitle title="Bolalar" />
      <div className="mb-3"><select className="input !w-auto" value={gid} onChange={(e) => setGid(e.target.value)}><option value="">Barcha guruhlar</option>{groups.data?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
      <Async q={q} empty={<Empty title="Qabul qilingan bolalar yo‘q" text="Arizani qabul qilganingizda bola shu yerda paydo bo‘ladi." />}>
        {(list) => <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((s: any) => (<Card key={s.id} className="!p-3"><div className="flex items-start justify-between"><div><div className="font-bold">{s.first_name} {s.last_name}</div><div className="text-sm text-black/55">{s.age} yosh · {s.group_name || 'Guruhsiz'}</div></div><Button variant="ghost" className="!min-h-[36px]" onClick={() => { setMv(s); setTo(''); }}>Ko‘chirish</Button></div><div className="mt-1 text-sm">Ota-ona: {s.parent_name}{s.parent_phone ? ` · ${s.parent_phone}` : ''}</div>{s.extra_info && <div className="mt-1 rounded-lg bg-sun-light p-2 text-xs">{s.extra_info}</div>}</Card>))}</div>}
      </Async>
      <Modal open={!!mv} onClose={() => setMv(null)} title="Boshqa guruhga ko‘chirish"><Field label="Yangi guruh"><select className="input" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Tanlang</option>{groups.data?.filter((g: any) => g.id !== mv?.group_id).map((g: any) => <option key={g.id} value={g.id}>{g.name} ({g.free_places} bo‘sh)</option>)}</select></Field><Button className="mt-3 w-full" disabled={!to} loading={move.isPending} onClick={() => move.mutate()}>Ko‘chirish</Button></Modal>
    </>
  );
}

/* ---------- Bo'sh o'rinlar / Narxlar ---------- */
export function Vacancies({ prices }: { prices?: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['groups'], queryFn: () => get('/me/provider/groups') });
  const [edit, setEdit] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: ({ id, body }: any) => patch(`/me/provider/groups/${id}`, body), onSuccess: () => { toast.ok('Saqlandi'); qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['prov-dashboard'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const key = prices ? 'monthly_price' : 'capacity';
  return (
    <>
      <PageTitle title={prices ? 'Narxlar' : 'Bo‘sh o‘rinlar'} sub={prices ? 'Har bir guruh uchun oylik narx' : 'Bo‘sh joy = sig‘im − hozirgi bolalar soni (avtomatik)'} />
      <Async q={q} empty={<Empty title="Avval guruh yarating" />}>
        {(list) => <div className="space-y-2">{list.map((g: any) => (
          <Card key={g.id} className="flex flex-wrap items-center justify-between gap-3 !p-3"><div><div className="font-bold">{g.name}</div><div className="text-sm text-black/55">{g.current_count}/{g.capacity} · {g.free_places} bo‘sh</div></div>
            <div className="flex items-center gap-2"><input className="input !w-36" type="number" min={prices ? 0 : g.current_count} placeholder={prices ? 'Narx' : 'Sig‘im'} value={edit[g.id] ?? g[key] ?? ''} onChange={(e) => setEdit({ ...edit, [g.id]: e.target.value })} /><Button disabled={edit[g.id] === undefined} loading={save.isPending} onClick={() => save.mutate({ id: g.id, body: { [key]: +edit[g.id] } })}>Saqlash</Button></div></Card>))}</div>}
      </Async>
    </>
  );
}

/* ---------- Xizmatlar (qulayliklar) / Jadval (ish vaqti) / Galereya ---------- */
export function Amenities() {
  const qc = useQueryClient(); const toast = useToast();
  const p = useMyProvider(); const cats = useQuery({ queryKey: ['cat', 'amenity'], queryFn: () => get('/categories', { kind: 'amenity' }) });
  const [sel, setSel] = useState<string[] | null>(null);
  const cur: string[] = sel ?? p.data?.amenities ?? [];
  const save = useMutation({ mutationFn: () => put('/me/provider', { amenities: cur }), onSuccess: () => { toast.ok('Saqlandi'); qc.invalidateQueries({ queryKey: ['my-provider'] }); }, onError: (e) => toast.err(errMsg(e)) });
  return (<><PageTitle title="Xizmatlar" sub="Bog‘changiz taqdim etadigan xizmatlar va qulayliklar" /><Card><div className="flex flex-wrap gap-2">{cats.data?.map((c: any) => { const on = cur.includes(c.name); return <button key={c.id} onClick={() => setSel(on ? cur.filter((x) => x !== c.name) : [...cur, c.name])} className={`rounded-full border px-4 py-2 text-sm font-semibold min-h-[40px] ${on ? 'border-primary bg-primary text-white' : 'border-primary/30 bg-white text-primary'}`}>{c.name}</button>; })}</div><Button className="mt-4" loading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></Card></>);
}

export function KgSchedule() {
  const qc = useQueryClient(); const toast = useToast();
  const p = useMyProvider(); const groups = useQuery({ queryKey: ['groups'], queryFn: () => get('/me/provider/groups') });
  const [days, setDays] = useState<number[] | null>(null); const [o, setO] = useState<string | null>(null); const [c, setC] = useState<string | null>(null);
  const [txt, setTxt] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: () => put('/me/provider', { work_days: days ?? p.data.work_days, work_open: o ?? p.data.work_open, work_close: c ?? p.data.work_close }), onSuccess: () => { toast.ok('Saqlandi'); qc.invalidateQueries({ queryKey: ['my-provider'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const saveG = useMutation({ mutationFn: (id: string) => patch(`/me/provider/groups/${id}`, { schedule_text: txt[id] }), onSuccess: () => { toast.ok('Saqlandi'); qc.invalidateQueries({ queryKey: ['groups'] }); }, onError: (e) => toast.err(errMsg(e)) });
  if (!p.data) return <Skeleton className="h-40" />;
  const cd = days ?? p.data.work_days ?? [];
  return (
    <>
      <PageTitle title="Jadval" />
      <Card className="mb-4 space-y-3"><h2 className="font-bold text-primary">Ish kunlari va vaqti</h2>
        <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 7].map((d) => <button key={d} onClick={() => setDays(cd.includes(d) ? cd.filter((x: number) => x !== d) : [...cd, d].sort())} className={`rounded-xl px-3 py-2 text-sm font-semibold min-h-[40px] ${cd.includes(d) ? 'bg-primary text-white' : 'bg-primary-50 text-primary'}`}>{WEEKDAYS[d].slice(0, 3)}</button>)}</div>
        <div className="grid grid-cols-2 gap-3"><Field label="Ochilish"><input type="time" className="input" value={o ?? p.data.work_open?.slice(0, 5) ?? ''} onChange={(e) => setO(e.target.value)} /></Field><Field label="Yopilish"><input type="time" className="input" value={c ?? p.data.work_close?.slice(0, 5) ?? ''} onChange={(e) => setC(e.target.value)} /></Field></div>
        <Button loading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></Card>
      <h2 className="mb-2 font-bold text-primary">Guruhlar mashg‘ulot jadvali</h2>
      <Async q={groups} empty={<Empty title="Guruhlar yo‘q" />}>{(list) => <div className="space-y-3">{list.map((g: any) => (<Card key={g.id}><div className="mb-1 font-bold">{g.name}</div><textarea className="input" rows={3} value={txt[g.id] ?? g.schedule_text ?? ''} onChange={(e) => setTxt({ ...txt, [g.id]: e.target.value })} placeholder="Masalan: 08:30 nonushta; 09:30 mashg‘ulot; 12:00 tushlik..." /><Button className="mt-2" disabled={txt[g.id] === undefined} onClick={() => saveG.mutate(g.id)}>Saqlash</Button></Card>))}</div>}</Async>
    </>
  );
}

export function Gallery() {
  const qc = useQueryClient(); const toast = useToast(); const p = useMyProvider(); const [busy, setBusy] = useState(false);
  const gal: string[] = p.data?.gallery || [];
  const put_ = useMutation({ mutationFn: (g: string[]) => put('/me/provider', { gallery: g }), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-provider'] }), onError: (e) => toast.err(errMsg(e)) });
  const add = async (f?: File) => { if (!f) return; setBusy(true); try { const r = await uploadFile(f, 'public-image'); put_.mutate([...gal, r.url].slice(-24)); } catch (e) { toast.err(errMsg(e)); } setBusy(false); };
  return (<><PageTitle title="Galereya" action={<label className="btn btn-primary cursor-pointer">{busy ? 'Yuklanmoqda...' : 'Rasm qo‘shish'}<input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => add(e.target.files?.[0])} /></label>} />
    {gal.length === 0 ? <Empty title="Rasmlar yo‘q" text="Bog‘cha rasmlarini yuklang." /> : <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{gal.map((u) => (<div key={u} className="group relative overflow-hidden rounded-2xl"><img src={u} alt="" className="aspect-square w-full object-cover" loading="lazy" /><button onClick={() => put_.mutate(gal.filter((x) => x !== u))} className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-red-600" aria-label="O‘chirish"><Trash2 size={16} /></button></div>))}</div>}</>);
}
