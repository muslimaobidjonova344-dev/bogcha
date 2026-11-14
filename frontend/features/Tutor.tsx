'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CalendarClock, CalendarDays, ClipboardList, GraduationCap, Pencil, Plus, Star, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Async, Badge, Button, Card, Confirm, Empty, Field, Modal, PageTitle, Pagination, StatCard, useToast } from '@/components/ui/ui';
import { del, get, post, put } from '@/lib/api';
import { WEEKDAYS, dmy, dmyHm, errMsg, uzs } from '@/lib/format';
import { Bars, VerificationBanner } from './ProviderCommon';

export function TutorDashboard() {
  const q = useQuery({ queryKey: ['prov-dashboard'], queryFn: () => get('/me/provider/dashboard') });
  return (
    <>
      <PageTitle title="Dashboard" />
      <VerificationBanner />
      <Async q={q} rows={3}>{(d) => (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <StatCard label="Jami o‘quvchilar" value={d.total_students} href="/tutor/students" icon={<GraduationCap size={16} />} />
            <StatCard label="Yangi so‘rovlar" value={d.new_requests} href="/tutor/requests" tone="yellow" icon={<ClipboardList size={16} />} />
            <StatCard label="Faol darslar" value={d.active_lessons} href="/tutor/schedule" tone="peach" icon={<BookOpen size={16} />} />
            <StatCard label="Bugungi darslar" value={d.today_lessons} href="/tutor/schedule" icon={<CalendarDays size={16} />} />
            <StatCard label="Haftalik darslar" value={d.week_lessons} href="/tutor/schedule" tone="peach" icon={<CalendarClock size={16} />} />
            <StatCard label="O‘rtacha reyting" value={d.rating_count ? d.rating_avg.toFixed(1) : '—'} href="/tutor/reviews" tone="yellow" icon={<Star size={16} />} />
            <StatCard label="Oylik daromad" value={uzs(d.monthly_income)} icon={<Wallet size={16} />} tone="plain" />
          </div>
          <p className="text-xs text-black/50">Daromad — shu oy o‘tkazilgan (belgilangan) darslar narxi yig‘indisi. To‘lov moduli hali yoqilmagan.</p>
          <Card><h2 className="mb-3 font-bold text-primary">So‘rovlar dinamikasi</h2><Bars data={d.applications_by_month.map((x: any) => ({ k: x.month, v: x.count }))} /></Card>
        </div>)}
      </Async>
    </>
  );
}

/* ---------- Fanlar ---------- */
export function Subjects() {
  const qc = useQueryClient(); const toast = useToast();
  const mine = useQuery({ queryKey: ['subjects'], queryFn: () => get('/me/provider/subjects') });
  const cats = useQuery({ queryKey: ['cat', 'subject'], queryFn: () => get('/categories', { kind: 'subject' }) });
  const [sel, setSel] = useState<string[] | null>(null); const [custom, setCustom] = useState('');
  const cur: string[] = sel ?? mine.data ?? [];
  const all = Array.from(new Set([...(cats.data || []).map((c: any) => c.name), ...cur]));
  const save = useMutation({ mutationFn: () => put('/me/provider/subjects', { subjects: cur }), onSuccess: () => { toast.ok('Saqlandi'); qc.invalidateQueries({ queryKey: ['subjects'] }); }, onError: (e) => toast.err(errMsg(e)) });
  return (
    <><PageTitle title="Fanlar" sub="O‘qitadigan fanlaringizni tanlang" />
      <Card><div className="flex flex-wrap gap-2">{all.map((s) => { const on = cur.includes(s); return <button key={s} onClick={() => setSel(on ? cur.filter((x) => x !== s) : [...cur, s])} className={`rounded-full border px-4 py-2 text-sm font-semibold min-h-[40px] ${on ? 'border-primary bg-primary text-white' : 'border-primary/30 bg-white text-primary'}`}>{s}</button>; })}</div>
        <div className="mt-3 flex gap-2"><input className="input" placeholder="Boshqa fan qo‘shish" value={custom} onChange={(e) => setCustom(e.target.value)} /><Button variant="outline" disabled={!custom.trim()} onClick={() => { setSel([...cur, custom.trim()]); setCustom(''); }}>Qo‘shish</Button></div>
        <Button className="mt-4" loading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></Card></>
  );
}

/* ---------- Xizmatlar / Narxlar ---------- */
export function Services({ prices }: { prices?: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['services'], queryFn: () => get('/me/provider/services') });
  const [f, setF] = useState<any>(null); const [delId, setDelId] = useState<string | null>(null);
  const empty = { subject: '', education_level: '5–9-sinf', grades: '', duration_minutes: 60, format: 'individual', mode: 'offline', price: '', language: 'uz', description: '' };
  const save = useMutation({
    mutationFn: () => { const b = { subject: f.subject, education_level: f.education_level, grades: (typeof f.grades === 'string' ? f.grades.split(',') : f.grades || []).map((s: string) => s.trim()).filter(Boolean), duration_minutes: +f.duration_minutes, format: f.format, mode: f.mode, price: +f.price, language: f.language, description: f.description || null }; return f.id ? put(`/me/provider/services/${f.id}`, b) : post('/me/provider/services', b); },
    onSuccess: () => { toast.ok('Saqlandi'); setF(null); qc.invalidateQueries({ queryKey: ['services'] }); qc.invalidateQueries({ queryKey: ['subjects'] }); }, onError: (e) => toast.err(errMsg(e)),
  });
  const rm = useMutation({ mutationFn: (id: string) => del(`/me/provider/services/${id}`), onSuccess: () => { setDelId(null); qc.invalidateQueries({ queryKey: ['services'] }); } });
  const S = (k: string, label: string, opts: [string, string][]) => <Field label={label}><select className="input" value={f?.[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;
  return (
    <>
      <PageTitle title={prices ? 'Narxlar' : 'Dars xizmatlari'} action={<Button onClick={() => setF({ ...empty })}><Plus size={18} />Xizmat qo‘shish</Button>} />
      <Async q={q} empty={<Empty title="Xizmatlar yo‘q" text="Fan, narx va dars turini kiriting — shundan keyin o‘quvchilar so‘rov yubora oladi." action={<Button onClick={() => setF({ ...empty })}>Xizmat qo‘shish</Button>} />}>
        {(list) => <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((s: any) => (<Card key={s.id}><div className="flex items-start justify-between"><div><div className="text-lg font-extrabold text-primary">{s.subject}</div><div className="text-sm text-black/55">{s.education_level}{s.grades?.length ? ` · ${s.grades.join(', ')}-sinf` : ''}</div></div><div className="flex"><button className="p-2" onClick={() => setF({ ...s, grades: (s.grades || []).join(', '), description: s.description || '' })} aria-label="Tahrirlash"><Pencil size={16} /></button><button className="p-2 text-red-600" onClick={() => setDelId(s.id)} aria-label="O‘chirish"><Trash2 size={16} /></button></div></div>
          <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{s.duration_minutes} daq.</Badge><Badge>{s.format === 'group' ? 'Guruh' : 'Individual'}</Badge><Badge>{s.mode === 'online' ? 'Online' : 'Offline'}</Badge><Badge>{s.language.toUpperCase()}</Badge></div><div className="mt-2 text-xl font-extrabold text-primary">{uzs(s.price)}</div></Card>))}</div>}
      </Async>
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}>
        <div className="space-y-3">
          <Field label="Fan"><input className="input" value={f?.subject ?? ''} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          {S('education_level', 'Ta‘lim bosqichi', ['Maktabgacha', '1–4-sinf', '5–9-sinf', '10–11-sinf', 'Abituriyent'].map((x) => [x, x]))}
          <Field label="Sinflar (vergul bilan)"><input className="input" value={f?.grades ?? ''} onChange={(e) => setF({ ...f, grades: e.target.value })} placeholder="5, 6, 7" /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Davomiyligi (daq.)"><input type="number" className="input" min={15} max={300} step={5} value={f?.duration_minutes ?? 60} onChange={(e) => setF({ ...f, duration_minutes: e.target.value })} /></Field><Field label="Narx (so‘m)"><input type="number" className="input" min={0} value={f?.price ?? ''} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field></div>
          <div className="grid grid-cols-3 gap-2">{S('format', 'Format', [['individual', 'Individual'], ['group', 'Guruh']])}{S('mode', 'Turi', [['offline', 'Offline'], ['online', 'Online']])}{S('language', 'Til', [['uz', 'O‘zbek'], ['ru', 'Rus'], ['en', 'Ingliz']])}</div>
          <Field label="Tavsif"><textarea className="input" rows={2} value={f?.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Button className="w-full" loading={save.isPending} disabled={!f?.subject || !f?.price} onClick={() => save.mutate()}>Saqlash</Button>
        </div>
      </Modal>
      <Confirm open={!!delId} onClose={() => setDelId(null)} onYes={() => rm.mutate(delId!)} danger title="Xizmatni o‘chirish" text="Xizmat o‘chiriladi. Mavjud arizalar saqlanib qoladi." />
    </>
  );
}

/* ---------- Bo'sh vaqtlar (haftalik) ---------- */
export function Availability() {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['avail'], queryFn: () => get('/me/provider/schedule') });
  const [w, setW] = useState<any[] | null>(null);
  const cur: any[] = w ?? q.data ?? [];
  const save = useMutation({ mutationFn: () => put('/me/provider/schedule', { windows: cur.map((x) => ({ weekday: x.weekday, start_time: x.start_time, end_time: x.end_time })) }), onSuccess: () => { toast.ok('Jadval saqlandi'); setW(null); qc.invalidateQueries({ queryKey: ['avail'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const upd = (i: number, k: string, v: any) => setW(cur.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <>
      <PageTitle title="Bo‘sh vaqtlar" sub="Haftaning har bir kuni uchun dars qabul qiladigan vaqt oynalari (Toshkent vaqti)" />
      <Async q={q} rows={2}>{() => (
        <div className="space-y-3">{[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Card key={d} className="!p-3"><div className="mb-2 flex items-center justify-between"><b className="text-primary">{WEEKDAYS[d]}</b><Button variant="ghost" className="!min-h-[36px]" onClick={() => setW([...cur, { weekday: d, start_time: '15:00', end_time: '18:00' }])}><Plus size={16} />Oyna</Button></div>
            {cur.map((x, i) => x.weekday === d && (<div key={i} className="mb-2 flex items-center gap-2"><input type="time" className="input" value={x.start_time} onChange={(e) => upd(i, 'start_time', e.target.value)} /><span>—</span><input type="time" className="input" value={x.end_time} onChange={(e) => upd(i, 'end_time', e.target.value)} /><button className="p-2 text-red-600" onClick={() => setW(cur.filter((_, j) => j !== i))} aria-label="O‘chirish"><Trash2 size={16} /></button></div>))}
            {!cur.some((x) => x.weekday === d) && <p className="text-sm text-black/40">Dam olish kuni</p>}</Card>))}
          <Button loading={save.isPending} disabled={!w} onClick={() => save.mutate()}>Jadvalni saqlash</Button></div>)}
      </Async>
    </>
  );
}

/* ---------- Dars jadvali va tarix ---------- */
export function Lessons({ history }: { history?: boolean }) {
  const qc = useQueryClient(); const toast = useToast(); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['lessons', history, page], queryFn: () => get('/me/provider/lessons', { history, page, page_size: 20 }) });
  const m = useMutation({ mutationFn: ({ id, status }: any) => post(`/me/provider/lessons/${id}/status`, { status }), onSuccess: () => { toast.ok('Saqlandi'); qc.invalidateQueries({ queryKey: ['lessons'] }); qc.invalidateQueries({ queryKey: ['prov-dashboard'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const lbl: Record<string, string> = { planned: 'Rejalashtirilgan', done: 'O‘tkazildi', cancelled: 'Bekor qilindi' };
  return (
    <>
      <PageTitle title={history ? 'Darslar tarixi' : 'Dars jadvali'} />
      <Async q={q} empty={<Empty title={history ? 'Tarix bo‘sh' : 'Rejalashtirilgan darslar yo‘q'} text={history ? undefined : 'So‘rovni qabul qilganingizda dars shu yerda paydo bo‘ladi.'} />}>
        {(d) => (<><div className="space-y-2">{d.items.map((l: any) => (<Card key={l.id} className="flex flex-wrap items-center justify-between gap-2 !p-3"><div><div className="font-bold">{l.student_name} · {l.subject}</div><div className="text-sm text-black/55">{dmyHm(l.starts_at)} — {new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }).format(new Date(l.ends_at))}{l.price ? ` · ${uzs(l.price)}` : ''}</div></div>
          <div className="flex items-center gap-2"><Badge cls={l.status === 'done' ? 'bg-primary-100 text-primary' : l.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-sun-light text-amber-800'}>{lbl[l.status]}</Badge>
            {l.status === 'planned' && <><Button variant="outline" className="!min-h-[36px]" onClick={() => m.mutate({ id: l.id, status: 'done' })}>O‘tkazildi</Button><Button variant="ghost" className="!min-h-[36px] !text-red-600" onClick={() => m.mutate({ id: l.id, status: 'cancelled' })}>Bekor</Button></>}</div></Card>))}</div><Pagination page={page} pageSize={20} total={d.total} onChange={setPage} /></>)}
      </Async>
    </>
  );
}

export function TutorStudents() {
  const q = useQuery({ queryKey: ['students'], queryFn: () => get('/me/provider/students') });
  return (<><PageTitle title="O‘quvchilar" /><Async q={q} empty={<Empty title="O‘quvchilar yo‘q" text="So‘rovni qabul qilganingizda o‘quvchi shu yerda paydo bo‘ladi." />}>
    {(list) => <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((s: any) => (<Card key={s.id} className="!p-3"><div className="font-bold">{s.first_name} {s.last_name}</div><div className="text-sm text-black/55">{s.age} yosh</div><div className="mt-1 text-sm">Ota-ona: {s.parent_name}{s.parent_phone ? ` · ${s.parent_phone}` : ''}</div><div className="text-xs text-black/40">{dmy(s.since)} dan beri</div></Card>))}</div>}</Async></>);
}
