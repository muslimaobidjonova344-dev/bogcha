'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Baby, Bell, ClipboardList, Clock, Heart, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Async, Button, Card, Confirm, Empty, Field, Modal, PageTitle, Pagination, StatCard, StatusBadge, Stars, Tabs, useToast, Skeleton } from '@/components/ui/ui';
import { useMe } from '@/hooks/useAuth';
import { del, get, patch, post, put } from '@/lib/api';
import { APP_STATUS, dmy, dmyHm, errMsg } from '@/lib/format';
import { ContractPanel } from './Contracts';
import ProviderCard from './ProviderCard';

/* ---------- Dashboard ---------- */
export function ParentDashboard() {
  const me = useMe();
  const q = useQuery({ queryKey: ['parent-dashboard'], queryFn: () => get('/parents/dashboard') });
  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-r from-[#EEF5F1] via-[#F6F3E6] to-[#FCEBDD] shadow-card">
        <div className="relative z-10 max-w-xl p-6 sm:p-9">
          <h1 className="text-[28px] font-extrabold leading-tight text-[#14392A] sm:text-[34px]">Xush kelibsiz, {(me.data?.full_name || '').replace('[DEMO] ', '').split(' ')[0]}! <span aria-hidden>👋</span></h1>
          <p className="mt-2 text-[16px] text-black/60">Farzandingiz uchun eng yaxshi ta‘lim imkoniyatlarini bir joyda toping, solishtiring va ariza yuboring.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/parent/search" className="btn btn-primary">Bog‘cha qidirish</Link>
            <Link href="/parent/search?type=tutor" className="btn btn-outline">Repetitor topish</Link>
            <Link href="/parent/map" className="btn btn-outline">Xaritada ko‘rish</Link>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/auth/hero-kids.jpg" alt="" aria-hidden className="absolute inset-y-0 right-0 hidden h-full w-[46%] object-cover object-[50%_30%] [mask-image:linear-gradient(to_right,transparent,#000_35%)] md:block" />
      </section>
      <Async q={q} rows={3}>
        {(d) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Farzandlar" value={d.children_count} href="/parent/children" icon={<Baby size={16} />} />
              <StatCard label="Faol arizalar" value={d.active_applications} href="/parent/applications" icon={<ClipboardList size={16} />} tone="peach" />
              <StatCard label="Javob kutilmoqda" value={d.awaiting_applications} href="/parent/applications?status=SUBMITTED" icon={<Clock size={16} />} tone="yellow" />
              <StatCard label="Yangi xabarlar" value={d.unread_messages} href="/parent/messages" icon={<MessageSquare size={16} />} />
              <StatCard label="Saqlanganlar" value={d.saved_count} href="/parent/saved" icon={<Heart size={16} />} tone="peach" />
              <StatCard label="Bildirishnomalar" value={d.unread_notifications} href="/parent/notifications" icon={<Bell size={16} />} tone="yellow" />
            </div>
            <section>
              <div className="mb-2 flex items-center justify-between"><h2 className="font-extrabold text-primary">Farzandlarim</h2><Link href="/parent/children" className="text-sm font-semibold text-primary">Barchasi →</Link></div>
              {d.children.length === 0 ? <Empty title="Farzand qo‘shilmagan" text="Ariza yuborish uchun farzand profilini yarating." action={<Link href="/parent/children" className="btn btn-primary">Farzand qo‘shish</Link>} /> :
                <div className="flex gap-3 overflow-x-auto pb-1">{d.children.map((c: any) => (<Card key={c.id} className="min-w-[200px] !p-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-peach-light text-xl">🧒</div><div className="mt-2 font-bold">{c.first_name} {c.last_name}</div><div className="text-sm text-black/55">{c.age_text}{c.education_level ? ` · ${c.education_level}` : ''}</div></Card>))}</div>}
            </section>
            <section>
              <h2 className="mb-2 font-extrabold text-primary">Oxirgi arizalar</h2>
              {d.recent_applications.length === 0 ? <Empty title="Hali ariza yo‘q" action={<Link href="/parent/search" className="btn btn-primary">Qidirishni boshlash</Link>} /> :
                <div className="space-y-2">{d.recent_applications.map((a: any) => (<Link key={a.id} href={`/parent/applications/${a.id}`}><Card className="flex items-center justify-between gap-2 !p-3"><div className="min-w-0"><div className="truncate font-bold">{a.provider_name}</div><div className="text-xs text-black/50">{a.number} · {dmy(a.created_at)}</div></div><StatusBadge status={a.status} /></Card></Link>))}</div>}
            </section>
            <section><h2 className="mb-2 font-extrabold text-primary">Sizga tavsiya etilgan bog‘chalar</h2>
              {d.recommended_kindergartens.length === 0 ? <p className="text-sm text-black/55">Hozircha tavsiyalar yo‘q.</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{d.recommended_kindergartens.map((p: any) => <ProviderCard key={p.id} p={p} />)}</div>}</section>
            <section><h2 className="mb-2 font-extrabold text-primary">Sizga tavsiya etilgan repetitorlar</h2>
              {d.recommended_tutors.length === 0 ? <p className="text-sm text-black/55">Hozircha tavsiyalar yo‘q.</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{d.recommended_tutors.map((p: any) => <ProviderCard key={p.id} p={p} />)}</div>}</section>
          </div>
        )}
      </Async>
    </>
  );
}

/* ---------- Farzandlar ---------- */
const childSchema = z.object({
  first_name: z.string().min(1, 'Ism majburiy').max(80), last_name: z.string().min(1, 'Familiya majburiy').max(80),
  birth_date: z.string().min(1, 'Tug‘ilgan sana majburiy').refine((v) => new Date(v) <= new Date(), 'Sana kelajakda bo‘lmasligi kerak'),
  education_level: z.string().optional(), interests: z.string().optional(), parent_note: z.string().max(1000).optional(), extra_info: z.string().max(2000).optional(),
});

export function Children() {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['children'], queryFn: () => get('/children') });
  const [edit, setEdit] = useState<any>(null); const [delId, setDelId] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({ resolver: zodResolver(childSchema) });
  const open = (c?: any) => { setEdit(c || {}); reset(c ? { ...c, interests: (c.interests || []).join(', '), education_level: c.education_level || '', parent_note: c.parent_note || '', extra_info: c.extra_info || '' } : { first_name: '', last_name: '', birth_date: '', education_level: '', interests: '', parent_note: '', extra_info: '' }); };
  const save = useMutation({
    mutationFn: (v: any) => { const body = { ...v, interests: (v.interests || '').split(',').map((s: string) => s.trim()).filter(Boolean), education_level: v.education_level || null, parent_note: v.parent_note || null, extra_info: v.extra_info || null }; return edit.id ? patch(`/children/${edit.id}`, body) : post('/children', body); },
    onSuccess: () => { toast.ok('Saqlandi'); setEdit(null); qc.invalidateQueries({ queryKey: ['children'] }); }, onError: (e) => toast.err(errMsg(e)),
  });
  const rm = useMutation({ mutationFn: (id: string) => del(`/children/${id}`), onSuccess: () => { toast.ok('O‘chirildi'); setDelId(null); qc.invalidateQueries({ queryKey: ['children'] }); }, onError: (e) => { toast.err(errMsg(e)); setDelId(null); } });
  return (
    <>
      <PageTitle title="Farzandlarim" action={<Button onClick={() => open()}><Plus size={18} />Farzand qo‘shish</Button>} />
      <Async q={q} empty={<Empty title="Farzand qo‘shilmagan" text="Ariza yuborish uchun farzand ma‘lumotlarini kiriting." action={<Button onClick={() => open()}>Farzand qo‘shish</Button>} />}>
        {(list) => <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((c: any) => (
          <Card key={c.id}><div className="flex items-start justify-between"><div><div className="text-lg font-extrabold text-primary">{c.first_name} {c.last_name}</div><div className="text-sm text-black/55">{c.age_text} · {dmy(c.birth_date)}</div></div>
            <div className="flex gap-1"><button onClick={() => open(c)} className="rounded-lg p-2 hover:bg-black/5" aria-label="Tahrirlash"><Pencil size={17} /></button><button onClick={() => setDelId(c.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="O‘chirish"><Trash2 size={17} /></button></div></div>
            {c.education_level && <div className="mt-2 text-sm">Bosqich: <b>{c.education_level}</b></div>}
            {c.interests?.length > 0 && <div className="mt-1 text-sm">Qiziqishlar: {c.interests.join(', ')}</div>}
            {c.parent_note && <div className="mt-1 text-sm text-black/60">{c.parent_note}</div>}</Card>))}</div>}
      </Async>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Farzandni tahrirlash' : 'Farzand qo‘shish'}>
        <form className="space-y-3" onSubmit={handleSubmit((v) => save.mutate(v))}>
          <div className="grid grid-cols-2 gap-2"><Field label="Ism" error={errors.first_name?.message as string}><input className="input" {...register('first_name')} /></Field><Field label="Familiya" error={errors.last_name?.message as string}><input className="input" {...register('last_name')} /></Field></div>
          <Field label="Tug‘ilgan sana" error={errors.birth_date?.message as string} hint="Yosh avtomatik hisoblanadi"><input type="date" className="input" max={new Date().toISOString().slice(0, 10)} {...register('birth_date')} /></Field>
          <Field label="Ta‘lim bosqichi"><select className="input" {...register('education_level')}><option value="">Tanlanmagan</option>{['Maktabgacha', '1–4-sinf', '5–9-sinf', '10–11-sinf'].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Qiziqishlari" hint="Vergul bilan ajrating"><input className="input" {...register('interests')} /></Field>
          <Field label="Ota-onaning izohi"><textarea className="input" rows={2} {...register('parent_note')} /></Field>
          <Field label="Qo‘shimcha ma‘lumot (maxfiy)" hint="Faqat ariza qabul qilingandan keyin muassasaga ko‘rinadi"><textarea className="input" rows={2} {...register('extra_info')} /></Field>
          <Button type="submit" className="w-full" loading={save.isPending}>Saqlash</Button>
        </form>
      </Modal>
      <Confirm open={!!delId} onClose={() => setDelId(null)} onYes={() => rm.mutate(delId!)} loading={rm.isPending} danger title="Farzandni o‘chirish" text="Farzand profili o‘chiriladi. Faol arizalari bo‘lsa, o‘chirib bo‘lmaydi." />
    </>
  );
}

/* ---------- Arizalar ---------- */
export function ApplicationsList() {
  const [status, setStatus] = useState(''); const [type, setType] = useState(''); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['my-apps', status, type, page], queryFn: () => get('/applications/mine', { status, type, page, page_size: 10 }) });
  return (
    <>
      <PageTitle title="Mening arizalarim" action={<Link href="/parent/search" className="btn btn-primary"><Plus size={18} />Yangi ariza</Link>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="input !w-auto" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">Barcha turlar</option><option value="kindergarten">Bog‘cha</option><option value="tutor">Repetitor</option></select>
        <select className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Barcha holatlar</option>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      </div>
      <Async q={q} empty={<Empty title="Arizalar yo‘q" text="Muassasani tanlab birinchi arizangizni yuboring." action={<Link href="/parent/search" className="btn btn-primary">Qidirish</Link>} />}>
        {(d) => (<><div className="space-y-2">{d.items.map((a: any) => (
          <Link key={a.id} href={`/parent/applications/${a.id}`}><Card className="flex flex-wrap items-center justify-between gap-2 !p-3 hover:shadow-pop transition"><div className="min-w-0"><div className="truncate font-bold text-primary">{a.provider_name}</div><div className="text-sm text-black/55">{a.child_name} · {a.type === 'kindergarten' ? (a.group_name || 'Bog‘cha') : (a.subject || 'Dars')}</div><div className="text-xs text-black/40">{a.number} · {dmy(a.created_at)}</div></div><StatusBadge status={a.status} /></Card></Link>))}</div>
          <Pagination page={page} pageSize={10} total={d.total} onChange={setPage} /></>)}
      </Async>
    </>
  );
}

const STEPS = ['SUBMITTED', 'UNDER_REVIEW', 'INTERVIEW_SCHEDULED', 'ACCEPTED'];

export function ApplicationDetail({ id }: { id: string }) {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['my-app', id], queryFn: () => get(`/applications/mine/${id}`) });
  const [cancel, setCancel] = useState(false); const [reply, setReply] = useState('');
  const refresh = () => { qc.invalidateQueries({ queryKey: ['my-app', id] }); qc.invalidateQueries({ queryKey: ['my-apps'] }); };
  const cn = useMutation({ mutationFn: () => post(`/applications/mine/${id}/cancel`, {}), onSuccess: () => { toast.ok('Ariza bekor qilindi'); setCancel(false); refresh(); }, onError: (e) => toast.err(errMsg(e)) });
  const rp = useMutation({ mutationFn: () => post(`/applications/mine/${id}/respond`, { note: reply }), onSuccess: () => { toast.ok('Javob yuborildi'); setReply(''); refresh(); }, onError: (e) => toast.err(errMsg(e)) });
  return (
    <Async q={q} rows={3}>
      {(a) => {
        const idx = STEPS.indexOf(a.status === 'MORE_INFO_REQUIRED' ? 'UNDER_REVIEW' : a.status);
        const rejected = a.status === 'REJECTED' || a.status === 'CANCELLED';
        return (
          <div className="mx-auto max-w-3xl space-y-4">
            <PageTitle title={a.provider_name} sub={`${a.number} · ${dmyHm(a.created_at)}`} action={<StatusBadge status={a.status} />} />
            {!rejected && (
              <Card><div className="flex items-center">{STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none"><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${i <= idx ? 'bg-primary text-white' : 'bg-black/10 text-black/40'}`}>{i + 1}</div>{i < STEPS.length - 1 && <div className={`h-1 flex-1 ${i < idx ? 'bg-primary' : 'bg-black/10'}`} />}</div>))}</div>
                <div className="mt-2 flex justify-between text-[11px] text-black/50">{STEPS.map((s) => <span key={s} className="w-1/4 first:text-left last:text-right text-center">{APP_STATUS[s].label}</span>)}</div></Card>
            )}
            <Card><dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-black/50">Farzand</dt><dd className="font-semibold">{a.child_name}</dd></div>
              <div><dt className="text-black/50">Tur</dt><dd className="font-semibold">{a.type === 'kindergarten' ? `Bog‘cha · ${a.group_name || ''}` : `Repetitor · ${a.subject || ''}`}</dd></div>
              {a.desired_start_date && <div><dt className="text-black/50">Boshlanish sanasi</dt><dd className="font-semibold">{dmy(a.desired_start_date)}</dd></div>}
              {a.desired_slot_start && <div><dt className="text-black/50">Dars vaqti</dt><dd className="font-semibold">{dmyHm(a.desired_slot_start)} ({a.duration_minutes} daq.)</dd></div>}
              {a.interview_at && <div><dt className="text-black/50">Suhbat</dt><dd className="font-semibold text-purple-700">{dmyHm(a.interview_at)}</dd></div>}
              {a.parent_note && <div className="sm:col-span-2"><dt className="text-black/50">Izohingiz</dt><dd>{a.parent_note}</dd></div>}
              {a.provider_note && <div className="sm:col-span-2 rounded-xl bg-sun-light p-3"><dt className="text-black/50">Muassasa izohi</dt><dd className="font-medium">{a.provider_note}</dd></div>}</dl></Card>
            {a.status === 'MORE_INFO_REQUIRED' && <Card><h3 className="mb-2 font-bold text-primary">Qo‘shimcha ma‘lumot yuboring</h3><textarea className="input" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} /><Button className="mt-2" disabled={!reply.trim()} loading={rp.isPending} onClick={() => rp.mutate()}>Yuborish</Button></Card>}
            <ContractPanel applicationId={id} status={a.status} role="parent" base="/parent" />
            <Card><h3 className="mb-3 font-bold text-primary">Holatlar tarixi</h3><ol className="space-y-3 border-l-2 border-primary/20 pl-4">{a.history.map((h: any, i: number) => (
              <li key={i} className="relative"><span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-primary" /><div className="flex flex-wrap items-center gap-2"><StatusBadge status={h.to_status} /><span className="text-xs text-black/45">{dmyHm(h.created_at)}</span></div>{h.note && <p className="mt-1 text-sm text-black/65">{h.note}</p>}</li>))}</ol></Card>
            <div className="flex flex-wrap gap-2">
              <Link href={`/parent/messages`} className="btn btn-outline"><MessageSquare size={16} />Xabarlar</Link>
              {['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'INTERVIEW_SCHEDULED', 'ACCEPTED'].includes(a.status) && <Button variant="danger" onClick={() => setCancel(true)}>Arizani bekor qilish</Button>}
              {a.status === 'ACCEPTED' && <Link className="btn btn-secondary" href={`/parent/reviews?provider=${a.provider_id}`}>Sharh qoldirish</Link>}
            </div>
            <Confirm open={cancel} onClose={() => setCancel(false)} onYes={() => cn.mutate()} loading={cn.isPending} danger title="Arizani bekor qilish" text="Ariza bekor qilinadi. Qabul qilingan bo‘lsa, joy/vaqt bo‘shatiladi." />
          </div>
        );
      }}
    </Async>
  );
}

/* ---------- Saqlanganlar ---------- */
export function Saved() {
  const q = useQuery({ queryKey: ['favorites'], queryFn: () => get('/favorites') });
  return (<><PageTitle title="Saqlanganlar" /><Async q={q} empty={<Empty title="Saqlangan muassasalar yo‘q" text="Yurak belgisini bosib muassasalarni saqlang." action={<Link href="/parent/search" className="btn btn-primary">Qidirish</Link>} />}>
    {(list) => <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((p: any) => <ProviderCard key={p.id} p={p} saved />)}</div>}</Async></>);
}

/* ---------- Sharhlarim ---------- */
export function MyReviews() {
  const qc = useQueryClient(); const toast = useToast();
  const mine = useQuery({ queryKey: ['my-reviews'], queryFn: () => get('/reviews/mine') });
  const elig = useQuery({ queryKey: ['eligible'], queryFn: () => get('/reviews/eligible') });
  const [form, setForm] = useState<any>(null);
  const save = useMutation({ mutationFn: () => post('/reviews', { provider_id: form.provider_id, rating: form.rating, comment: form.comment || null }), onSuccess: () => { toast.ok('Sharh qoldirildi'); setForm(null); qc.invalidateQueries({ queryKey: ['my-reviews'] }); qc.invalidateQueries({ queryKey: ['eligible'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const rm = useMutation({ mutationFn: (id: string) => del(`/reviews/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-reviews'] }); qc.invalidateQueries({ queryKey: ['eligible'] }); } });
  return (
    <>
      <PageTitle title="Sharhlarim" />
      <Async q={elig} rows={1}>{(list) => list.length > 0 && (<Card className="mb-4"><h2 className="mb-2 font-bold text-primary">Sharh qoldirish mumkin</h2><div className="flex flex-wrap gap-2">{list.map((e: any) => <Button key={e.provider_id} variant="outline" onClick={() => setForm({ provider_id: e.provider_id, name: e.name, rating: 5, comment: '' })}>{e.name}</Button>)}</div></Card>)}</Async>
      <Async q={mine} empty={<Empty title="Sharhlar yo‘q" text="Sharh faqat arizangiz qabul qilingan muassasa uchun qoldiriladi." />}>
        {(list) => <div className="space-y-2">{list.map((r: any) => (<Card key={r.id} className="!p-3"><div className="flex items-center justify-between"><b>{r.provider_name}</b><Stars value={r.rating} /></div>{r.comment && <p className="mt-1 text-sm">{r.comment}</p>}<div className="mt-1 flex items-center justify-between text-xs text-black/45"><span>{dmy(r.created_at)}{r.status !== 'published' && ' · moderatsiyada'}</span><button onClick={() => rm.mutate(r.id)} className="text-red-600">O‘chirish</button></div>{r.response && <div className="mt-2 rounded-lg bg-primary-50 p-2 text-sm"><b>Javob:</b> {r.response}</div>}</Card>))}</div>}
      </Async>
      <Modal open={!!form} onClose={() => setForm(null)} title={`Sharh: ${form?.name || ''}`}>
        <div className="space-y-3"><div className="flex justify-center gap-1">{[1, 2, 3, 4, 5].map((i) => <button key={i} onClick={() => setForm({ ...form, rating: i })} aria-label={`${i} yulduz`} className={`text-3xl ${i <= (form?.rating || 0) ? 'text-sun' : 'text-black/20'}`}>★</button>)}</div>
          <textarea className="input" rows={4} maxLength={2000} placeholder="Fikringizni yozing..." value={form?.comment || ''} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>Yuborish</Button></div>
      </Modal>
    </>
  );
}
