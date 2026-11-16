'use client';
import { motion } from 'framer-motion';
import { Delete, Fingerprint } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

/** PIN kiritish paneli: nuqtalar, raqamlar klaviaturasi, xatoda silkinish, ixtiyoriy barmoq izi tugmasi. */
export default function PinPad({ length, title, subtitle, error, shake = 0, disabled, onComplete, onBio, footer }: {
  length: number; title: string; subtitle?: string; error?: string; shake?: number; disabled?: boolean;
  onComplete: (pin: string) => void; onBio?: () => void; footer?: ReactNode;
}) {
  const [v, setV] = useState('');
  const ref = useRef('');
  const set = (n: string) => { ref.current = n; setV(n); };
  const press = (d: string) => {
    if (disabled || ref.current.length >= length) return;
    const n = ref.current + d;
    set(n);
    if (n.length === length) setTimeout(() => onComplete(n), 90);
  };
  const back = () => set(ref.current.slice(0, -1));
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') back(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  useEffect(() => { set(''); }, [shake]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = 'h-[60px] rounded-2xl bg-white text-[24px] font-extrabold text-[#14392A] shadow-card transition active:scale-95 active:bg-primary-50 disabled:opacity-40';
  return (
    <div className="mx-auto flex w-full max-w-[320px] flex-col items-center text-center">
      <h1 className="text-[22px] font-extrabold text-[#14392A]">{title}</h1>
      {subtitle && <p className="mt-1 text-[14px] leading-snug text-black/55">{subtitle}</p>}
      <motion.div key={shake} animate={shake ? { x: [0, -12, 12, -9, 9, -4, 4, 0] } : {}} transition={{ duration: 0.45 }} className="my-6 flex h-5 items-center gap-4" aria-label={`${v.length} / ${length}`}>
        {Array.from({ length }).map((_, i) => <span key={i} className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${i < v.length ? (error ? 'scale-110 border-red-500 bg-red-500' : 'scale-110 border-primary bg-primary') : 'border-primary/35 bg-transparent'}`} />)}
      </motion.div>
      <p role="alert" className="mb-3 min-h-[20px] text-[13.5px] font-semibold text-red-600">{error}</p>
      <div className="grid w-full grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} type="button" disabled={disabled} onClick={() => press(d)} className={key}>{d}</button>)}
        {onBio ? <button type="button" onClick={onBio} aria-label="Barmoq izi bilan ochish" className="grid h-[60px] place-items-center rounded-2xl text-primary transition active:scale-95"><Fingerprint size={32} /></button> : <span />}
        <button type="button" disabled={disabled} onClick={() => press('0')} className={key}>0</button>
        <button type="button" onClick={back} aria-label="O‘chirish" className="grid h-[60px] place-items-center rounded-2xl text-black/50 transition active:scale-95"><Delete size={26} /></button>
      </div>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}
