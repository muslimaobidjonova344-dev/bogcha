'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, ClipboardList, Download, FileCheck2, Flag, ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Async, Badge, Button, Card, Confirm, Empty, Field, Modal, PageTitle, Pagination, StatCard, StatusBadge, Tabs, VerifyBadge, useToast } from '@/components/ui/ui';
import { del, get, post } from '@/lib/api';
import { dmy, dmyHm, errMsg } from '@/lib/format';
import { Bars } from './ProviderCommon';
import { AdminAnalytics } from './Reports';

const ROLE_LBL: Record<string, string> = { parent: 'Ota-ona', kindergarten_admin: 'Bog‘cha', tutor: 'Repetitor', super_admin: 'Super Admin' };
const inval = (qc: any, ...k: string[]) => k.forEach((x) => qc.invalidateQueries({ queryKey: [x] }));

export function AdminDashboard() {
  const q = useQuery({ queryKey: ['adm-dash'], queryFn: () => get('/admin/dashboard') });
  return (<><PageTitle title="Boshqaruv paneli" /><Async q={q} rows={3}>{(d) => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Foydalanuvchilar" value={d.total_users} href="/admin/users" icon={<Users size={16} />} />
        <StatCard label="Ota-onalar" value={d.parents} href="/admin/users" tone="plain" />
        <StatCard label="Bog‘chalar" value={d.kindergartens} href="/admin/providers" tone="peach" icon={<Building2 size={16} />} />
        <StatCard label="Repetitorlar" value={d.tutors} href="/admin/providers" tone="peach" />
        <StatCard label="Faol muassasalar" value={d.active_providers} href="/admin/providers" />
        <StatCard label="Tekshiruv kutmoqda" value={d.pending_providers} href="/admin/moderation" tone="yellow" icon={<FileCheck2 size={16} />} />
        <StatCard label="Arizalar" value={d.total_applications} href="/admin/applications" icon={<ClipboardList size={16} />} />
        <StatCard label="Ochiq shikoyatlar" value={d.open_reports} href="/admin/reports" tone="yellow" icon={<Flag size={16} />} />
        <StatCard label="Yangi (7 kun)" value={d.new_users_7d} tone="plain" />
        <StatCard label="Faol (7 kun)" value={d.active_users_7d} tone="plain" />
      </div>
      <Card><h2 className="mb-3 font-bold text-primary">Ro‘yxatdan o‘tish dinamikasi</h2><Bars data={d.growth.map((x: any) => ({ k: x.month, v: x.users }))} /></Card>
    </div>)}</Async></>);
}

/* ---------- Foydalanuvchilar ---------- */
export function AdminUsers() {
  const qc = useQueryClient(); const toast = useToast();
  const sp = useSearchParams();
  const [f, setF] = useState<any>({ role: sp.get('role') || '', q: '', active: '' }); const [page, setPage] = useState(1);
  const [blk, setBlk] = useState<any>(null); const [reason, setReason] = useState('');
  const [roleU, setRoleU] = useState<any>(null); const [newRole, setNewRole] = useState('super_admin');
  const q = useQuery({ queryKey: ['adm-users', f, page], queryFn: () => get('/admin/users', { role: f.role || undefined, q: f.q || undefined, active: f.active === '' ? undefined : f.active === '1', page, page_size: 20 }) });
  const ok = () => { toast.ok('Saqlandi'); setBlk(null); setRoleU(null); setReason(''); inval(qc, 'adm-users'); };
  const block = useMutation({ mutationFn: () => post(`/admin/users/${blk.id}/block`, { reason }), onSuccess: ok, onError: (e) => toast.err(errMsg(e)) });
  const unblock = useMutation({ mutationFn: (id: string) => post(`/admin/users/${id}/unblock`), onSuccess: ok, onError: (e) => toast.err(errMsg(e)) });
  const role = useMutation({ mutationFn: () => post(`/admin/users/${roleU.id}/role`, { role: newRole }), onSuccess: ok, onError: (e) => toast.err(errMsg(e)) });
  return (
    <>
      <PageTitle title="Foydalanuvchilar" action={<a className="btn-outline inline-flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-2 text-sm font-semibold text-primary" href="/api/v1/admin/reports/export.csv?kind=users"><Download size={16} />CSV</a>} />
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <input className="input" placeholder="Ism, email yoki telefon" value={f.q} onChange={(e) => { setF({ ...f, q: e.target.value }); setPage(1); }} />
        <select className="input" value={f.role} onChange={(e) => { setF({ ...f, role: e.target.value }); setPage(1); }}><option value="">Barcha rollar</option>{Object.entries(ROLE_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={f.active} onChange={(e) => { setF({ ...f, active: e.target.value }); setPage(1); }}><option value="">Barcha holat</option><option value="1">Faol</option><option value="0">Bloklangan</option></select>
      </div>
      <Async q={q} empty={<Empty title="Foydalanuvchi topilmadi" />}>{(d) => (<><div className="space-y-2">{d.items.map((u: any) => (
        <Card key={u.id} className="flex flex-wrap items-center justify-between gap-2 !p-3">
          <div className="min-w-0"><div className="font-bold">{u.full_name}</div><div className="truncate text-sm text-black/55">{u.email}{u.phone ? ` · ${u.phone}` : ''}</div><div className="text-xs text-black/40">Ro‘yxatdan: {dmy(u.created_at)}{u.last_login_at ? ` · oxirgi kirish: ${dmyHm(u.last_login_at)}` : ''}</div></div>
          <div className="flex flex-wrap items-center gap-2"><Badge>{ROLE_LBL[u.role]}</Badge>{!u.email_verified && <Badge cls="bg-sun-light text-amber-800">Email tasdiqlanmagan</Badge>}{u.totp_enabled && <Badge cls="bg-primary-100 text-primary">2FA</Badge>}{!u.is_active && <Badge cls="bg-red-100 text-red-700">Bloklangan</Badge>}
            {u.is_active ? <Button variant="ghost" className="!min-h-[36px] !text-red-600" onClick={() => setBlk(u)}>Bloklash</Button> : <Button variant="outline" className="!min-h-[36px]" onClick={() => unblock.mutate(u.id)}>Faollashtirish</Button>}
            <Button variant="ghost" className="!min-h-[36px]" onClick={() => { setRoleU(u); setNewRole(u.role === 'super_admin' ? 'parent' : 'super_admin'); }}>Rol</Button></div>
          {!u.is_active && u.blocked_reason && <p className="w-full text-xs text-red-700">Sabab: {u.blocked_reason}</p>}
        </Card>))}</div><Pagination page={page} pageSize={20} total={d.total} onChange={setPage} /></>)}</Async>
      <Modal open={!!blk} onClose={() => setBlk(null)} title="Foydalanuvchini bloklash"><div className="space-y-3"><p className="text-sm">{blk?.full_name} — barcha seanslari tugatiladi.</p><Field label="Sabab (majburiy)"><textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field><Button className="w-full" loading={block.isPending} disabled={reason.trim().length < 3} onClick={() => block.mutate()}>Bloklash</Button></div></Modal>
      <Modal open={!!roleU} onClose={() => setRoleU(null)} title="Rolni o‘zgartirish"><div className="space-y-3"><p className="text-sm text-black/60">Provider va ota-ona rollari o‘rtasida almashtirib bo‘lmaydi. Asosan yangi Super Admin tayinlash uchun.</p><select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>{Object.entries(ROLE_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><Button className="w-full" loading={role.isPending} onClick={() => role.mutate()}>Saqlash</Button></div></Modal>
    </>
  );
}

/* ---------- Muassasalar ---------- */
export function AdminProviders({ queue }: { queue?: boolean }) {
  const sp = useSearchParams();
  const [f, setF] = useState<any>({ type: sp.get('type') || '', status: queue ? '' : '', q: '' }); const [page, setPage] = useState(1); const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['adm-prov', f, page, queue], queryFn: async () => {
    if (queue && !f.status) { const [a, b] = await Promise.all([get('/admin/providers', { ...f, status: 'pending', page, page_size: 20 }), get('/admin/providers', { ...f, status: 'under_review', page, page_size: 20 })]); return { items: [...a.items, ...b.items], total: a.total + b.total }; }
    return get('/admin/providers', { type: f.type || undefined, status: f.status || undefined, q: f.q || undefined, page, page_size: 20 });
  } });
  return (
    <>
      <PageTitle title={queue ? 'Tekshiruv navbati' : 'Muassasalar'} sub={queue ? 'Tasdiqlashni kutayotgan bog‘cha va repetitorlar' : undefined} />
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <input className="input" placeholder="Nomi bo‘yicha" value={f.q} onChange={(e) => { setF({ ...f, q: e.target.value }); setPage(1); }} />
        <select className="input" value={f.type} onChange={(e) => { setF({ ...f, type: e.target.value }); setPage(1); }}><option value="">Barcha turlar</option><option value="kindergarten">Bog‘cha</option><option value="tutor">Repetitor</option></select>
        <select className="input" value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setPage(1); }}><option value="">{queue ? 'Kutilayotganlar' : 'Barcha holat'}</option>{['pending', 'under_review', 'approved', 'rejected', 'suspended'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <Async q={q} empty={<Empty title="Muassasa topilmadi" />}>{(d) => (<><div className="space-y-2">{d.items.map((p: any) => (
        <Card key={p.id} className="flex flex-wrap items-center justify-between gap-2 !p-3 cursor-pointer" ><div onClick={() => setOpen(p.id)} className="min-w-0 flex-1"><div className="font-bold">{p.name}</div><div className="text-sm text-black/55">{p.type === 'tutor' ? 'Repetitor' : 'Bog‘cha'} · {p.owner_name} · {p.owner_email}</div><div className="text-xs text-black/40">{dmy(p.created_at)} · hujjatlar: {p.documents_count}{!p.owner_email_verified && ' · email tasdiqlanmagan'}</div></div><div className="flex items-center gap-2"><VerifyBadge status={p.verification_status} /><Button variant="outline" className="!min-h-[36px]" onClick={() => setOpen(p.id)}>Ko‘rish</Button></div></Card>))}</div><Pagination page={page} pageSize={20} total={d.total} onChange={setPage} /></>)}</Async>
      <ProviderReview id={open} onClose={() => setOpen(null)} />
    </>
  );
}

function ProviderReview({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['adm-prov-detail', id], queryFn: () => get(`/admin/providers/${id}`), enabled: !!id });
  const [note, setNote] = useState(''); const [docNote, setDocNote] = useState<Record<string, string>>({});
  const done = () => { toast.ok('Saqlandi'); inval(qc, 'adm-prov-detail', 'adm-prov', 'adm-dash'); };
  const doc = useMutation({ mutationFn: ({ did, status }: any) => post(`/admin/documents/${did}/review`, { status, note: docNote[did] || null }), onSuccess: done, onError: (e) => toast.err(errMsg(e)) });
  const ver = useMutation({ mutationFn: (status: string) => post(`/admin/providers/${id}/verification`, { status, note: note || null }), onSuccess: () => { done(); setNote(''); }, onError: (e) => toast.err(errMsg(e)) });
  const p = q.data;
  return (
    <Modal open={!!id} onClose={onClose} title={p?.name || 'Muassasa'}>
      <Async q={q} rows={2}>{() => (
        <div className="space-y-4">
          <div className="text-sm"><div className="flex items-center gap-2"><VerifyBadge status={p.verification_status} /><span>{p.type === 'tutor' ? 'Repetitor' : 'Bog‘cha'}</span></div>
            <p className="mt-2">Egasi: {p.owner_name} ({p.owner_email}) {p.owner_email_verified ? '✔' : <b className="text-red-600">tasdiqlanmagan</b>}</p>
            {p.address && <p>Manzil: {p.address}</p>}{p.phone && <p>Telefon: {p.phone}</p>}{p.description && <p className="mt-1 text-black/70">{p.description}</p>}
            {p.verification_note && <p className="mt-1 text-xs text-black/50">Oxirgi izoh: {p.verification_note}</p>}</div>
          <div><h3 className="mb-2 font-bold text-primary">Hujjatlar</h3>{!p.documents.length && <p className="text-sm text-black/50">Hujjat yuklanmagan</p>}
            {p.documents.map((d: any) => (<div key={d.id} className="mb-2 rounded-xl border border-black/10 p-3"><div className="flex items-center justify-between gap-2"><div><div className="font-semibold">{d.title || d.doc_type}</div><div className="text-xs text-black/50">{d.doc_type}</div></div><Badge cls={d.status === 'approved' ? 'bg-primary-100 text-primary' : d.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-sun-light text-amber-800'}>{d.status}</Badge></div>
              {d.file_id && <a className="mt-1 inline-block text-sm font-semibold text-primary underline" href={`/api/v1/files/${d.file_id}/download`} target="_blank" rel="noreferrer">Faylni ochish</a>}
              <input className="input mt-2" placeholder="Izoh (rad etishda majburiy)" value={docNote[d.id] || ''} onChange={(e) => setDocNote({ ...docNote, [d.id]: e.target.value })} />
              <div className="mt-2 flex gap-2"><Button className="!min-h-[36px]" loading={doc.isPending} onClick={() => doc.mutate({ did: d.id, status: 'approved' })}>Tasdiqlash</Button><Button variant="outline" className="!min-h-[36px] !text-red-600" onClick={() => doc.mutate({ did: d.id, status: 'rejected' })}>Rad etish</Button></div></div>))}</div>
          <div><Field label="Izoh (rad etish / to‘xtatishda majburiy)"><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="mt-2 flex flex-wrap gap-2"><Button loading={ver.isPending} onClick={() => ver.mutate('approved')}><ShieldCheck size={16} />Tasdiqlash</Button><Button variant="outline" onClick={() => ver.mutate('under_review')}>Tekshiruvda</Button><Button variant="outline" className="!text-red-600" onClick={() => ver.mutate('rejected')}>Rad etish</Button><Button variant="ghost" className="!text-red-600" onClick={() => ver.mutate('suspended')}>To‘xtatish</Button></div>
            <p className="mt-2 text-xs text-black/45">Tasdiqlash uchun kamida bitta hujjat tasdiqlangan va egasi emailini tasdiqlagan bo‘lishi shart.</p></div>
        </div>)}</Async>
    </Modal>
  );
}

/* ---------- Arizalar monitoringi ---------- */
export function AdminApplications() {
  const [f, setF] = useState<any>({ status: '', type: '' }); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['adm-apps', f, page], queryFn: () => get('/admin/applications', { status: f.status || undefined, type: f.type || undefined, page, page_size: 20 }) });
  return (<><PageTitle title="Arizalar monitoringi" action={<a className="inline-flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-2 text-sm font-semibold text-primary" href="/api/v1/admin/reports/export.csv?kind=applications"><Download size={16} />CSV</a>} />
    <div className="mb-3 grid gap-2 sm:grid-cols-2"><select className="input" value={f.type} onChange={(e) => { setF({ ...f, type: e.target.value }); setPage(1); }}><option value="">Barcha turlar</option><option value="kindergarten">Bog‘cha</option><option value="tutor">Repetitor</option></select>
      <select className="input" value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setPage(1); }}><option value="">Barcha holatlar</option>{['new', 'viewed', 'in_progress', 'waiting', 'accepted', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
    <Async q={q} empty={<Empty title="Arizalar yo‘q" />}>{(d) => (<>
      <div className="mb-3 flex flex-wrap gap-2">{Object.entries(d.by_status || {}).map(([k, v]: any) => <Badge key={k}>{k}: {v}</Badge>)}</div>
      <div className="space-y-2">{d.items.map((a: any) => (<Card key={a.id} className="flex flex-wrap items-center justify-between gap-2 !p-3"><div><div className="font-bold">№ {a.number} · {a.provider_name}</div><div className="text-sm text-black/55">{a.type === 'tutor' ? 'Repetitor' : 'Bog‘cha'} · {dmyHm(a.created_at)}</div></div><StatusBadge status={a.status} /></Card>))}</div>
      <Pagination page={page} pageSize={20} total={d.total} onChange={setPage} /></>)}</Async></>);
}

/* ---------- Sharhlar moderatsiyasi ---------- */
export function AdminReviews() {
  const qc = useQueryClient(); const toast = useToast(); const [sus, setSus] = useState(false); const [st, setSt] = useState('');
  const q = useQuery({ queryKey: ['adm-reviews', sus, st], queryFn: () => get('/admin/reviews', { suspicious_only: sus || undefined, status: st || undefined }) });
  const m = useMutation({ mutationFn: ({ id, status }: any) => post(`/admin/reviews/${id}/moderate`, { status }), onSuccess: () => { toast.ok('Saqlandi'); inval(qc, 'adm-reviews'); }, onError: (e) => toast.err(errMsg(e)) });
  return (<><PageTitle title="Sharhlar moderatsiyasi" />
    <div className="mb-3 flex flex-wrap items-center gap-2"><select className="input max-w-[200px]" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Barcha holat</option><option value="published">Chop etilgan</option><option value="hidden">Yashirin</option><option value="flagged">Belgilangan</option></select>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={sus} onChange={(e) => setSus(e.target.checked)} />Faqat shubhali</label></div>
    <Async q={q} empty={<Empty title="Sharhlar yo‘q" />}>{(d) => <div className="space-y-2">{d.items.map((r: any) => (<Card key={r.id} className="!p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{r.provider_name}</b> · {'★'.repeat(r.rating)}<span className="text-black/30">{'★'.repeat(5 - r.rating)}</span> <span className="text-xs text-black/40">{dmy(r.created_at)}</span></div><Badge>{r.status}</Badge></div>
      {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
      {r.flags?.length > 0 && <div className="mt-2 space-y-1">{r.flags.map((x: string) => <div key={x} className="flex items-center gap-1 text-xs text-amber-800"><AlertTriangle size={14} />{x}</div>)}</div>}
      <div className="mt-2 flex gap-2"><Button variant="outline" className="!min-h-[36px]" onClick={() => m.mutate({ id: r.id, status: 'published' })}>Chop etish</Button><Button variant="outline" className="!min-h-[36px]" onClick={() => m.mutate({ id: r.id, status: 'flagged' })}>Belgilash</Button><Button variant="ghost" className="!min-h-[36px] !text-red-600" onClick={() => m.mutate({ id: r.id, status: 'hidden' })}>Yashirish</Button></div></Card>))}</div>}</Async></>);
}

/* ---------- Shikoyatlar va xabarlar nazorati ---------- */
export function AdminReports() {
  const qc = useQueryClient(); const toast = useToast(); const [tab, setTab] = useState('open'); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['adm-reports', tab, page], queryFn: () => get('/admin/reports', { status: tab, page, page_size: 20 }) });
  const m = useMutation({ mutationFn: ({ id, status }: any) => post(`/admin/reports/${id}/resolve`, { status }), onSuccess: () => { toast.ok('Saqlandi'); inval(qc, 'adm-reports', 'adm-dash'); }, onError: (e) => toast.err(errMsg(e)) });
  const hide = useMutation({ mutationFn: (id: string) => post(`/admin/messages/${id}/hide`), onSuccess: () => { toast.ok('Xabar yashirildi'); inval(qc, 'adm-reports'); }, onError: (e) => toast.err(errMsg(e)) });
  const T: Record<string, string> = { review: 'Sharh', message: 'Xabar', provider: 'Muassasa', user: 'Foydalanuvchi' };
  return (<><PageTitle title="Shikoyatlar" />
    <div className="mb-3"><Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); }} tabs={[{ id: 'open', label: 'Ochiq' }, { id: 'resolved', label: 'Hal qilingan' }, { id: 'dismissed', label: 'Rad etilgan' }]} /></div>
    <Async q={q} empty={<Empty title="Shikoyatlar yo‘q" />}>{(d) => (<><div className="space-y-2">{d.items.map((r: any) => (<Card key={r.id} className="!p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{T[r.target_type] || r.target_type}</b> · {r.reason}<div className="text-xs text-black/45">{r.reporter} · {dmyHm(r.created_at)}</div></div></div>
      {r.details && <p className="mt-1 text-sm">{r.details}</p>}
      {tab === 'open' && <div className="mt-2 flex flex-wrap gap-2">{r.target_type === 'message' && <Button variant="outline" className="!min-h-[36px]" onClick={() => hide.mutate(r.target_id)}>Xabarni yashirish</Button>}<Button className="!min-h-[36px]" onClick={() => m.mutate({ id: r.id, status: 'resolved' })}>Hal qilindi</Button><Button variant="ghost" className="!min-h-[36px]" onClick={() => m.mutate({ id: r.id, status: 'dismissed' })}>Rad etish</Button></div>}</Card>))}</div><Pagination page={page} pageSize={20} total={d.total} onChange={setPage} /></>)}</Async></>);
}

export function AdminMessages() {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['adm-flagged'], queryFn: () => get('/admin/messages/flagged') });
  const hide = useMutation({ mutationFn: (id: string) => post(`/admin/messages/${id}/hide`), onSuccess: () => { toast.ok('Yashirildi'); inval(qc, 'adm-flagged'); }, onError: (e) => toast.err(errMsg(e)) });
  return (<><PageTitle title="Xabarlar nazorati" sub="Faqat shikoyat qilingan xabarlar ko‘rsatiladi — shaxsiy yozishmalar umumiy ko‘rinishda emas" />
    <Async q={q} empty={<Empty title="Shikoyat qilingan xabarlar yo‘q" />}>{(list) => <div className="space-y-2">{list.map((m: any) => (<Card key={m.id} className="!p-3"><p className="text-sm">{m.body}</p><div className="mt-1 text-xs text-black/45">{dmyHm(m.created_at)}{m.hidden && ' · yashirilgan'}</div>{!m.hidden && <Button variant="outline" className="mt-2 !min-h-[36px]" onClick={() => hide.mutate(m.id)}>Yashirish</Button>}</Card>))}</div>}</Async></>);
}

/* ---------- Hududlar va kategoriyalar ---------- */
export function AdminRegions() {
  const qc = useQueryClient(); const toast = useToast(); const [rid, setRid] = useState<number | null>(null); const [name, setName] = useState(''); const [dname, setDname] = useState('');
  const regs = useQuery({ queryKey: ['regions-adm'], queryFn: () => get('/regions', { include_inactive: true }) });
  const dist = useQuery({ queryKey: ['districts', rid], queryFn: () => get(`/regions/${rid}/districts`), enabled: !!rid });
  const ok = (k: string) => () => { toast.ok('Saqlandi'); inval(qc, k); setName(''); setDname(''); };
  const addR = useMutation({ mutationFn: () => post('/admin/regions', { name }), onSuccess: ok('regions-adm'), onError: (e) => toast.err(errMsg(e)) });
  const addD = useMutation({ mutationFn: () => post('/admin/districts', { name: dname, region_id: rid }), onSuccess: ok('districts'), onError: (e) => toast.err(errMsg(e)) });
  const tog = useMutation({ mutationFn: (id: number) => post(`/admin/regions/${id}/toggle`), onSuccess: ok('regions-adm'), onError: (e) => toast.err(errMsg(e)) });
  return (<><PageTitle title="Hududlar" />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h2 className="mb-2 font-bold text-primary">Viloyatlar</h2><div className="mb-3 flex gap-2"><input className="input" placeholder="Yangi viloyat" value={name} onChange={(e) => setName(e.target.value)} /><Button disabled={name.trim().length < 2} loading={addR.isPending} onClick={() => addR.mutate()}>Qo‘shish</Button></div>
        <Async q={regs} rows={3}>{(list) => <div className="space-y-1">{list.map((r: any) => (<div key={r.id} className={`flex items-center justify-between rounded-xl px-3 py-2 ${rid === r.id ? 'bg-primary-50' : ''}`}><button className="flex-1 text-left font-semibold" onClick={() => setRid(r.id)}>{r.name}</button><button className="text-xs font-semibold text-primary underline" onClick={() => tog.mutate(r.id)}>{r.is_active === false ? 'Yoqish' : 'O‘chirish'}</button></div>))}</div>}</Async></Card>
      <Card><h2 className="mb-2 font-bold text-primary">Tumanlar</h2>{!rid ? <p className="text-sm text-black/50">Viloyatni tanlang</p> : <><div className="mb-3 flex gap-2"><input className="input" placeholder="Yangi tuman" value={dname} onChange={(e) => setDname(e.target.value)} /><Button disabled={dname.trim().length < 2} loading={addD.isPending} onClick={() => addD.mutate()}>Qo‘shish</Button></div>
        <Async q={dist} rows={3}>{(list) => <div className="flex flex-wrap gap-2">{list.map((d: any) => <Badge key={d.id}>{d.name}</Badge>)}</div>}</Async></>}</Card>
    </div></>);
}

export function AdminCategories() {
  const qc = useQueryClient(); const toast = useToast(); const [kind, setKind] = useState('subject'); const [name, setName] = useState('');
  const q = useQuery({ queryKey: ['cat-adm', kind], queryFn: () => get('/categories', { kind, include_inactive: true }) });
  const ok = () => { toast.ok('Saqlandi'); setName(''); inval(qc, 'cat-adm', 'cat'); };
  const add = useMutation({ mutationFn: () => post('/admin/categories', { kind, name }), onSuccess: ok, onError: (e) => toast.err(errMsg(e)) });
  const tog = useMutation({ mutationFn: (id: number) => post(`/admin/categories/${id}/toggle`), onSuccess: ok, onError: (e) => toast.err(errMsg(e)) });
  return (<><PageTitle title="Kategoriyalar" sub="Fanlar, qulayliklar va ta‘lim bosqichlari" />
    <Tabs value={kind} onChange={setKind} tabs={[{ id: 'subject', label: 'Fanlar' }, { id: 'amenity', label: 'Qulayliklar' }, { id: 'education_level', label: 'Bosqichlar' }]} />
    <Card className="mt-3"><div className="mb-3 flex gap-2"><input className="input" placeholder="Yangi nom" value={name} onChange={(e) => setName(e.target.value)} /><Button disabled={name.trim().length < 2} loading={add.isPending} onClick={() => add.mutate()}>Qo‘shish</Button></div>
      <Async q={q} rows={3}>{(list) => <div className="flex flex-wrap gap-2">{list.map((c: any) => (<button key={c.id} onClick={() => tog.mutate(c.id)} title="Bosib yoqish/o‘chirish" className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${c.is_active === false ? 'border-black/10 text-black/30 line-through' : 'border-primary/30 bg-primary-50 text-primary'}`}>{c.name}</button>))}</div>}</Async></Card></>);
}

/* ---------- Audit log ---------- */
export function AdminAudit() {
  const [action, setAction] = useState(''); const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['adm-audit', action, page], queryFn: () => get('/admin/audit-logs', { action: action || undefined, page, page_size: 50 }) });
  return (<><PageTitle title="Audit log" sub="Barcha muhim admin amallari qayd etiladi" />
    <input className="input mb-3 max-w-sm" placeholder="Amal bo‘yicha (masalan: admin.user)" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
    <Async q={q} empty={<Empty title="Yozuvlar yo‘q" />}>{(d) => (<><div className="space-y-1.5">{d.items.map((a: any) => (<Card key={a.id} className="!p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-primary">{a.action}</b><span className="text-xs text-black/45">{dmyHm(a.created_at)}{a.ip ? ` · ${a.ip}` : ''}</span></div><div className="text-xs text-black/55">{a.entity_type}{a.entity_id ? ` #${String(a.entity_id).slice(0, 8)}` : ''}{a.details ? ` · ${JSON.stringify(a.details)}` : ''}</div></Card>))}</div><Pagination page={page} pageSize={50} total={d.total} onChange={setPage} /></>)}</Async></>);
}

export function AdminExports() {
  return (<><AdminAnalytics />
    <h2 className="mb-2 mt-8 font-extrabold text-primary">Ma‘lumotlarni yuklab olish (CSV)</h2>
    <div className="grid gap-3 sm:grid-cols-3">{[['providers', 'Muassasalar'], ['users', 'Foydalanuvchilar'], ['applications', 'Arizalar']].map(([k, l]) => (<Card key={k}><div className="mb-3 font-bold">{l}</div><a className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white" href={`/api/v1/admin/reports/export.csv?kind=${k}`}><Download size={16} />CSV</a></Card>))}</div></>);
}
