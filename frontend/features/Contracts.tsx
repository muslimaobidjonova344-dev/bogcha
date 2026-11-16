'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSignature, Printer } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Async, Badge, Button, Card, Confirm, Empty, Field, Modal, PageTitle, useToast } from '@/components/ui/ui';
import { get, post } from '@/lib/api';
import { dmy, dmyHm, errMsg, uzs } from '@/lib/format';

const ST: Record<string, { label: string; cls: string }> = {
  sent: { label: 'Imzo kutilmoqda', cls: 'bg-sun-light text-amber-800' },
  active: { label: 'Faol (imzolangan)', cls: 'bg-primary-50 text-primary' },
  cancelled: { label: 'Bekor qilingan', cls: 'bg-red-50 text-red-700' },
};
/** Imzo identifikatori (shartnoma raqami, imzo egasi va vaqtidan olingan qisqa kod). */
function sigId(...parts: string[]) {
  let h = 2166136261; const t = parts.join('|');
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  const x = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `${x.slice(0, 4)}-${x.slice(4)}`;
}

/** Qo'lda yozilgandek imzo, "Elektron imzo bilan tasdiqlangan" muhri, vaqt va imzo ID. */
function SignatureBlock({ who, name, at, number }: { who: string; name?: string | null; at?: string | null; number: string }) {
  const tilt = ((sigId(number, who).charCodeAt(0) % 5) - 2) * 0.8;
  return (
    <div className="rounded-xl border border-black/15 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-black/45">{who} imzosi</div>
      {at && name ? (
        <>
          <div className="relative mt-2 h-20">
            <div className="absolute inset-x-0 top-0 truncate text-[34px] leading-[1.1] text-[#1E3A8A]" style={{ fontFamily: 'var(--font-sign), "Segoe Script", "Brush Script MT", cursive', transform: `rotate(${tilt}deg)` }}>{name}</div>
            <svg viewBox="0 0 220 16" className="absolute bottom-3 left-0 w-full text-[#1E3A8A]/70" fill="none" aria-hidden><path d="M2 12 C40 2, 80 14, 120 7 S190 3, 218 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            <div className="absolute bottom-0 right-0 flex rotate-[-6deg] items-center gap-1 rounded-md border-2 border-primary/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-tight tracking-wide text-primary/80"><span className="text-[12px]">✓</span>Elektron imzo<br />bilan tasdiqlangan</div>
          </div>
          <div className="mt-2 border-t border-black/10 pt-2 text-[12px] leading-snug text-black/55"><b className="text-black/70">{name}</b><br />{dmyHm(at)} · Imzo ID: {sigId(number, name, at)}</div>
        </>
      ) : <div className="mt-3 flex h-20 items-center text-sm italic text-black/40">Imzo kutilmoqda…</div>}
    </div>
  );
}

const unit = (c: any) => (c.price_unit === 'month' ? 'oyiga' : 'bir dars');

export function ContractsList({ base }: { base: string }) {
  const q = useQuery({ queryKey: ['contracts'], queryFn: () => get('/contracts') });
  return (
    <>
      <PageTitle title="Shartnomalar" sub="Qabul qilingan arizalar bo‘yicha tuzilgan shartnomalar" />
      <Async q={q} empty={<Empty title="Shartnomalar yo‘q" text="Ariza qabul qilingach, muassasa shartnoma tuzadi va u shu yerda ko‘rinadi." />}>
        {(d) => d.items.length === 0 ? <Empty title="Shartnomalar yo‘q" text="Ariza qabul qilingach, muassasa shartnoma tuzadi va u shu yerda ko‘rinadi." /> : (
          <div className="grid gap-3 md:grid-cols-2">{d.items.map((c: any) => (
            <Link key={c.id} href={`${base}/contracts/${c.id}`}>
              <Card className="transition hover:-translate-y-0.5 hover:shadow-pop">
                <div className="flex items-start justify-between gap-2"><div className="font-extrabold text-primary">№ {c.number}</div><Badge cls={ST[c.status]?.cls}>{ST[c.status]?.label}</Badge></div>
                <div className="mt-2 text-sm font-semibold">{c.provider.name}</div>
                <div className="text-sm text-black/55">Farzand: {c.child.full_name}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-black/60"><span>{uzs(c.price)} {unit(c)}</span><span>{dmy(c.start_date)} – {dmy(c.end_date)}</span></div>
              </Card>
            </Link>))}</div>
        )}
      </Async>
    </>
  );
}

/** Shartnoma hujjati: chop etishga mos, elektron imzo bilan. */
export function ContractView({ id, role, base }: { id: string; role: 'parent' | 'provider'; base: string }) {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['contract', id], queryFn: () => get(`/contracts/${id}`) });
  const [name, setName] = useState(''); const [agree, setAgree] = useState(false); const [cancel, setCancel] = useState(false);
  const refresh = (d?: any) => { if (d) qc.setQueryData(['contract', id], d); qc.invalidateQueries({ queryKey: ['contracts'] }); };
  const sign = useMutation({ mutationFn: () => post(`/contracts/${id}/sign`, { full_name: name }), onSuccess: (d) => { toast.ok('Shartnoma imzolandi'); refresh(d); }, onError: (e) => toast.err(errMsg(e)) });
  const cn = useMutation({ mutationFn: () => post(`/contracts/${id}/cancel`, {}), onSuccess: (d) => { toast.ok('Shartnoma bekor qilindi'); setCancel(false); refresh(d); }, onError: (e) => toast.err(errMsg(e)) });
  return (
    <Async q={q} rows={3}>
      {(c) => (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <Link href={`${base}/contracts`} className="text-sm font-bold text-primary">← Shartnomalar</Link>
            <div className="flex gap-2"><Badge cls={ST[c.status]?.cls}>{ST[c.status]?.label}</Badge><Button variant="outline" onClick={() => window.print()}><Printer size={16} />Chop etish / PDF</Button></div>
          </div>

          <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-card sm:p-10 print:border-0 print:p-0 print:shadow-none">
            <header className="border-b-2 border-primary pb-4 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-primary/60">Kichkintoy platformasi</div>
              <h1 className="mt-1 text-2xl font-extrabold text-primary">{c.kind === 'kindergarten' ? 'Maktabgacha ta‘lim xizmatlari' : 'Repetitorlik xizmatlari'} shartnomasi</h1>
              <div className="mt-1 text-sm text-black/60">№ {c.number} · {dmy(c.created_at)}</div>
            </header>

            <section className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-primary-50 p-4"><div className="text-xs font-bold uppercase text-primary/60">Ijrochi</div><div className="mt-1 font-extrabold">{c.provider.name}</div><div className="text-black/60">{c.provider.address || '—'}</div><div className="text-black/60">{c.provider.phone || ''} {c.provider.email || ''}</div></div>
              <div className="rounded-xl bg-peach-light p-4"><div className="text-xs font-bold uppercase text-primary/60">Buyurtmachi (ota-ona)</div><div className="mt-1 font-extrabold">{c.parent.full_name}</div><div className="text-black/60">{c.parent.phone || ''} {c.parent.email || ''}</div><div className="text-black/60">Farzand: <b>{c.child.full_name}</b> ({dmy(c.child.birth_date)})</div></div>
            </section>

            <dl className="mt-4 grid gap-2 rounded-xl border border-black/10 p-4 text-sm sm:grid-cols-3">
              <div><dt className="text-black/50">Narx</dt><dd className="font-extrabold text-primary">{uzs(c.price)} <span className="font-medium text-black/50">/ {unit(c)}</span></dd></div>
              <div><dt className="text-black/50">Boshlanishi</dt><dd className="font-semibold">{dmy(c.start_date)}</dd></div>
              <div><dt className="text-black/50">Tugashi</dt><dd className="font-semibold">{dmy(c.end_date)}</dd></div>
            </dl>

            <section className="mt-5 space-y-3">{c.terms.map((t: any) => (<div key={t.title}><h2 className="font-extrabold text-primary">{t.title}</h2><p className="text-[14.5px] leading-relaxed text-black/75">{t.text}</p></div>))}</section>

            <section className="mt-8 grid gap-6 sm:grid-cols-2">
              <SignatureBlock who="Ijrochi" name={c.provider_signed_name} at={c.provider_signed_at} number={c.number} />
              <SignatureBlock who="Buyurtmachi" name={c.parent_signed_name} at={c.parent_signed_at} number={c.number} />
            </section>
            <p className="mt-4 text-center text-[11.5px] text-black/40">Hujjat Kichkintoy platformasida elektron shaklda tuzilgan. Imzo vaqti va tomonlar ma‘lumotlari tizimda saqlanadi.</p>
          </article>

          {role === 'parent' && c.status === 'sent' && (
            <Card className="print:hidden">
              <h3 className="mb-1 flex items-center gap-2 font-extrabold text-primary"><FileSignature size={18} />Shartnomani imzolash</h3>
              <p className="mb-3 text-sm text-black/60">Shartlarni o‘qib chiqing va profildagi to‘liq ism-familiyangizni kiriting. Bu elektron imzo hisoblanadi.</p>
              <Field label="To‘liq ism-familiya"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Dilnoza Karimova" /></Field>
              <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />Shartnoma shartlari bilan to‘liq tanishdim va roziman</label>
              <Button className="mt-4 w-full" loading={sign.isPending} disabled={!agree || name.trim().length < 3} onClick={() => sign.mutate()}>Imzolash</Button>
            </Card>
          )}
          {c.status !== 'cancelled' && <div className="print:hidden"><Button variant="danger" onClick={() => setCancel(true)}>Shartnomani bekor qilish</Button></div>}
          <Confirm open={cancel} onClose={() => setCancel(false)} onYes={() => cn.mutate()} loading={cn.isPending} danger title="Shartnomani bekor qilish" text="Ikkinchi tomonga xabar yuboriladi. Bu amalni qaytarib bo‘lmaydi." />
        </div>
      )}
    </Async>
  );
}

/** Ariza sahifasidagi shartnoma bloki. Ota-ona: ko'rish/imzolash. Muassasa: tuzish. */
export function ContractPanel({ applicationId, status, role, base, defaultPrice }: { applicationId: string; status: string; role: 'parent' | 'provider'; base: string; defaultPrice?: number }) {
  const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['contract-app', applicationId], queryFn: () => get(`/contracts/by-application/${applicationId}`), enabled: status === 'ACCEPTED' });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ start_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), months: 12, price: defaultPrice || 0, sign_name: '' });
  const create = useMutation({
    mutationFn: () => post(`/me/provider/applications/${applicationId}/contract`, { start_date: f.start_date, months: Number(f.months), price: f.price ? Number(f.price) : null, sign_name: f.sign_name }),
    onSuccess: () => { toast.ok('Shartnoma tuzildi va ota-onaga yuborildi'); setOpen(false); qc.invalidateQueries({ queryKey: ['contract-app', applicationId] }); }, onError: (e) => toast.err(errMsg(e)),
  });
  if (status !== 'ACCEPTED' || q.isLoading) return null;
  const c = q.data?.contract;
  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 font-bold text-primary"><FileSignature size={18} />Shartnoma</h3>
      {c ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><b>№ {c.number}</b> · {uzs(c.price)} {unit(c)}<div className="mt-1"><Badge cls={ST[c.status]?.cls}>{ST[c.status]?.label}</Badge></div></div>
          <Link href={`${base}/contracts/${c.id}`} className="btn btn-primary">{role === 'parent' && c.status === 'sent' ? 'Ko‘rish va imzolash' : 'Ko‘rish'}</Link></div>
      ) : role === 'provider' ? (
        <><p className="mb-3 text-sm text-black/60">Ariza qabul qilindi. Endi shartnoma tuzing: u ota-onaga yuboriladi va u elektron imzo bilan tasdiqlaydi.</p><Button onClick={() => setOpen(true)}>Shartnoma tuzish</Button></>
      ) : <p className="text-sm text-black/55">Muassasa tez orada shartnoma yuboradi. Bildirishnoma keladi.</p>}
      <Modal open={open} onClose={() => setOpen(false)} title="Shartnoma tuzish">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2"><Field label="Boshlanish sanasi"><input type="date" className="input" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field><Field label="Muddat (oy)"><input type="number" min={1} max={36} className="input" value={f.months} onChange={(e) => setF({ ...f, months: Number(e.target.value) })} /></Field></div>
          <Field label="Narx (so‘m)" hint="Bo‘sh qoldirsangiz profildagi narx olinadi"><input type="number" className="input" value={f.price || ''} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
          <Field label="Imzo (to‘liq ism-familiyangiz)"><input className="input" value={f.sign_name} onChange={(e) => setF({ ...f, sign_name: e.target.value })} /></Field>
          <Button className="w-full" loading={create.isPending} disabled={f.sign_name.trim().length < 3} onClick={() => create.mutate()}>Imzolab yuborish</Button>
        </div>
      </Modal>
    </Card>
  );
}
