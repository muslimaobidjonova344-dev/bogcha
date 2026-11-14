'use client';
import { motion } from 'framer-motion';

/** "Mehrli maktub" illustratsiyasi: ochiladigan maktub, kitob, barglar va yulduzchalar. Yengil SVG + transform animatsiyalar. */
const fb = { transformBox: 'fill-box' as const };

function Star({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <motion.path
      d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z"
      fill="#E9C768"
      style={{ ...fb, translateX: x, translateY: y, originX: '50%', originY: '50%' }}
      animate={{ scale: [s * 0.6, s * 1.15, s * 0.6], opacity: [0.5, 1, 0.5], rotate: [0, 20, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, delay: d, ease: 'easeInOut' }}
    />
  );
}

function Leaf({ x, y, r, c, d = 0 }: { x: number; y: number; r: number; c: string; d?: number }) {
  return (
    <motion.g style={{ ...fb, translateX: x, translateY: y, originX: '0%', originY: '100%' }} initial={{ rotate: r }}
      animate={{ rotate: [r - 5, r + 6, r - 5] }} transition={{ duration: 5 + d, repeat: Infinity, ease: 'easeInOut', delay: d }}>
      <path d="M0 0 C-22 -18 -22 -52 0 -70 C22 -52 22 -18 0 0 Z" fill={c} />
      <path d="M0 0 L0 -58" stroke="#245C43" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </motion.g>
  );
}

export default function Illustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 420" className={className} role="img" aria-label="Ochilayotgan maktub, kitob va yashil barglar">
      {/* yumshoq fon doiralari */}
      <motion.circle cx="260" cy="215" r="170" fill="#FBF8F0" fillOpacity=".10" animate={{ scale: [1, 1.04, 1] }} style={fb} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <circle cx="260" cy="215" r="120" fill="#FBF8F0" fillOpacity=".08" />

      {/* barglar (orqa) */}
      <g>
        <Leaf x={92} y={330} r={-35} c="#8FAE98" />
        <Leaf x={92} y={330} r={5} c="#6F9A82" d={0.6} />
        <Leaf x={430} y={335} r={30} c="#8FAE98" d={0.3} />
        <Leaf x={430} y={335} r={-8} c="#6F9A82" d={0.9} />
      </g>

      {/* maktub + kitob: suzib yuradi */}
      <motion.g animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        {/* kitob */}
        <g transform="translate(120 300)">
          <path d="M0 20 L140 0 L140 70 L0 90 Z" fill="#F4C7A8" />
          <path d="M0 20 L-14 28 L-14 98 L0 90 Z" fill="#E4A985" />
          <path d="M140 0 L270 22 L270 92 L140 70 Z" fill="#FCEBDD" />
          <path d="M140 0 L140 70" stroke="#E4A985" strokeWidth="2" />
          <path d="M20 34 L120 20 M20 48 L120 34 M20 62 L120 48" stroke="#E4A985" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
          <path d="M160 24 L250 38 M160 38 L250 52 M160 52 L250 66" stroke="#F4C7A8" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* konvert tanasi */}
        <g transform="translate(150 175)">
          <rect x="0" y="40" width="220" height="140" rx="14" fill="#FBF8F0" />
          <path d="M0 54 L110 128 L220 54 L220 166 Q220 180 206 180 L14 180 Q0 180 0 166 Z" fill="#F4C7A8" fillOpacity=".55" />

          {/* maktub qog'ozi: konvertdan chiqib turadi */}
          <motion.g animate={{ y: [14, -34, -34, 14] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.28, 0.75, 1], ease: 'easeInOut' }}>
            <rect x="26" y="28" width="168" height="118" rx="10" fill="#fff" stroke="#E3EDE7" strokeWidth="2" />
            <path d="M46 56 H150" stroke="#245C43" strokeWidth="5" strokeLinecap="round" />
            <path d="M46 78 H174 M46 94 H160 M46 110 H168" stroke="#8FAE98" strokeWidth="4" strokeLinecap="round" />
            <path d="M158 128 c-6 -7 -16 -2 -10 6 l10 9 l10 -9 c6 -8 -4 -13 -10 -6z" fill="#F4C7A8" transform="translate(0 -2)" />
          </motion.g>

          {/* old qismi */}
          <path d="M0 78 L110 150 L220 78 L220 166 Q220 180 206 180 L14 180 Q0 180 0 166 Z" fill="#F7EBD9" />
          <path d="M0 78 L110 150 L220 78" fill="none" stroke="#E4A985" strokeWidth="2" strokeLinejoin="round" />

          {/* qopqoq: ochiladi va yopiladi */}
          <motion.path d="M0 54 Q0 40 14 40 L206 40 Q220 40 220 54 L110 128 Z" fill="#E9C768" stroke="#D6B04D" strokeWidth="2" strokeLinejoin="round"
            style={{ ...fb, originX: '50%', originY: '0%' }}
            animate={{ scaleY: [1, -0.9, -0.9, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.22, 0.78, 1], ease: 'easeInOut' }} />
        </g>
        {/* yurakcha muhr */}
        <motion.g style={{ ...fb, originX: '50%', originY: '50%' }} animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
          <circle cx="260" cy="236" r="0" />
        </motion.g>
      </motion.g>

      {/* oldingi barglar */}
      <Leaf x={70} y={392} r={-20} c="#245C43" d={0.2} />
      <Leaf x={455} y={396} r={22} c="#245C43" d={0.5} />

      {/* yulduzchalar */}
      <Star x={70} y={90} s={1.1} />
      <Star x={440} y={70} s={0.9} d={0.8} />
      <Star x={395} y={150} s={0.6} d={1.6} />
      <Star x={130} y={170} s={0.7} d={2.1} />
      <Star x={260} y={44} s={0.8} d={1.2} />
      <Star x={485} y={230} s={0.6} d={0.4} />
    </svg>
  );
}
