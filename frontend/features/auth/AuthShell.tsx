'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactNode } from 'react';
import Illustration from './Illustration';

export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } };
export const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

function Brand({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Kichkintoy bosh sahifa">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sun text-lg shadow-card">🌱</span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-primary'}`}>Kichkintoy</span>
    </Link>
  );
}

/** Desktop: chap — illustratsiya, o'ng — forma. Mobil: tepada ixcham illustratsiya, pastda to'liq kenglikdagi forma. */
export default function AuthShell({ children, title, subtitle, side }: { children: ReactNode; title: string; subtitle?: string; side?: 'login' | 'register' | 'plain' }) {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* illustratsiya paneli */}
      <aside className="relative overflow-hidden bg-primary text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-peach/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-between px-5 pt-5 lg:p-0"><Brand light /></div>
        <div className="relative mx-auto -mb-6 mt-0 flex max-w-[260px] justify-center lg:my-auto lg:mb-0 lg:max-w-[560px]">
          <Illustration className="h-[168px] w-full lg:h-auto" />
        </div>
        <div className="relative hidden lg:block">
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="max-w-md text-3xl font-extrabold leading-tight">
            Har bir bola uchun <span className="text-sun">mehrli maktub</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-3 max-w-md text-white/75">
            {side === 'register' ? 'Bog‘cha va repetitorlarni toping, ariza yuboring va farzandingiz kelajagiga ishonch bilan qadam qo‘ying.' : 'Ishonchli bog‘chalar, tajribali repetitorlar va to‘g‘ridan-to‘g‘ri muloqot, hammasi bir joyda.'}
          </motion.p>
        </div>
      </aside>

      {/* forma */}
      <main className="relative z-10 -mt-5 rounded-t-[28px] bg-bg px-5 pb-10 pt-8 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:rounded-none lg:px-12 lg:py-12">
        <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-[440px]">
          <motion.div variants={rise}>
            <h1 className="text-[28px] font-extrabold leading-tight text-primary lg:text-[32px]">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[15px] text-black/55">{subtitle}</p>}
          </motion.div>
          <div className="mt-6">{children}</div>
        </motion.div>
      </main>
    </div>
  );
}
