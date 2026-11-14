'use client';
import { motion } from 'framer-motion';

/** stage: 'sending' — konvert tebranadi va aylanuvchi nuqtalar; 'flying' — maktub uchib chiqadi; 'sent' — konvert yopiq, yurakcha. */
export default function Envelope({ stage }: { stage: 'sending' | 'flying' | 'sent' }) {
  return (
    <div className="relative mx-auto h-40 w-52" aria-hidden>
      {stage === 'sending' && [0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute -right-1 top-3 h-2.5 w-2.5 rounded-full bg-sun" animate={{ y: [0, -14, 0], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} style={{ right: -4 + i * -14 }} />
      ))}
      <motion.svg viewBox="0 0 208 160" className="h-full w-full overflow-visible"
        animate={stage === 'sending' ? { rotate: [-2, 2, -2], y: [0, -3, 0] } : stage === 'sent' ? { y: [0, -4, 0] } : { y: 0 }}
        transition={{ duration: stage === 'sending' ? 0.9 : 3.5, repeat: Infinity, ease: 'easeInOut' }}>
        <ellipse cx="104" cy="150" rx="70" ry="7" fill="#245C43" opacity=".08" />
        <rect x="14" y="40" width="180" height="104" rx="14" fill="#FBF8F0" stroke="#E3EDE7" strokeWidth="2" />
        <motion.g initial={false} animate={stage === 'sending' ? { y: 18, opacity: 1 } : stage === 'flying' ? { y: [18, -46, -110], x: [0, 6, 26], rotate: [0, -4, 10], opacity: [1, 1, 0] } : { y: 18, opacity: 0 }} transition={stage === 'flying' ? { duration: 1, ease: 'easeInOut' } : { duration: 0.2 }}>
          <rect x="34" y="34" width="140" height="90" rx="8" fill="#fff" stroke="#D9E8DF" strokeWidth="2" />
          <path d="M50 56 H112" stroke="#245C43" strokeWidth="5" strokeLinecap="round" /><path d="M50 74 H156 M50 88 H140 M50 102 H150" stroke="#8FAE98" strokeWidth="4" strokeLinecap="round" />
        </motion.g>
        <path d="M14 56 L104 120 L194 56 L194 130 Q194 144 180 144 L28 144 Q14 144 14 130 Z" fill="#F7EBD9" />
        <path d="M14 56 L104 120 L194 56" fill="none" stroke="#E4A985" strokeWidth="2" strokeLinejoin="round" />
        <motion.path d="M14 54 Q14 40 28 40 L180 40 Q194 40 194 54 L104 112 Z" fill="#E9C768" stroke="#D6B04D" strokeWidth="2" strokeLinejoin="round"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }} initial={false}
          animate={{ scaleY: stage === 'sent' ? 1 : -0.9 }} transition={{ duration: 0.45, ease: 'easeInOut', delay: stage === 'sent' ? 0.1 : 0 }} />
        {stage === 'sent' && <motion.path d="M104 78 c-6 -8 -18 -2 -11 7 l11 10 l11 -10 c7 -9 -5 -15 -11 -7z" fill="#E4A985" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }} />}
      </motion.svg>
    </div>
  );
}
