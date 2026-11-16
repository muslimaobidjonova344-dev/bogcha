'use client';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { FAQ, GUIDES } from './helpContent';

/** Yo'riqnoma: rol bo'yicha qadamlar + ko'p so'raladigan savollar (accordion). */
export default function HelpView() {
  const [role, setRole] = useState(GUIDES[0].role);
  const [open, setOpen] = useState<number | null>(0);
  const g = GUIDES.find((x) => x.role === role)!;
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-3xl font-extrabold text-primary">Foydalanish yo‘riqnomasi</h1>
        <p className="mt-1 text-black/60">Rolingizni tanlang va qadamlar bo‘yicha boring. Boshqa savollar uchun pastdagi “Ko‘p so‘raladigan savollar” bo‘limiga qarang.</p>
      </header>

      <section>
        <div role="tablist" className="flex flex-wrap gap-2">{GUIDES.map((x) => (
          <button key={x.role} role="tab" aria-selected={x.role === role} onClick={() => setRole(x.role)} className={clsx('rounded-full px-4 py-2 text-sm font-bold transition', x.role === role ? 'bg-primary text-white' : 'bg-primary-50 text-primary hover:bg-primary/10')}>{x.title}</button>
        ))}</div>
        <ol className="mt-4 space-y-3">{g.steps.map((s, i) => (
          <li key={s.t} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-white">{i + 1}</span>
            <div><h3 className="font-extrabold text-primary">{s.t}</h3><p className="mt-0.5 text-sm text-black/65">{s.d}</p></div>
          </li>
        ))}</ol>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-primary">Ko‘p so‘raladigan savollar</h2>
        <div className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">{FAQ.map((f, i) => (
          <div key={f.q}>
            <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-bold text-primary">
              {f.q}<ChevronDown size={18} className={clsx('shrink-0 transition', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="px-4 pb-4 text-sm leading-relaxed text-black/65">{f.a}</p>}
          </div>
        ))}</div>
      </section>

      <section className="rounded-2xl bg-secondary-light p-6 text-center">
        <p className="font-bold text-primary">Javob topilmadimi?</p>
        <p className="mt-1 text-sm text-black/60">Hisobingizga kirib, “Xabarlar” orqali muassasaga yozing yoki <Link href="/about" className="font-bold underline">ilova haqida</Link> sahifasini ko‘ring.</p>
      </section>
    </div>
  );
}
