'use client';
import { motion } from 'framer-motion';

/**
 * "Mehrli maktub" sahnasi (original SVG illustratsiya): oqshom bog'chasi, bolalar kitob o'qiyapti,
 * uyadan uchib chiqayotgan maktub oyga yetib boradi. Barcha harakatlar yengil transform/opacity animatsiyalar.
 */
const fb = { transformBox: 'fill-box' as const };
const loop = (duration: number, delay = 0) => ({ duration, repeat: Infinity, ease: 'easeInOut' as const, delay });

function Star({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.path d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6 Z" fill="#E9C768" style={{ ...fb, originX: '50%', originY: '50%' }}
        animate={{ scale: [s * 0.5, s, s * 0.5], opacity: [0.35, 1, 0.35] }} transition={loop(3 + (d % 2), d)} />
    </g>
  );
}

function Cloud({ x, y, s = 1, d = 0, dur = 14 }: { x: number; y: number; s?: number; d?: number; dur?: number }) {
  return (
    <motion.g animate={{ x: [0, 40, 0] }} transition={loop(dur, d)}>
      <g transform={`translate(${x} ${y}) scale(${s})`} fill="#FBF8F0" opacity=".16">
        <ellipse cx="0" cy="0" rx="46" ry="16" /><ellipse cx="-22" cy="-10" rx="22" ry="16" /><ellipse cx="12" cy="-16" rx="26" ry="20" />
      </g>
    </motion.g>
  );
}

function Tree({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-8" y="-110" width="16" height="112" rx="6" fill="#A9744F" />
      <motion.g style={{ ...fb, originX: '50%', originY: '100%' }} animate={{ rotate: [-1.6, 1.6, -1.6] }} transition={loop(5, d)}>
        <circle cx="0" cy="-150" r="52" fill="#1F5640" />
        <circle cx="-34" cy="-122" r="36" fill="#2A6B4F" />
        <circle cx="36" cy="-122" r="36" fill="#2A6B4F" />
        <circle cx="4" cy="-176" r="30" fill="#3A8460" />
        <circle cx="-14" cy="-140" r="6" fill="#F4C7A8" /><circle cx="26" cy="-160" r="6" fill="#E9C768" /><circle cx="-30" cy="-118" r="5" fill="#E9C768" /><circle cx="30" cy="-120" r="5" fill="#F4C7A8" />
      </motion.g>
    </g>
  );
}

type KidProps = { x: number; y: number; skin: string; dress: string; hair: string; wave?: boolean; jump?: boolean; d?: number; girl?: boolean };
function Kid({ x, y, skin, dress, hair, wave, jump, d = 0, girl }: KidProps) {
  const body = (
    <g>
      {/* oyoqlar va poyabzal */}
      <rect x="-14" y="-28" width="10" height="26" rx="4" fill={skin} /><rect x="4" y="-28" width="10" height="26" rx="4" fill={skin} />
      <ellipse cx="-9" cy="0" rx="10" ry="5" fill="#245C43" /><ellipse cx="9" cy="0" rx="10" ry="5" fill="#245C43" />
      {/* qo'llar */}
      <motion.path d="M-16 -88 Q-34 -70 -30 -52" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      {wave ? (
        <motion.path d="M16 -88 Q34 -100 30 -122" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" style={{ ...fb, originX: '0%', originY: '100%' }} animate={{ rotate: [0, -22, 8, -22, 0] }} transition={loop(1.6, d)} />
      ) : <path d="M16 -88 Q34 -70 30 -52" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />}
      {/* kiyim */}
      <path d={girl ? 'M-26 -24 L-17 -94 Q0 -102 17 -94 L26 -24 Z' : 'M-22 -24 L-17 -94 Q0 -102 17 -94 L22 -24 Z'} fill={dress} />
      <path d="M-17 -94 Q0 -86 17 -94" stroke="#FBF8F0" strokeWidth="3" fill="none" opacity=".7" />
      {/* bosh */}
      <circle cx="0" cy="-120" r="26" fill={skin} />
      <path d="M-27 -122 Q-28 -150 0 -150 Q28 -150 27 -122 Q14 -138 0 -134 Q-14 -138 -27 -122Z" fill={hair} />
      {girl && <><circle cx="-28" cy="-122" r="8" fill={hair} /><circle cx="28" cy="-122" r="8" fill={hair} /></>}
      <circle cx="-9" cy="-118" r="2.6" fill="#333" /><circle cx="9" cy="-118" r="2.6" fill="#333" />
      <path d="M-7 -108 Q0 -101 7 -108" stroke="#333" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="-15" cy="-110" r="4" fill="#F4A58A" opacity=".55" /><circle cx="15" cy="-110" r="4" fill="#F4A58A" opacity=".55" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g animate={jump ? { y: [0, -26, 0] } : { y: [0, -3, 0] }} transition={loop(jump ? 1.1 : 3, d)}>{body}</motion.g>
    </g>
  );
}

const FLOWERS = [[60, 900, '#F4C7A8'], [130, 940, '#E9C768'], [215, 910, '#FBF8F0'], [585, 915, '#F4C7A8'], [660, 945, '#E9C768'], [735, 905, '#FBF8F0'], [30, 960, '#E9C768'], [770, 965, '#F4C7A8'], [290, 960, '#F4C7A8'], [520, 962, '#E9C768']] as const;

export default function Scene({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label="Bog‘cha oldida kitob o‘qiyotgan bolalar va oyga uchib ketayotgan maktub">
      <defs>
        <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14392A" /><stop offset=".55" stopColor="#1E5740" /><stop offset="1" stopColor="#3C8466" /></linearGradient>
        <radialGradient id="moon"><stop offset="0" stopColor="#FFF3C4" /><stop offset="1" stopColor="#E9C768" /></radialGradient>
        <radialGradient id="glow"><stop offset="0" stopColor="#E9C768" stopOpacity=".45" /><stop offset="1" stopColor="#E9C768" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="800" height="1000" fill="url(#sk)" />

      {/* yulduzlar */}
      {[[90, 120, 1, 0], [210, 70, .8, 1], [330, 150, .7, 2], [470, 60, 1, .5], [560, 140, .7, 1.5], [740, 90, .9, 2.2], [40, 260, .7, 1.2], [150, 330, .6, .4], [420, 260, .6, 2.4], [770, 330, .7, 1], [610, 40, .6, 1.8], [270, 20, .6, 2.8]].map(([x, y, s, d], i) => <Star key={i} x={x as number} y={y as number} s={s as number} d={d as number} />)}

      {/* oy */}
      <motion.circle cx="690" cy="250" r="120" fill="url(#glow)" animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }} style={{ ...fb, originX: '50%', originY: '50%' }} transition={loop(5)} />
      <circle cx="690" cy="250" r="50" fill="url(#moon)" />
      <circle cx="674" cy="238" r="9" fill="#E9C768" opacity=".35" /><circle cx="708" cy="266" r="6" fill="#E9C768" opacity=".35" /><circle cx="700" cy="226" r="4" fill="#E9C768" opacity=".3" />

      <Cloud x={160} y={400} s={1.2} dur={16} /><Cloud x={560} y={470} s={0.9} d={2} dur={19} /><Cloud x={360} y={330} s={0.7} d={1} dur={13} />

      {/* qushlar */}
      {[[250, 330, 0], [310, 300, 0.3]].map(([x, y, d], i) => (
        <motion.path key={i} d="M0 0 Q9 -10 18 0 Q27 -10 36 0" transform={`translate(${x} ${y})`} stroke="#FBF8F0" strokeOpacity=".7" strokeWidth="3" fill="none" strokeLinecap="round" style={{ ...fb, originY: '100%' }} animate={{ scaleY: [1, 0.45, 1] }} transition={loop(1.2, d as number)} />
      ))}

      {/* tepaliklar */}
      <path d="M0 650 C120 570 260 570 380 620 C500 670 650 570 800 610 V1000 H0Z" fill="#2E6F53" />
      <path d="M0 720 C150 660 300 710 420 700 C560 688 680 660 800 710 V1000 H0Z" fill="#3D8465" />

      {/* daraxtlar */}
      <Tree x={110} y={745} s={1.05} /><Tree x={705} y={735} s={0.95} d={1.4} />

      {/* bog'cha binosi */}
      <g>
        <ellipse cx="400" cy="722" rx="205" ry="14" fill="#14392A" opacity=".25" />
        {/* yon qanotlar */}
        <rect x="205" y="636" width="100" height="84" rx="6" fill="#FCEBDD" /><path d="M195 640 L255 590 L315 640Z" fill="#E9C768" stroke="#D6B04D" strokeWidth="2" strokeLinejoin="round" />
        <rect x="495" y="636" width="100" height="84" rx="6" fill="#FCEBDD" /><path d="M485 640 L545 590 L605 640Z" fill="#E9C768" stroke="#D6B04D" strokeWidth="2" strokeLinejoin="round" />
        <motion.rect x="237" y="660" width="36" height="34" rx="6" fill="#F4C7A8" animate={{ opacity: [0.75, 1, 0.75] }} transition={loop(3)} />
        <motion.rect x="527" y="660" width="36" height="34" rx="6" fill="#F4C7A8" animate={{ opacity: [1, 0.75, 1] }} transition={loop(3.4)} />
        {/* asosiy bino */}
        <rect x="455" y="500" width="22" height="50" rx="3" fill="#E4A985" />
        <rect x="300" y="560" width="200" height="160" rx="6" fill="#FBF8F0" />
        <path d="M278 568 L400 462 L522 568Z" fill="#F4C7A8" stroke="#E4A985" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="400" cy="518" r="20" fill="#FBF8F0" />
        <motion.path d="M400 530 c-14 -10 -14 -24 -4 -26 c4 -1 7 1 4 5 c-3 -4 0 -6 4 -5 c10 2 10 16 -4 26z" fill="#E4A985" style={{ ...fb, originX: '50%', originY: '50%' }} animate={{ scale: [1, 1.18, 1] }} transition={loop(1.8)} />
        {/* bayroqchalar */}
        <path d="M296 580 Q400 626 504 580" stroke="#245C43" strokeWidth="2" fill="none" />
        {[[0.1, '#E9C768'], [0.3, '#F4C7A8'], [0.5, '#8FAE98'], [0.7, '#E9C768'], [0.9, '#F4C7A8']].map(([t, c], i) => {
          const x = 296 + 208 * (t as number); const y = 580 + 90 * (t as number) * (1 - (t as number));
          return <path key={i} d={`M${x - 9} ${y} L${x + 9} ${y} L${x} ${y + 20}Z`} fill={c as string} />;
        })}
        {/* deraza va eshik */}
        {[326, 440].map((x) => (
          <g key={x}><motion.rect x={x} y="628" width="34" height="38" rx="6" fill="#E9C768" animate={{ opacity: [0.8, 1, 0.8] }} transition={loop(2.6, x / 300)} /><path d={`M${x + 17} 628 V666 M${x} 647 H${x + 34}`} stroke="#FBF8F0" strokeWidth="3" /></g>
        ))}
        <path d="M378 720 V668 a22 22 0 0 1 44 0 V720Z" fill="#245C43" /><circle cx="414" cy="696" r="2.8" fill="#E9C768" />
        <rect x="364" y="716" width="72" height="8" rx="3" fill="#E4A985" />
      </g>

      {/* uchib chiqayotgan maktub: uydan oyga */}
      <path d="M420 520 C480 440 560 380 700 270" stroke="#FBF8F0" strokeOpacity=".3" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
      <motion.g style={{ x: 420, y: 520 }} animate={{ x: [420, 458.7, 504.2, 558.2, 622.9, 700], y: [520, 473.8, 429.1, 382.5, 330.6, 270], opacity: [0, 1, 1, 1, 1, 0], scale: [0.5, 1, 1.1, 1.1, 0.9, 0.6], rotate: [-10, 6, -6, 8, -4, 6] }} transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}>
        <rect x="-18" y="-12" width="36" height="25" rx="4" fill="#FBF8F0" stroke="#E4A985" strokeWidth="1.5" />
        <path d="M-18 -10 L0 4 L18 -10" fill="#E9C768" stroke="#D6B04D" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M0 9 c-5 -4 -5 -9 -1 -9 c1 0 1 1 1 1 c0 0 0 -1 1 -1 c4 0 4 5 -1 9z" fill="#E4A985" transform="translate(0 2) scale(.9)" />
      </motion.g>

      {/* maysazor */}
      <path d="M0 790 C200 745 600 745 800 790 V1000 H0Z" fill="#8FAE98" />
      <path d="M0 850 C220 815 580 815 800 850 V1000 H0Z" fill="#7FA48A" />
      {FLOWERS.map(([x, y, c], i) => (
        <motion.g key={i} style={{ ...fb, originX: '50%', originY: '100%' }} animate={{ rotate: [-5, 5, -5] }} transition={loop(3 + (i % 3), i * 0.3)}>
          <path d={`M${x} ${y} V${y + 26}`} stroke="#245C43" strokeWidth="3" strokeLinecap="round" /><circle cx={x} cy={y} r="8" fill={c} /><circle cx={x} cy={y} r="3" fill="#E4A985" />
        </motion.g>
      ))}

      {/* bolalar */}
      <Kid x={200} y={880} skin="#F2C3A0" dress="#E9C768" hair="#5A3A2A" wave d={0.2} girl />
      <Kid x={612} y={872} skin="#D9A27F" dress="#F4C7A8" hair="#2F2A26" jump d={0.6} />
      <Kid x={352} y={896} skin="#F2C3A0" dress="#8FAE98" hair="#7A4B2E" d={0.1} />
      <Kid x={452} y={896} skin="#E4A985" dress="#FBF8F0" hair="#3A2A22" d={0.5} girl />
      {/* ochiq kitob */}
      <g>
        <path d="M312 838 V904 Q362 892 402 910 Q442 892 492 904 V838Z" fill="#F4C7A8" />
        <path d="M402 846 Q364 828 322 836 V896 Q364 888 402 904Z" fill="#FBF8F0" stroke="#E4A985" strokeWidth="2" />
        <path d="M402 846 Q440 828 482 836 V896 Q440 888 402 904Z" fill="#FCEBDD" stroke="#E4A985" strokeWidth="2" />
        <path d="M338 852 L388 858 M338 866 L388 872 M338 880 L388 886 M418 858 L468 852 M418 872 L468 866 M418 886 L468 880" stroke="#8FAE98" strokeWidth="3" strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <motion.path key={i} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z" fill="#E9C768" transform={`translate(${372 + i * 30} 828)`} style={{ ...fb, originX: '50%', originY: '50%' }} animate={{ y: [0, -46], opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }} transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }} />
        ))}
      </g>
    </svg>
  );
}
