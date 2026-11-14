'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Async, Badge, Button, Card, Empty, Field, Modal, PageTitle, Pagination, StatCard, StatusBadge, Stars, Tabs, VerifyBadge, useToast, Skeleton } from '@/components/ui/ui';
import { useMe } from '@/hooks/useAuth';
import { get, post, put, uploadFile } from '@/lib/api';
import { APP_STATUS, WEEKDAYS, dmy, dmyHm, errMsg, uzs } from '@/lib/format';

import { ContractPanel } from './Contracts';
export function useMyProvider() { return useQuery({ queryKey: ['my-provider'], queryFn: () => get('/me/provider') }); }

export function VerificationBanner() {
  const q = useMyProvider();
  const p = q.data;
  if (!p || p.verification_status === 'approved') return null;
  const msg: Record<string, string> = {
    pending: 'Profilingiz hali tasdiqlanmagan: ma‘lumotlarni to‘ldiring, hujjat yuklang va «Tekshiruvga yuborish» tugmasini bosing. Tasdiqlanmaguncha qidiruvda ko‘rinmaysiz.',
    under_review: 'Profilingiz administrator tomonidan tekshirilmoqda.',
    rejected: `Profil rad etilgan: ${p.verification_note || ''}. Ma‘lumotlarni tuzatib, qayta yuboring.`,
    suspended: `Profil to‘xtatilgan: ${p.verification_note || ''}`,
  };
  return <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-sun-light px-4 py-3 text-sm text-amber-900"><VerifyBadge status={p.verification_status} /><span className="flex-1">{msg[p.verification_status]}</span></div>;
}

/* ---------- Arizalar (ikkala rol) ---------- */
export function ProviderApplications({ base, title = 'Arizalar', onlyStatus }: { base: string; title?: string; onlyStatus?: string }) {
  const [status, setStatus] = useState(onlyStatus || ''); const [text, setText] = useState(''); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['prov-apps', status, text, page], queryFn: () => get('/me/provider/applications', { status, q: text, page, page_size: 12 }) });
  return (
    <>
      <PageTitle title={title} />
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="input !w-full sm:!w-64" placeholder="Qidirish: ism yoki raqam" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} />
        <select className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Barcha holatlar</option>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      </div>
      <Async q={q} empty={<Empty title="Arizalar yo‘q" text="Yangi arizalar shu yerda paydo bo‘ladi." />}>
        {(d) => (<>
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card md:block"><table className="w-full text-sm"><thead className="bg-primary-50 text-left text-xs text-primary"><tr><th className="p-3">Raqam</th><th>Bola</th><th>Yosh</th><th>Tur</th><th>Sana</th><th>Holat</th><th /></tr></thead>
            <tbody>{d.items.map((a: any) => (<tr key={a.id} className="border-t border-black/5"><td className="p-3 font-mono text-xs">{a.number}</td><td className="font-semibold">{a.child_name}</td><td>{a.child_age}</td><td>{a.type === 'kindergarten' ? a.group_name : a.subject}</td><td>{dmy(a.created_at)}</td><td><StatusBadge status={a.status} /></td><td><Link className="btn btn-outline !min-h-[36px] !py-1" href={`${base}/applications/${a.id}`}>Ko‘rish</Link></td></tr>))}</tbody></table></div>
          <div className="space-y-2 md:hidden">{d.items.map((a: any) => (<Link key={a.id} href={`${base}/applications/${a.id}`}><Card className="!p-3"><div className="flex items-center justify-between gap-2"><b>{a.child_name}</b><StatusBadge status={a.status} /></div><div className="text-sm text-black/55">{a.child_age} yosh · {a.type === 'kindergarten' ? a.group_name : a.subject}</div><div className="text-xs text-black/40">{a.number} · {dmy(a.created_at)}</div></Card></Link>))}</div>
          <Pagination page={page} pageSize={12} total={d.total} onChange={setPage} /></>)}
      </Async>
    </>
  );
}

export function ProviderApplicationDetail({ id }: { id: string }) {
  const me = useMe();
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['prov-app', id], queryFn: () => get(`/me/provider/applications/${id}`) });
  const [act, setAct] = useState<string | null>(null); const [note, setNote] = useState(''); const [when, setWhen] = useState('');
  const m = useMutation({
    mutationFn: () => post(`/me/provider/applications/${id}/status`, { status: act, note: note || null, interview_at: act === 'INTERVIEW_SCHEDULED' && when ? `${when}:00+05:00` : null }),
    onSuccess: () => { toast.ok('Holat yangilandi'); setAct(null); setNote(''); qc.invalidateQueries({ queryKey: ['prov-app', id] }); qc.invalidateQueries({ queryKey: ['prov-apps'] }); qc.invalidateQueries({ queryKey: ['prov-dashboard'] }); },
    onError: (e) => toast.err(errMsg(e)),
  });
  const actions: Record<string, { k: string; label: string; v: string }[]> = {
    SUBMITTED: [{ k: 'UNDER_REVIEW', label: 'Ko‘rib chiqish', v: 'outline' }, { k: 'MORE_INFO_REQUIRED', label: 'Ma‘lumot so‘rash', v: 'outline' }, { k: 'INTERVIEW_SCHEDULED', label: 'Suhbat belgilash', v: 'outline' }, { k: 'ACCEPTED', label: 'Qabul qilish', v: 'primary' }, { k: 'REJECTED', label: 'Rad etish', v: 'danger' }],
    UNDER_REVIEW: [{ k: 'MORE_INFO_REQUIRED', label: 'Ma‘lumot so‘rash', v: 'outline' }, { k: 'INTERVIEW_SCHEDULED', label: 'Suhbat belgilash', v: 'outline' }, { k: 'ACCEPTED', label: 'Qabul qilish', v: 'primary' }, { k: 'REJECTED', label: 'Rad etish', v: 'danger' }],
    MORE_INFO_REQUIRED: [{ k: 'REJECTED', label: 'Rad etish', v: 'danger' }],
    INTERVIEW_SCHEDULED: [{ k: 'ACCEPTED', label: 'Qabul qilish', v: 'primary' }, { k: 'REJECTED', label: 'Rad etish', v: 'danger' }],
  };
  return (
    <Async q={q} rows={3}>
      {(a) => (
        <div className="mx-auto max-w-3xl space-y-4">
          <PageTitle title={`${a.child.first_name} ${a.child.last_name}`} sub={`${a.number} · ${dmyHm(a.created_at)}`} action={<StatusBadge status={a.status} />} />
          <Card><h3 className="mb-2 font-bold text-primary">Ariza</h3><dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-black/50">Tur</dt><dd className="font-semibold">{a.type === 'kindergarten' ? `Guruh: ${a.group_name}` : `${a.subject} · ${a.duration_minutes} daq. · ${a.lesson_mode === 'online' ? 'Online' : 'Offline'}`}</dd></div>
            {a.desired_start_date && <div><dt className="text-black/50">Boshlanish</dt><dd className="font-semibold">{dmy(a.desired_start_date)}</dd></div>}
            {a.desired_slot_start && <div><dt className="text-black/50">Dars vaqti</dt><dd className="font-semibold">{dmyHm(a.desired_slot_start)}</dd></div>}
            {a.interview_at && <div><dt className="text-black/50">Suhbat</dt><dd className="font-semibold">{dmyHm(a.interview_at)}</dd></div>}
            {a.parent_note && <div className="sm:col-span-2"><dt className="text-black/50">Ota-ona izohi</dt><dd className="whitespace-pre-line">{a.parent_note}</dd></div>}</dl></Card>
          <Card><h3 className="mb-2 font-bold text-primary">Bola</h3><dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-black/50">Yosh</dt><dd className="font-semibold">{a.child.age} ({dmy(a.child.birth_date)})</dd></div><div><dt className="text-black/50">Bosqich</dt><dd className="font-semibold">{a.child.education_level || '—'}</dd></div>
            <div><dt className="text-black/50">Qiziqishlar</dt><dd>{(a.child.interests || []).join(', ') || '—'}</dd></div><div><dt className="text-black/50">Ota-ona izohi</dt><dd>{a.child.parent_note || '—'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-black/50">Qo‘shimcha ma‘lumot</dt><dd>{a.child.extra_info ?? <i className="text-black/40">Ariza qabul qilingandan keyin ko‘rinadi</i>}</dd></div></dl></Card>
          <Card><h3 className="mb-2 font-bold text-primary">Ota-ona</h3><div className="text-sm"><b>{a.parent.full_name}</b> · {a.parent.phone || <i className="text-black/40">Telefon suhbat belgilangach / qabul qilingach ko‘rinadi</i>}</div></Card>
          <ContractPanel applicationId={id} status={a.status} role="provider" base={me.data?.role === 'tutor' ? '/tutor' : '/kindergarten'} />
          {actions[a.status] && <Card><h3 className="mb-2 font-bold text-primary">Amallar</h3><div className="flex flex-wrap gap-2">{actions[a.status].map((x) => <Button key={x.k} variant={x.v} onClick={() => { setAct(x.k); setNote(''); setWhen(''); }}>{x.label}</Button>)}</div></Card>}
          <Card><h3 className="mb-3 font-bold text-primary">Holatlar tarixi</h3><ol className="space-y-3 border-l-2 border-primary/20 pl-4">{a.history.map((h: any, i: number) => (<li key={i} className="relative"><span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-primary" /><div className="flex items-center gap-2"><StatusBadge status={h.to_status} /><span className="text-xs text-black/45">{dmyHm(h.created_at)}</span></div>{h.note && <p className="mt-1 text-sm text-black/65">{h.note}</p>}</li>))}</ol></Card>
          <Modal open={!!act} onClose={() => setAct(null)} title={act ? APP_STATUS[act]?.label : ''}>
            <div className="space-y-3">
              {act === 'INTERVIEW_SCHEDULED' && <Field label="Suhbat vaqti (Toshkent vaqti)"><input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>}
              <Field label={act === 'REJECTED' || act === 'MORE_INFO_REQUIRED' ? 'Izoh (majburiy)' : 'Izoh (ixtiyoriy)'}><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <Button className="w-full" variant={act === 'REJECTED' ? 'danger' : 'primary'} loading={m.isPending} disabled={(act === 'REJECTED' || act === 'MORE_INFO_REQUIRED') && !note.trim() || (act === 'INTERVIEW_SCHEDULED' && !when)} onClick={() => m.mutate()}>Tasdiqlash</Button>
            </div>
          </Modal>
        </div>
      )}
    </Async>
  );
}

/* ---------- Profil (ikkala rol) ---------- */
function ImageField({ label, value, onChange }: { label: string; value?: string | null; onChange: (u: string) => void }) {
  const toast = useToast(); const [busy, setBusy] = useState(false);
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {value ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary-50 text-primary"><Upload size={18} /></div>}
        <label className="btn btn-outline cursor-pointer">{busy ? 'Yuklanmoqda...' : 'Rasm tanlash'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { const r = await uploadFile(f, 'public-image'); onChange(r.url); } catch (er) { toast.err(errMsg(er)); } setBusy(false); }} /></label>
      </div>
    </Field>
  );
}

export function ProviderProfile({ type }: { type: 'kindergarten' | 'tutor' }) {
  const kg = type === 'kindergarten';
  const qc = useQueryClient(); const toast = useToast();
  const q = useMyProvider();
  const regions = useQuery({ queryKey: ['regions'], queryFn: () => get('/regions'), staleTime: Infinity });
  const [f, setF] = useState<any>(null);
  const p = q.data; const cur = f ?? p;
  const districts = useQuery({ queryKey: ['districts', cur?.region_id], queryFn: () => get(`/regions/${cur.region_id}/districts`), enabled: !!cur?.region_id });
  const set = (k: string, v: any) => setF({ ...(f ?? p), [k]: v });
  const save = useMutation({
    mutationFn: () => {
      const keys = ['name', 'logo_url', 'cover_url', 'short_description', 'description', 'phone', 'email', 'region_id', 'district_id', 'address', 'lat', 'lng', 'work_open', 'work_close', ...(kg ? ['ownership', 'meal_type', 'monthly_price', 'min_age', 'max_age'] : ['specialty', 'education_degree', 'education_institution', 'experience_years', 'teaching_style', 'intro_video_url', 'lesson_mode', 'service_area', 'hourly_price'])];
      const body: any = {}; keys.forEach((k) => { const v = cur[k]; if (v !== undefined && v !== '' && v !== null) body[k] = ['region_id', 'district_id', 'monthly_price', 'min_age', 'max_age', 'experience_years', 'hourly_price', 'lat', 'lng'].includes(k) ? Number(v) : v; });
      return put('/me/provider', body);
    },
    onSuccess: () => { toast.ok('Saqlandi'); setF(null); qc.invalidateQueries({ queryKey: ['my-provider'] }); }, onError: (e) => toast.err(errMsg(e)),
  });
  const submit = useMutation({ mutationFn: () => post('/me/provider/submit-for-review'), onSuccess: () => { toast.ok('Tekshiruvga yuborildi'); qc.invalidateQueries({ queryKey: ['my-provider'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const [docType, setDocType] = useState('license'); const [busy, setBusy] = useState(false);
  const addDoc = async (file?: File) => {
    if (!file) return; setBusy(true);
    try { const up = await uploadFile(file, 'private'); await post('/me/provider/documents', { doc_type: docType, title: file.name, file_id: up.id }); toast.ok('Hujjat yuklandi'); qc.invalidateQueries({ queryKey: ['my-provider'] }); } catch (e) { toast.err(errMsg(e)); } setBusy(false);
  };
  const geo = () => navigator.geolocation?.getCurrentPosition((g) => setF({ ...(f ?? p), lat: +g.coords.latitude.toFixed(6), lng: +g.coords.longitude.toFixed(6) }), () => toast.err('Joylashuvga ruxsat berilmadi'));
  if (q.isLoading) return <Skeleton className="h-64" />;
  if (!cur) return null;
  const I = (k: string, label: string, props: any = {}) => <Field label={label}><input className="input" value={cur[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...props} /></Field>;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title={kg ? 'Muassasa profili' : 'Mening profilim'} action={<VerifyBadge status={p.verification_status} />} />
      <VerificationBanner />
      <Card className="space-y-3">
        <h2 className="font-bold text-primary">Asosiy ma‘lumotlar</h2>
        <div className="grid gap-3 sm:grid-cols-2"><ImageField label={kg ? 'Logo' : 'Profil rasmi'} value={cur.logo_url} onChange={(u) => set('logo_url', u)} /><ImageField label="Muqova rasmi" value={cur.cover_url} onChange={(u) => set('cover_url', u)} /></div>
        {I('name', kg ? 'Bog‘cha nomi' : 'Ism va familiya')}
        {I('short_description', 'Qisqacha tavsif', { maxLength: 300 })}
        <Field label="To‘liq tavsif"><textarea className="input" rows={4} value={cur.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">{I('phone', 'Telefon (+998...)')}{I('email', 'Email')}</div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-bold text-primary">Manzil</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Viloyat"><select className="input" value={cur.region_id ?? ''} onChange={(e) => setF({ ...(f ?? p), region_id: e.target.value, district_id: '' })}><option value="">Tanlang</option>{regions.data?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
          <Field label="Tuman"><select className="input" value={cur.district_id ?? ''} onChange={(e) => set('district_id', e.target.value)}><option value="">Tanlang</option>{districts.data?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
        </div>
        {I('address', 'Manzil')}
        <div className="grid grid-cols-2 gap-3">{I('lat', 'Kenglik (lat)', { type: 'number', step: 'any' })}{I('lng', 'Uzunlik (lng)', { type: 'number', step: 'any' })}</div>
        <Button variant="outline" onClick={geo}>Joriy joylashuvdan olish</Button>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-bold text-primary">{kg ? 'Bog‘cha ma‘lumotlari' : 'Kasbiy ma‘lumotlar'}</h2>
        {kg ? (<>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Turi"><select className="input" value={cur.ownership ?? ''} onChange={(e) => set('ownership', e.target.value)}><option value="">Tanlang</option><option value="state">Davlat</option><option value="private">Xususiy</option></select></Field>{I('meal_type', 'Ovqatlanish (masalan, 4 mahal)')}</div>
          <div className="grid gap-3 sm:grid-cols-3">{I('monthly_price', 'Oylik narx (so‘m)', { type: 'number' })}{I('min_age', 'Min yosh', { type: 'number' })}{I('max_age', 'Maks yosh', { type: 'number' })}</div>
          <div className="grid gap-3 sm:grid-cols-2">{I('work_open', 'Ish boshlanishi', { type: 'time' })}{I('work_close', 'Ish tugashi', { type: 'time' })}</div>
        </>) : (<>
          {I('specialty', 'Mutaxassislik')}
          <div className="grid gap-3 sm:grid-cols-2">{I('education_degree', 'Ta‘lim darajasi')}{I('education_institution', 'Ta‘lim muassasasi')}</div>
          <div className="grid gap-3 sm:grid-cols-3">{I('experience_years', 'Tajriba (yil)', { type: 'number' })}<Field label="Dars turi"><select className="input" value={cur.lesson_mode ?? ''} onChange={(e) => set('lesson_mode', e.target.value)}><option value="">Tanlang</option><option value="online">Online</option><option value="offline">Offline</option><option value="both">Ikkalasi</option></select></Field>{I('hourly_price', 'Dars narxi (so‘m)', { type: 'number' })}</div>
          {I('service_area', 'Xizmat hududi')}
          <Field label="Dars uslubi"><textarea className="input" rows={3} value={cur.teaching_style ?? ''} onChange={(e) => set('teaching_style', e.target.value)} /></Field>
          {I('intro_video_url', 'Tanishtiruv videosi havolasi (ixtiyoriy)')}
        </>)}
        <Button loading={save.isPending} onClick={() => save.mutate()} disabled={!f}>Saqlash</Button>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-bold text-primary">Hujjatlar (litsenziya, diplom, sertifikat)</h2>
        <p className="text-sm text-black/55">Hujjatlar maxfiy saqlanadi, faqat administrator ko‘radi. JPG, PNG yoki PDF, 8 MB gacha.</p>
        {p.documents?.map((d: any) => <div key={d.id} className="flex items-center justify-between rounded-xl bg-primary-50 p-2 text-sm"><span className="truncate">{d.doc_type}: {d.title}</span><span className="flex items-center gap-2"><Badge cls={d.status === 'approved' ? 'bg-primary-100 text-primary' : d.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-sun-light text-amber-800'}>{d.status === 'approved' ? 'Tasdiqlangan' : d.status === 'rejected' ? 'Rad etilgan' : 'Kutilmoqda'}</Badge></span></div>)}
        {p.documents?.some((d: any) => d.review_note) && <p className="text-sm text-red-700">{p.documents.filter((d: any) => d.review_note).map((d: any) => d.review_note).join('; ')}</p>}
        <div className="flex flex-wrap items-center gap-2"><select className="input !w-auto" value={docType} onChange={(e) => setDocType(e.target.value)}>{[['license', 'Litsenziya'], ['diploma', 'Diplom'], ['certificate', 'Sertifikat'], ['id', 'Shaxsiy hujjat'], ['other', 'Boshqa']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <label className="btn btn-outline cursor-pointer">{busy ? 'Yuklanmoqda...' : 'Hujjat yuklash'}<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={(e) => addDoc(e.target.files?.[0])} /></label></div>
        {['pending', 'rejected'].includes(p.verification_status) && <Button loading={submit.isPending} onClick={() => submit.mutate()}>Tekshiruvga yuborish</Button>}
      </Card>
    </div>
  );
}

/* ---------- Sharhlar ---------- */
export function ProviderReviews() {
  const qc = useQueryClient(); const toast = useToast(); const [page, setPage] = useState(1); const [sel, setSel] = useState<any>(null); const [text, setText] = useState('');
  const q = useQuery({ queryKey: ['prov-reviews', page], queryFn: () => get('/me/provider/reviews', { page, page_size: 10 }) });
  const m = useMutation({ mutationFn: () => put(`/me/provider/reviews/${sel.id}/response`, { text }), onSuccess: () => { toast.ok('Javob saqlandi'); setSel(null); qc.invalidateQueries({ queryKey: ['prov-reviews'] }); }, onError: (e) => toast.err(errMsg(e)) });
  return (
    <>
      <PageTitle title="Sharhlar" sub={q.data ? `O‘rtacha reyting: ${q.data.rating_avg} (${q.data.rating_count} ta)` : ''} />
      <Async q={q} empty={<Empty title="Sharhlar yo‘q" text="Qabul qilingan ota-onalar sharh qoldirgach shu yerda ko‘rinadi." />}>
        {(d) => (<><div className="space-y-2">{d.items.map((r: any) => (<Card key={r.id} className="!p-3"><div className="flex items-center justify-between"><b>{r.author}</b><Stars value={r.rating} /></div>{r.comment && <p className="mt-1 text-sm">{r.comment}</p>}<div className="mt-1 text-xs text-black/40">{dmy(r.created_at)}</div>
          {r.response ? <div className="mt-2 rounded-lg bg-primary-50 p-2 text-sm"><b>Sizning javobingiz:</b> {r.response}</div> : null}
          <Button variant="ghost" className="mt-1 !min-h-[36px]" onClick={() => { setSel(r); setText(r.response || ''); }}>{r.response ? 'Javobni tahrirlash' : 'Javob yozish'}</Button></Card>))}</div><Pagination page={page} pageSize={10} total={d.total} onChange={setPage} /></>)}
      </Async>
      <Modal open={!!sel} onClose={() => setSel(null)} title="Sharhga javob"><textarea className="input" rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} /><Button className="mt-3 w-full" disabled={!text.trim()} loading={m.isPending} onClick={() => m.mutate()}>Saqlash</Button></Modal>
    </>
  );
}

/* ---------- Statistika ---------- */
export function Bars({ data, label }: { data: { k: string; v: number }[]; label?: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  return (
    <div><div className="flex h-40 items-end gap-2">{data.map((d) => (<div key={d.k} className="flex flex-1 flex-col items-center justify-end gap-1"><span className="text-xs font-bold text-primary">{d.v}</span><div className="w-full rounded-t-lg bg-primary/80 transition-all" style={{ height: `${(d.v / max) * 100}%`, minHeight: d.v ? 4 : 1 }} /></div>))}</div>
      <div className="mt-1 flex gap-2">{data.map((d) => <span key={d.k} className="flex-1 text-center text-[10px] text-black/45">{d.k}</span>)}</div>{label && <p className="mt-1 text-xs text-black/45">{label}</p>}</div>
  );
}

export function ProviderStatistics() {
  const q = useQuery({ queryKey: ['prov-stats'], queryFn: () => get('/me/provider/statistics') });
  return (
    <>
      <PageTitle title="Statistika" />
      <Async q={q} rows={3}>{(d) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h2 className="mb-3 font-bold text-primary">Arizalar (oxirgi 12 oy)</h2><Bars data={d.applications_by_month.map((x: any) => ({ k: x.month.slice(0, 2), v: x.count }))} /></Card>
          <Card><h2 className="mb-3 font-bold text-primary">Holatlar bo‘yicha</h2><div className="space-y-2">{Object.entries(APP_STATUS).map(([k, v]) => (<div key={k} className="flex items-center justify-between text-sm"><span>{v.label}</span><b>{d.status_counts[k] || 0}</b></div>))}</div></Card>
          <Card><h2 className="mb-3 font-bold text-primary">Reyting taqsimoti</h2>{[5, 4, 3, 2, 1].map((s) => { const n = d.rating_distribution[String(s)] || 0; const pct = d.rating_count ? (n / d.rating_count) * 100 : 0; return (<div key={s} className="mb-1 flex items-center gap-2 text-sm"><span className="w-8">{s} ★</span><div className="h-2 flex-1 rounded-full bg-black/10"><div className="h-2 rounded-full bg-sun" style={{ width: `${pct}%` }} /></div><span className="w-6 text-right">{n}</span></div>); })}<div className="mt-2 text-sm">O‘rtacha: <b>{d.rating_avg}</b> ({d.rating_count} sharh)</div></Card>
        </div>)}
      </Async>
    </>
  );
}
