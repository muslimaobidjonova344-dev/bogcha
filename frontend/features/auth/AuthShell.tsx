'use client';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } };
export const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

export const riseIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } as const;

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Kichkintoy bosh sahifa">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
        <path d="M24 20c-6-5-14-4-19-1v21c5-3 13-4 19 1 6-5 14-4 19-1V19c-5-3-13-4-19 1z" fill="#245C43" />
        <path d="M24 22v17" stroke="#FBF8F0" strokeWidth="2" strokeLinecap="round" />
        <path d="M24 17c0-6 3-10 9-11 0 6-3 10-9 11z" fill="#8FAE98" />
        <path d="M24 17c0-5-3-8-8-9 0 5 3 8 8 9z" fill="#E9C768" />
      </svg>
      <span className="text-[22px] font-extrabold tracking-tight text-primary">Kichkintoy</span>
    </Link>
  );
}

export function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = ['Rol tanlash', 'Ma‘lumotlar', 'Tasdiqlash'];
  return (
    <ol className="mb-7 flex items-center justify-between gap-2 text-[13px] sm:text-[14px]" aria-label="Bosqichlar">
      {items.map((t, i) => {
        const n = i + 1; const done = n < step; const on = n === step;
        return (
          <li key={t} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={on ? 'step' : undefined}>
            <motion.span layout className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold transition-colors ${done || on ? 'bg-primary text-white' : 'bg-primary-50 text-black/45'}`}>
              {done ? <Check size={15} strokeWidth={3.5} /> : n}
            </motion.span>
            <span className={`whitespace-nowrap font-semibold ${on ? 'text-primary' : done ? 'text-primary/70' : 'text-black/40'} ${on ? '' : 'hidden sm:inline'}`}>{t}</span>
            {i < items.length - 1 && <span className={`h-px min-w-3 flex-1 border-t-2 border-dotted ${done ? 'border-primary/50' : 'border-black/15'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

const BENEFITS = ['Ishonchli bog‘chalar', 'Malakali repetitorlar', 'Qulay ariza va kuzatuv'];

function Hero() {
  return (
    <>
      {/* desktop: chap panel */}
      <div className="relative hidden h-full flex-col justify-between py-10 lg:flex">
        <Logo />
        <div className="mt-14">
          <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-[520px] text-[44px] font-extrabold leading-[1.12] tracking-tight text-[#14392A]">
            Farzandingiz uchun eng yaxshi ta‘lim imkoniyatlari!
          </motion.h2>
          <ul className="mt-7 space-y-3.5">
            {BENEFITS.map((b, i) => (
              <motion.li key={b} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12 }} className="flex items-center gap-3 text-[17px] font-semibold text-[#14392A]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white"><Check size={16} strokeWidth={3.5} /></span>{b}
              </motion.li>
            ))}
          </ul>
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }} className="relative mt-10 w-full max-w-[540px] overflow-hidden rounded-[32px] shadow-[0_30px_60px_-24px_rgba(20,57,42,.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auth/hero-kids.jpg" alt="Kulib turgan bolalar" className="aspect-[5/4] w-full object-cover object-top" />
          <motion.svg aria-hidden viewBox="0 0 64 64" className="absolute right-6 top-6 h-14 w-14" animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <path d="M6 30 58 6 40 58 30 38z" fill="#fff" stroke="#E3EDE7" strokeWidth="2" strokeLinejoin="round" /><path d="M30 38 58 6" stroke="#8FAE98" strokeWidth="2" />
          </motion.svg>
        </motion.div>
      </div>
      {/* mobil: ixcham tepa qism */}
      <div className="relative lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/auth/hero-kids.jpg" alt="" aria-hidden className="h-[210px] w-full object-cover object-[50%_25%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#14392A]/55 via-transparent to-transparent" />
        <div className="absolute left-5 top-4 [&_span]:text-white"><Logo /></div>
      </div>
    </>
  );
}


function Float({ src, className, rot = 0, delay = 0, round = 'rounded-3xl', pad = 'p-2' }: { src: string; className: string; rot?: number; delay?: number; round?: string; pad?: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + delay * 0.12, duration: 0.5 }} className={`absolute ${className}`}>
      <motion.div animate={{ y: [0, -9, 0], rotate: [rot, rot + 1.5, rot] }} transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut' }}
        className={`overflow-hidden bg-white shadow-[0_18px_40px_-18px_rgba(20,57,42,.45)] ring-1 ring-black/5 ${round} ${pad}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden className={`h-full w-full object-cover ${round}`} />
      </motion.div>
    </motion.div>
  );
}

/** Faqat keng ekranlarda: karta atrofidagi mavzuli rasmlar (bog'cha, bolalar, oila, repetitor, xat). */
function Decor() {
  return (
    <div aria-hidden className="pointer-events-none hidden min-[1360px]:block">
      <Float src="/auth/role_school.png" className="right-full top-6 mr-10 h-40 w-44" rot={-5} delay={0} />
      <Float src="/auth/hero-kids.jpg" className="right-full top-[260px] mr-14 h-48 w-56" rot={4} delay={1} />
      <Float src="/auth/env_open.png" className="right-full top-[500px] mr-6 h-32 w-36" rot={-3} delay={2} round="rounded-full" pad="p-3" />
      <Float src="/auth/role_parent.png" className="left-full top-10 ml-10 h-40 w-44" rot={5} delay={1} />
      <Float src="/auth/role_tutor.png" className="left-full top-[250px] ml-14 h-44 w-44" rot={-4} delay={2} />
      <Float src="/auth/lock.png" className="left-full top-[490px] ml-8 h-32 w-44" rot={3} delay={0} />
      <motion.svg viewBox="0 0 40 40" className="absolute -left-8 -top-6 h-10 w-10" animate={{ rotate: [0, 20, 0] }} transition={{ duration: 6, repeat: Infinity }}><path d="M20 2l5 13 13 5-13 5-5 13-5-13L2 20l13-5z" fill="#E9C768" /></motion.svg>
      <motion.svg viewBox="0 0 40 40" className="absolute -bottom-6 -right-8 h-8 w-8" animate={{ rotate: [0, -20, 0] }} transition={{ duration: 7, repeat: Infinity }}><path d="M20 2l5 13 13 5-13 5-5 13-5-13L2 20l13-5z" fill="#F4C7A8" /></motion.svg>
    </div>
  );
}

/** variant="hero": login (chapda foto va afzalliklar, o'ngda suzuvchi karta). variant="card": markazdagi premium karta. */
export default function AuthShell({ children, title, subtitle, variant = 'card', wide, step, emoji, side }: { children: ReactNode; title?: string; subtitle?: string; variant?: 'hero' | 'card'; wide?: boolean; step?: 1 | 2 | 3; emoji?: string; side?: string }) {
  const head = title && (
    <motion.div variants={rise} className="mb-5 text-center">
      <h1 className="text-[26px] font-extrabold leading-tight text-[#14392A] sm:text-[28px]">{title} {emoji}</h1>
      {subtitle && <p className="mx-auto mt-2 max-w-[360px] text-[14.5px] leading-snug text-black/55">{subtitle}</p>}
    </motion.div>
  );
  const body = (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {step && <Stepper step={step} />}
      {head}
      {children}
    </motion.div>
  );

  if (variant === 'hero') {
    return (
      <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_0%_0%,#E4EEDF,transparent),radial-gradient(900px_500px_at_100%_100%,#F9E7D6,transparent)] bg-bg">
        <div className="mx-auto grid min-h-screen max-w-[1360px] lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-16 lg:px-12">
          <Hero />
          <main className="relative z-10 -mt-6 px-4 pb-10 lg:mt-0 lg:flex lg:items-center lg:px-0 lg:pb-0">
            <div className="w-full rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_30px_70px_-30px_rgba(20,57,42,.35)] backdrop-blur sm:p-9">{body}</div>
          </main>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col items-center overflow-hidden bg-[radial-gradient(900px_500px_at_50%_-10%,#E4EEDF,transparent),radial-gradient(700px_400px_at_100%_100%,#F9E7D6,transparent)] bg-bg px-4 py-8 sm:py-12">
      <Logo className="mb-6" />
      <div className={`relative w-full ${wide ? 'max-w-[760px]' : 'max-w-[480px]'}`}>
        <Decor />
        <div className="relative rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_30px_70px_-30px_rgba(20,57,42,.35)] sm:p-10">{body}</div>
      </div>
    </div>
  );
}
