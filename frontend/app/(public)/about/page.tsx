import { Baby, Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { FEATURES } from '@/features/helpContent';

export const metadata = { title: 'Ilova haqida — Kichkintoy' };

const ROLES = [
  { icon: Baby, t: 'Ota-onalar', d: 'Farzandi uchun bog‘cha yoki repetitorni qidiradi, solishtiradi, ariza yuboradi va yozishadi.' },
  { icon: Building2, t: 'Bog‘chalar', d: 'Profilini yuritadi, bo‘sh o‘rinlarni e’lon qiladi, arizalar va shartnomalarni boshqaradi.' },
  { icon: GraduationCap, t: 'Repetitorlar', d: 'Fan va narxlarini kiritadi, bo‘sh vaqtni belgilaydi, so‘rov va darslarni yuritadi.' },
  { icon: ShieldCheck, t: 'Administrator', d: 'Profillarni tekshiradi, sharhlarni nazorat qiladi va umumiy hisobotlarni kuzatadi.' },
];
const STEPS = ['Qidiring va solishtiring', 'Ariza yuboring', 'Muassasa javobi va suhbat', 'Shartnoma va o‘qish', 'Sharh qoldiring'];

export default function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="rounded-3xl bg-primary px-6 py-10 text-white shadow-pop sm:px-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Kichkintoy haqida</h1>
        <p className="mt-3 max-w-2xl text-white/85">Kichkintoy — bolalar bog‘chasi va repetitor tanlashni osonlashtiradigan platforma. Ota-onalar ishonchli muassasani topadi, muassasalar esa arizalar va shartnomalarni bir joyda boshqaradi.</p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-primary">Kim uchun?</h2>
        <div className="grid gap-4 sm:grid-cols-2">{ROLES.map((r) => (
          <div key={r.t} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card"><r.icon className="text-primary" size={26} /><h3 className="mt-2 font-extrabold text-primary">{r.t}</h3><p className="mt-1 text-sm text-black/60">{r.d}</p></div>
        ))}</div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-primary">Qanday ishlaydi?</h2>
        <ol className="grid gap-3 sm:grid-cols-5">{STEPS.map((s, i) => (
          <li key={s} className="rounded-2xl bg-secondary-light p-4 text-center"><div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-extrabold text-white">{i + 1}</div><p className="mt-2 text-sm font-semibold text-primary">{s}</p></li>
        ))}</ol>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-primary">Asosiy imkoniyatlar</h2>
        <div className="grid gap-3 sm:grid-cols-2">{FEATURES.map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-black/5 bg-white p-4"><h3 className="font-bold text-primary">{t}</h3><p className="mt-1 text-sm text-black/60">{d}</p></div>
        ))}</div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-extrabold text-primary">Xavfsizlik va maxfiylik</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-black/70">
          <li>Parollar xeshlangan holda saqlanadi; kirish xavfsiz cookie orqali.</li>
          <li>Har bir rol faqat o‘ziga tegishli bo‘limlarni ko‘radi (rollar bo‘yicha ruxsat).</li>
          <li>Muassasa profillari ommaga chiqishdan oldin administrator tomonidan tekshiriladi.</li>
          <li>O‘rnatilgan ilovada PIN kod va barmoq izi himoyasi mavjud.</li>
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary-light p-6">
        <p className="font-bold text-primary">Savollaringiz bormi? Yo‘riqnomani ko‘ring.</p>
        <div className="flex gap-2"><Link href="/help" className="btn btn-primary">Yo‘riqnoma</Link><Link href="/register" className="btn btn-ghost">Ro‘yxatdan o‘tish</Link></div>
      </section>
    </div>
  );
}
