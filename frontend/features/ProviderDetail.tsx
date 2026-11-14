'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Flag, Heart, MapPin, MessageSquare, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Async, Badge, Button, Card, Empty, Field, Modal, Pagination, Skeleton, Stars, useToast, ErrorBox } from '@/components/ui/ui';
import { useMe } from '@/hooks/useAuth';
import { get, post, put } from '@/lib/api';
import { WEEKDAYS, dmy, errMsg, uzs } from '@/lib/format';
import LeafletMapLazy from './MapLazy';

function slotsFor(schedule: any[], dateStr: string, minutes: number) {
  if (!dateStr) return [];
  const wd = ((new Date(dateStr + 'T12:00:00').getDay() + 6) % 7) + 1;
  const out: string[] = [];
  schedule.filter((w) => w.weekday === wd).forEach((w) => {
    const [sh, sm] = w.start.split(':').map(Number); const [eh, em] = w.end.split(':').map(Number);
    for (let t = sh * 60 + sm; t + minutes <= eh * 60 + em; t += 30) out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  });
  return out;
}

function ApplyModal({ p, open, onClose }: { p: any; open: boolean; onClose: () => void }) {
  const kg = p.type === 'kindergarten';
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const children = useQuery({ queryKey: ['children'], queryFn: () => get('/children'), enabled: open });
  const [f, setF] = useState<any>({ note: '' });
  const svc = (p.services || []).find((s: any) => s.id === f.service_id);
  const m = useMutation({
    mutationFn: () => kg
      ? post('/applications/kindergarten', { child_id: f.child_id, provider_id: p.id, group_id: f.group_id, parent_note: f.note || null, desired_start_date: f.start || null })
      : post('/applications/tutor', { child_id: f.child_id, provider_id: p.id, service_id: f.service_id, grade: f.grade || null, parent_note: f.note || null, desired_slot_start: f.date && f.time ? `${f.date}T${f.time}:00+05:00` : null }),
    onSuccess: (a) => { toast.ok('Ariza yuborildi'); qc.invalidateQueries({ queryKey: ['parent-dashboard'] }); onClose(); router.push(`/parent/applications/${a.id}`); },
    onError: (e) => toast.err(errMsg(e)),
  });
  const slots = !kg && svc ? slotsFor(p.schedule || [], f.date, svc.duration_minutes) : [];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const ready = f.child_id && (kg ? f.group_id : f.service_id && f.date && f.time);
  return (
    <Modal open={open} onClose={onClose} title={kg ? 'Bog‘chaga ariza yuborish' : 'Dars so‘rovi yuborish'}>
      {children.isLoading ? <Skeleton className="h-24" /> : children.data?.length === 0 ? (
        <Empty title="Avval farzand qo‘shing" text="Ariza yuborish uchun kamida bitta farzand profili kerak." action={<Link href="/parent/children" className="btn btn-primary">Farzand qo‘shish</Link>} />
      ) : (
        <div className="space-y-3">
          <Field label="Farzand"><select className="input" value={f.child_id || ''} onChange={(e) => setF({ ...f, child_id: e.target.value })}><option value="">Tanlang</option>{children.data?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.age_text})</option>)}</select></Field>
          {kg ? (
            <>
              <Field label="Guruh"><select className="input" value={f.group_id || ''} onChange={(e) => setF({ ...f, group_id: e.target.value })}><option value="">Tanlang</option>{p.groups?.map((g: any) => <option key={g.id} value={g.id}>{g.name} ({g.min_age}–{g.max_age} yosh) — {g.free_places} ta bo‘sh joy</option>)}</select></Field>
              <Field label="Kerakli boshlanish sanasi"><input className="input" type="date" min={tomorrow} value={f.start || ''} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
            </>
          ) : (
            <>
              <Field label="Xizmat"><select className="input" value={f.service_id || ''} onChange={(e) => setF({ ...f, service_id: e.target.value, time: '' })}><option value="">Tanlang</option>{p.services?.map((s: any) => <option key={s.id} value={s.id}>{s.subject} · {s.duration_minutes} daq. · {s.mode === 'online' ? 'Online' : 'Offline'} · {uzs(s.price)}</option>)}</select></Field>
              <Field label="Sinf"><input className="input" value={f.grade || ''} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="Masalan, 6" /></Field>
              <Field label="Sana"><input className="input" type="date" min={tomorrow} value={f.date || ''} onChange={(e) => setF({ ...f, date: e.target.value, time: '' })} /></Field>
              {svc && f.date && <Field label="Vaqt (Toshkent vaqti)" hint={slots.length === 0 ? 'Bu kuni repetitorning bo‘sh vaqti yo‘q' : undefined}><select className="input" value={f.time || ''} onChange={(e) => setF({ ...f, time: e.target.value })}><option value="">Tanlang</option>{slots.map((s) => <option key={s}>{s}</option>)}</select></Field>}
            </>
          )}
          <Field label="Izoh"><textarea className="input" rows={3} maxLength={1500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <Button className="w-full" disabled={!ready} loading={m.isPending} onClick={() => m.mutate()}>Yuborish</Button>
        </div>
      )}
    </Modal>
  );
}

function Reviews({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['reviews', id, page], queryFn: () => get(`/providers/${id}/reviews`, { page, page_size: 5 }) });
  return (
    <Async q={q} rows={2} empty={<p className="text-sm text-black/55">Hali sharhlar yo‘q.</p>}>
      {(d) => (<><div className="space-y-3">{d.items.map((r: any) => (
        <div key={r.id} className="rounded-xl bg-primary-50 p-3"><div className="flex items-center justify-between"><b className="text-sm">{r.author}</b><Stars value={r.rating} size={14} /></div>{r.comment && <p className="mt-1 text-sm">{r.comment}</p>}<div className="mt-1 text-xs text-black/40">{dmy(r.created_at)}</div>
          {r.response && <div className="mt-2 rounded-lg bg-white p-2 text-sm"><b className="text-primary">Muassasa javobi:</b> {r.response}</div>}</div>))}</div>
        <Pagination page={page} pageSize={5} total={d.total} onChange={setPage} /></>)}
    </Async>
  );
}

export default function ProviderDetail({ id, type }: { id: string; type: 'kindergarten' | 'tutor' }) {
  const kg = type === 'kindergarten';
  const me = useMe();
  const router = useRouter();
  const toast = useToast();
  const [apply, setApply] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState('');
  const q = useQuery({ queryKey: ['provider', type, id], queryFn: () => get(`/${kg ? 'kindergartens' : 'tutors'}/${id}`) });
  const isParent = me.data?.role === 'parent';
  const chat = useMutation({ mutationFn: () => post('/conversations', { provider_id: id }), onSuccess: (c) => router.push(`/parent/messages/${c.id}`), onError: (e) => toast.err(errMsg(e)) });
  const fav = useMutation({ mutationFn: () => put(`/favorites/${id}`), onSuccess: () => toast.ok('Saqlandi'), onError: (e) => toast.err(errMsg(e)) });
  const rep = useMutation({ mutationFn: () => post('/reports', { target_type: 'provider', target_id: id, reason: reason || 'Boshqa' }), onSuccess: () => { toast.ok('Shikoyat yuborildi'); setReport(false); }, onError: (e) => toast.err(errMsg(e)) });
  const need = (fn: () => void) => () => { if (!me.data) router.push(`/login?next=${encodeURIComponent(location.pathname)}`); else if (!isParent) toast.err('Bu amal faqat ota-ona uchun'); else fn(); };
  if (q.isLoading) return <div className="space-y-3"><Skeleton className="h-48" /><Skeleton className="h-32" /></div>;
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const p = q.data;
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-primary-100 to-peach-light md:h-56">{p.cover_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-6xl">{kg ? '🏡' : '📚'}</div>}</div>
        <div className="p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-primary">{p.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm"><Stars value={p.rating_avg} />{p.rating_count ? `${p.rating_avg.toFixed(1)} (${p.rating_count} sharh)` : 'Hali baholanmagan'}{p.verified && <Badge cls="bg-primary-100 text-primary"><BadgeCheck size={14} className="mr-1" />Tasdiqlangan</Badge>}</div>
              <div className="mt-2 flex items-center gap-1 text-sm text-black/60"><MapPin size={15} />{[p.address, p.district, p.region].filter(Boolean).join(', ')}</div>
              {p.phone && <a href={`tel:${p.phone}`} className="mt-1 flex items-center gap-1 text-sm text-primary"><Phone size={15} />{p.phone}</a>}
            </div>
            <div className="text-right"><div className="text-2xl font-extrabold text-primary">{uzs(kg ? p.monthly_price : p.hourly_price)}</div><div className="text-xs text-black/50">{kg ? 'oyiga' : 'bir dars uchun'}</div></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={need(() => setApply(true))}>{kg ? 'Ariza yuborish' : 'Dars so‘rash'}</Button>
            <Button variant="outline" onClick={need(() => chat.mutate())} loading={chat.isPending}><MessageSquare size={16} />Xabar yozish</Button>
            <Button variant="outline" onClick={need(() => fav.mutate())}><Heart size={16} />Saqlash</Button>
            {me.data && <Button variant="ghost" onClick={() => setReport(true)}><Flag size={16} />Shikoyat</Button>}
          </div>
        </div>
      </div>

      {(p.description || p.short_description) && <Card><h2 className="mb-2 font-bold text-primary">Tavsif</h2><p className="whitespace-pre-line text-sm leading-relaxed">{p.description || p.short_description}</p></Card>}

      {kg ? (
        <>
          <Card>
            <h2 className="mb-3 font-bold text-primary">Guruhlar va bo‘sh joylar</h2>
            {p.groups?.length ? <div className="grid gap-2 sm:grid-cols-2">{p.groups.map((g: any) => (
              <div key={g.id} className="rounded-xl bg-primary-50 p-3"><div className="font-bold">{g.name}</div><div className="text-sm text-black/60">{g.min_age}–{g.max_age} yosh · {g.meal_type || '—'}</div>
                <div className="mt-1 flex items-center justify-between"><Badge cls={g.free_places > 0 ? 'bg-primary-100 text-primary' : 'bg-red-50 text-red-700'}>{g.free_places > 0 ? `${g.free_places} ta bo‘sh joy` : 'To‘lgan'}</Badge><span className="text-sm font-bold">{uzs(g.monthly_price)}</span></div></div>))}</div> : <p className="text-sm text-black/55">Guruhlar kiritilmagan.</p>}
          </Card>
          <Card><h2 className="mb-2 font-bold text-primary">Ma‘lumotlar</h2><dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-black/50">Turi</dt><dd className="font-semibold">{p.ownership === 'state' ? 'Davlat' : p.ownership === 'private' ? 'Xususiy' : '—'}</dd></div>
            <div><dt className="text-black/50">Ish vaqti</dt><dd className="font-semibold">{p.work_open ? `${p.work_open}–${p.work_close}` : '—'} {p.work_days?.length ? `(${p.work_days.map((d: number) => WEEKDAYS[d].slice(0, 3)).join(', ')})` : ''}</dd></div>
            <div><dt className="text-black/50">Ovqatlanish</dt><dd className="font-semibold">{p.meal_type || '—'}</dd></div>
            <div><dt className="text-black/50">Qulayliklar</dt><dd className="font-semibold">{(p.amenities || []).join(', ') || '—'}</dd></div></dl></Card>
        </>
      ) : (
        <>
          <Card><h2 className="mb-3 font-bold text-primary">Xizmatlar</h2>
            {p.services?.length ? <div className="grid gap-2 sm:grid-cols-2">{p.services.map((s: any) => (
              <div key={s.id} className="rounded-xl bg-primary-50 p-3"><div className="font-bold">{s.subject}</div><div className="text-sm text-black/60">{s.education_level} · {s.duration_minutes} daq. · {s.format === 'group' ? 'Guruh' : 'Individual'} · {s.mode === 'online' ? 'Online' : 'Offline'}</div><div className="mt-1 font-bold text-primary">{uzs(s.price)}</div></div>))}</div> : <p className="text-sm text-black/55">Xizmatlar kiritilmagan.</p>}</Card>
          <Card><h2 className="mb-2 font-bold text-primary">Repetitor haqida</h2><dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-black/50">Mutaxassislik</dt><dd className="font-semibold">{p.specialty || '—'}</dd></div><div><dt className="text-black/50">Tajriba</dt><dd className="font-semibold">{p.experience_years != null ? `${p.experience_years} yil` : '—'}</dd></div>
            <div><dt className="text-black/50">Ta‘lim</dt><dd className="font-semibold">{[p.education_degree, p.education_institution].filter(Boolean).join(', ') || '—'}</dd></div><div><dt className="text-black/50">Hudud</dt><dd className="font-semibold">{p.service_area || '—'}</dd></div></dl>
            {p.teaching_style && <p className="mt-3 text-sm">{p.teaching_style}</p>}
            {p.intro_video_url && <a className="mt-2 inline-block text-sm font-semibold text-primary underline" href={p.intro_video_url} target="_blank" rel="noopener noreferrer">Tanishtiruv videosi</a>}</Card>
          <Card><h2 className="mb-2 font-bold text-primary">Bo‘sh vaqtlar</h2>{p.schedule?.length ? <div className="flex flex-wrap gap-2">{p.schedule.map((s: any, i: number) => <Badge key={i}>{WEEKDAYS[s.weekday]}: {s.start}–{s.end}</Badge>)}</div> : <p className="text-sm text-black/55">Jadval kiritilmagan.</p>}</Card>
        </>
      )}
      {p.lat != null && <Card><h2 className="mb-2 font-bold text-primary">Joylashuv</h2><LeafletMapLazy points={[p]} height="260px" /></Card>}
      <Card><h2 className="mb-3 font-bold text-primary">Sharhlar</h2><Reviews id={id} /></Card>

      {apply && <ApplyModal p={p} open={apply} onClose={() => setApply(false)} />}
      <Modal open={report} onClose={() => setReport(false)} title="Shikoyat yuborish"><Field label="Sabab"><select className="input" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Tanlang</option>{['Soxta ma‘lumot', 'Aldamchilik', 'Nomaqbul kontent', 'Boshqa'].map((r) => <option key={r}>{r}</option>)}</select></Field><Button className="mt-3 w-full" disabled={!reason} loading={rep.isPending} onClick={() => rep.mutate()}>Yuborish</Button></Modal>
    </div>
  );
}
