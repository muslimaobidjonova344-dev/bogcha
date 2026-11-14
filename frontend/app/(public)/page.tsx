import { Baby, Building2, GraduationCap, MapPin, Scale, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  { icon: MapPin, t: 'Xaritada qidiring', d: 'Yaqin atrofdagi bog‘cha va repetitorlarni xaritada ko‘ring.' },
  { icon: Scale, t: 'Solishtiring', d: 'Narx, reyting va sharoitlarni yonma-yon taqqoslang.' },
  { icon: ShieldCheck, t: 'Tasdiqlangan muassasalar', d: 'Hujjatlari administrator tomonidan tekshirilgan profillar.' },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-primary px-6 py-12 text-white shadow-pop sm:px-12">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">Farzandingiz uchun to‘g‘ri bog‘cha yoki repetitorni toping</h1>
        <p className="mt-4 max-w-xl text-white/80">Qidiring, solishtiring, ariza yuboring va muassasa bilan to‘g‘ridan-to‘g‘ri yozishing — bir joyda.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/kindergartens" className="btn bg-white !text-primary"><Building2 size={18} />Bog‘cha qidirish</Link>
          <Link href="/tutors" className="btn border border-white/50 text-white"><GraduationCap size={18} />Repetitor qidirish</Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (<div key={f.t} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card"><f.icon className="text-primary" size={26} /><h2 className="mt-3 font-extrabold text-primary">{f.t}</h2><p className="mt-1 text-sm text-black/60">{f.d}</p></div>))}
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/register?role=parent" className="rounded-2xl bg-secondary-light p-5"><Baby className="text-primary" /><h3 className="mt-2 font-extrabold text-primary">Ota-onaman</h3><p className="text-sm text-black/60">Ro‘yxatdan o‘ting va farzandingiz uchun ariza yuboring.</p></Link>
        <Link href="/register?role=kindergarten_admin" className="rounded-2xl bg-peach-light p-5"><Building2 className="text-primary" /><h3 className="mt-2 font-extrabold text-primary">Bog‘chaman</h3><p className="text-sm text-black/60">Muassasangizni joylang va arizalarni qabul qiling.</p></Link>
        <Link href="/register?role=tutor" className="rounded-2xl bg-sun-light p-5"><GraduationCap className="text-primary" /><h3 className="mt-2 font-extrabold text-primary">Repetitorman</h3><p className="text-sm text-black/60">Fan va jadvalingizni kiriting, o‘quvchilar toping.</p></Link>
      </section>
    </div>
  );
}
