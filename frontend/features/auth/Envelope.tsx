'use client';
import { motion } from 'framer-motion';

const dot = (i: number) => (
  <motion.span key={i} className="h-2.5 w-2.5 rounded-full bg-primary" animate={{ opacity: [0.25, 1, 0.25], y: [0, -5, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }} />
);
const rays = [0, 1, 2, 3, 4, 5, 6, 7];

/** 'sending': yopiq konvert tebranadi + nuqtalar; 'flying': konvert ochilib maktub chiqadi; 'sent': ochiq konvert, nurlar. */
export default function Envelope({ stage }: { stage: 'sending' | 'flying' | 'sent' }) {
  const open = stage !== 'sending';
  return (
    <div className="relative mx-auto h-44 w-56" aria-hidden>
      {stage === 'sent' && rays.map((i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2 h-3 w-1 rounded-full bg-sun" style={{ rotate: i * 45 }}
          initial={{ opacity: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 0], x: Math.sin((i * Math.PI) / 4) * 100, y: -Math.cos((i * Math.PI) / 4) * 78 }} transition={{ delay: 0.15, duration: 1.1, ease: 'easeOut' }} />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src="/auth/env_closed.png" alt="" className="absolute inset-x-0 top-6 mx-auto w-44" initial={false}
        animate={open ? { opacity: 0, scale: 0.7, y: -10 } : { opacity: 1, scale: 1, y: [0, -6, 0], rotate: [-2, 2, -2] }}
        transition={open ? { duration: 0.35 } : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src="/auth/env_open.png" alt="" className="absolute inset-x-0 top-2 mx-auto w-48" initial={false}
        animate={open ? { opacity: 1, scale: stage === 'flying' ? [0.7, 1.12, 1] : 1, rotate: stage === 'flying' ? [-8, 4, 0] : 0, y: stage === 'sent' ? [0, -5, 0] : 0 } : { opacity: 0, scale: 0.7 }}
        transition={stage === 'sent' ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.7, ease: 'easeOut' }} />
      {stage === 'sending' && <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2">{[0, 1, 2].map(dot)}</div>}
    </div>
  );
}

/** Rasmli "pop" ko'rinish (galochka, clipboard, qulf): sakrab chiqadi va nurlanadi. */
export function PopImage({ src, className = 'w-32' }: { src: string; className?: string }) {
  return (
    <motion.div className="relative mx-auto flex justify-center" initial={{ scale: 0.4, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src={src} alt="" className={className} animate={{ y: [0, -5, 0] }} transition={{ delay: 0.6, duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
    </motion.div>
  );
}
