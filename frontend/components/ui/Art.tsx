'use client';
import { ReactNode, useId, useMemo } from 'react';

/* Har bir bog'cha, repetitor va foydalanuvchi uchun noyob (id/nomga qarab) rasm yaratadi.
   Rasm yuklanmagan bo'lsa shu ko'rinadi, shuning uchun hamma karta bir-biridan farq qiladi. */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** "[DEMO] " kabi qoldiq belgilarni olib tashlaydi (eski yozuvlar uchun xavfsizlik). */
export const cleanName = (n?: string | null) => (n || '').replace(/^\s*\[DEMO\]\s*/i, '').replace(/\s*\(DEMO[^)]*\)\s*$/i, '').trim();

const SKY = [['#CFE8F7', '#FFF6DC'], ['#FFE1D0', '#FFF4D8'], ['#D6EEDC', '#F8F4DF'], ['#E6DDF6', '#FFEBDD'], ['#CBEBEA', '#F4F8E0'], ['#FBD8DA', '#FFF2D2'], ['#DDE9FB', '#FDF1E2'], ['#E8F1CF', '#FFF6E1']];
const WALL = ['#F4C7A8', '#E9C768', '#8FAE98', '#E28E73', '#9CC5E8', '#C9A7E6', '#F2A7A7', '#A8D5BA'];
const ROOF = ['#245C43', '#B5533C', '#3F6FA8', '#7A4EA3', '#C2791F', '#2C7A7B'];
const GRASS = ['#8FC79B', '#9CCB85', '#7FBF9F', '#A5D18B', '#86C7B0'];

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity=".92"><ellipse cx="0" cy="0" rx="26" ry="11" /><ellipse cx="-14" cy="-6" rx="13" ry="10" /><ellipse cx="8" cy="-9" rx="15" ry="12" /></g>
);
const Sun = ({ x, y, c = '#F6C945' }: { x: number; y: number; c?: string }) => (
  <g transform={`translate(${x} ${y})`}>{Array.from({ length: 10 }).map((_, i) => <rect key={i} x="-2" y="-34" width="4" height="10" rx="2" fill={c} opacity=".7" transform={`rotate(${i * 36})`} />)}<circle r="19" fill={c} /></g>
);
const Tree = ({ x, y, s = 1, c = '#4E9A6B' }: { x: number; y: number; s?: number; c?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-4" y="-6" width="8" height="26" rx="3" fill="#9A6B45" /><circle cx="0" cy="-22" r="22" fill={c} /><circle cx="-14" cy="-10" r="14" fill={c} opacity=".9" /><circle cx="14" cy="-10" r="14" fill={c} opacity=".9" /></g>
);
const Flower = ({ x, y, c }: { x: number; y: number; c: string }) => (<g transform={`translate(${x} ${y})`}><rect x="-1" y="0" width="2" height="12" fill="#4E9A6B" />{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx="0" cy="-5" r="3.2" fill={c} transform={`rotate(${a})`} />)}<circle cy="0" r="2" fill="#F6C945" /></g>);
const Kid = ({ x, y, c, skin = '#F2C9A5' }: { x: number; y: number; c: string; skin?: string }) => (<g transform={`translate(${x} ${y})`}><circle cy="-30" r="9" fill={skin} /><path d="M-9 -34 Q0 -46 9 -34 Q4 -38 -9 -34Z" fill="#5A3B2A" /><path d="M-11 -18 H11 L14 8 H-14Z" fill={c} /><rect x="-9" y="8" width="6" height="14" rx="3" fill="#41506B" /><rect x="3" y="8" width="6" height="14" rx="3" fill="#41506B" /></g>);

/* ---------------- Bog'cha sahnalari ---------------- */
function SceneHouse(r: () => number, p: { wall: string; roof: string }) {
  return (<g>
    <rect x="120" y="92" width="160" height="88" rx="6" fill={p.wall} />
    <path d="M108 96 L200 44 L292 96Z" fill={p.roof} /><rect x="240" y="52" width="16" height="30" fill={p.roof} opacity=".85" />
    <rect x="182" y="126" width="36" height="54" rx="18" fill="#7A4E32" /><circle cx="210" cy="154" r="2.5" fill="#F6C945" />
    {[[138, 112], [236, 112]].map(([x, y], i) => <g key={i}><rect x={x} y={y} width="30" height="26" rx="4" fill="#E9F5FB" stroke="#fff" strokeWidth="3" /><path d={`M${x + 15} ${y}V${y + 26}M${x} ${y + 13}H${x + 30}`} stroke="#fff" strokeWidth="2" /></g>)}
    <path d="M200 66 l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#F6C945" />
    {[...Array(4)].map((_, i) => <Flower key={i} x={96 + i * 18 + r() * 6} y={168 + r() * 8} c={['#E56B8A', '#F6C945', '#fff', '#B58AE0'][i]} />)}
    {[...Array(3)].map((_, i) => <Flower key={i} x={296 + i * 20 + r() * 6} y={170 + r() * 6} c={['#fff', '#E56B8A', '#F6C945'][i]} />)}
  </g>);
}
function ScenePlayground(r: () => number, p: { wall: string; roof: string }) {
  return (<g>
    <Tree x={66} y={150} s={1.1} />
    <g><path d="M170 60 V170 M230 60 V170" stroke={p.roof} strokeWidth="6" strokeLinecap="round" /><path d="M170 60 H230" stroke={p.roof} strokeWidth="6" strokeLinecap="round" /><path d="M230 70 L318 150 H338" stroke={p.wall} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M182 74 V164" stroke="#fff" strokeWidth="2" opacity=".6" />{[0, 1, 2, 3].map((i) => <path key={i} d={`M172 ${86 + i * 20} H228`} stroke="#fff" strokeWidth="3" opacity=".7" />)}</g>
    <g stroke="#7A5A3A" strokeWidth="3"><path d="M352 70 V168 M392 70 V168 M352 70 H392" fill="none" strokeLinecap="round" /><path d="M362 70 V128 M382 70 V128" /></g><rect x="356" y="126" width="30" height="7" rx="3" fill={p.wall} />
    <Kid x={210} y={166} c="#E28E73" /><Kid x={34} y={176} c="#5B9BD5" skin="#E7B58B" />
  </g>);
}
function SceneBlocks(r: () => number, p: { wall: string; roof: string }) {
  const cols = ['#E56B8A', '#F6C945', '#5B9BD5', '#7BC79A', '#B58AE0', '#F2A65A'];
  const L = ['A', 'B', 'C', '1', '2', '3'];
  const base = Math.floor(r() * 6);
  return (<g>
    {[[120, 150, 0], [170, 150, 1], [220, 150, 2], [145, 104, 3], [195, 104, 4], [170, 58, 5]].map(([x, y, i]: any) => <g key={i}><rect x={x} y={y} width="46" height="46" rx="8" fill={cols[(i + base) % 6]} /><rect x={x} y={y} width="46" height="10" rx="5" fill="#fff" opacity=".25" /><text x={x + 23} y={y + 33} textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">{L[(i + base) % 6]}</text></g>)}
    <g transform="translate(330 70)"><ellipse rx="22" ry="28" fill={p.roof} /><path d="M0 28 L-4 36 H4Z" fill={p.roof} /><path d="M0 36 Q-8 60 6 84" stroke="#555" strokeWidth="1.5" fill="none" /><ellipse cx="-8" cy="-10" rx="5" ry="8" fill="#fff" opacity=".4" /></g>
    <g transform="translate(70 110)"><ellipse rx="18" ry="23" fill={p.wall} /><path d="M0 23 L-3 30 H3Z" fill={p.wall} /><path d="M0 30 Q6 56 -4 76" stroke="#555" strokeWidth="1.5" fill="none" /></g>
  </g>);
}
function SceneRainbow(r: () => number, p: { wall: string; roof: string }) {
  const rb = ['#E56B8A', '#F2A65A', '#F6C945', '#7BC79A', '#5B9BD5'];
  return (<g>
    {rb.map((c, i) => <path key={c} d={`M${100 + i * 12} 176 A${100 - i * 12} ${100 - i * 12} 0 0 1 ${300 - i * 12} 176`} fill="none" stroke={c} strokeWidth="11" opacity=".9" />)}
    <Tree x={340} y={150} s={1.1} c="#5BA878" /><Tree x={56} y={156} s={0.9} />
    <Kid x={170} y={178} c={p.roof} /><Kid x={214} y={178} c={p.wall} skin="#E7B58B" />
    <Cloud x={100} y={64} s={1.1} /><Cloud x={300} y={52} />
  </g>);
}
function SceneBus(r: () => number, p: { wall: string; roof: string }) {
  return (<g>
    <path d="M0 168 Q90 120 200 150 T400 140 V200 H0Z" fill="#7FBF9F" opacity=".65" />
    <rect x="96" y="104" width="208" height="62" rx="14" fill="#F6C945" /><rect x="96" y="150" width="208" height="8" fill="#E0AB1F" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={112 + i * 42} y="114" width="32" height="26" rx="5" fill="#E9F5FB" />)}
    <rect x="262" y="114" width="34" height="38" rx="5" fill="#CFE8F7" />
    {[148, 256].map((x) => <g key={x}><circle cx={x} cy="168" r="14" fill="#33415C" /><circle cx={x} cy="168" r="6" fill="#B9C2D3" /></g>)}
    <path d="M0 184 H400" stroke="#7A8794" strokeWidth="14" /><path d="M10 184 H390" stroke="#fff" strokeWidth="2" strokeDasharray="14 12" />
    <Tree x={52} y={146} s={0.95} c="#4E9A6B" /><Tree x={352} y={142} s={0.8} c="#5BA878" />
    <rect x="150" y="82" width="100" height="18" rx="9" fill={p.roof} /><text x="200" y="95" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">MAKTABGACHA</text>
  </g>);
}
function SceneTent(r: () => number, p: { wall: string; roof: string }) {
  return (<g>
    <path d="M110 176 L200 56 L290 176Z" fill={p.wall} /><path d="M200 56 L236 176 H290Z" fill={p.roof} opacity=".35" />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${200} 56 L${120 + i * 40} 176`} stroke="#fff" strokeWidth="2.5" opacity=".55" />)}
    <path d="M200 56 V34" stroke="#555" strokeWidth="3" /><path d="M200 34 L226 42 L200 50Z" fill={p.roof} />
    <path d="M180 176 Q200 128 220 176Z" fill="#33415C" opacity=".75" />
    {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={60 + i * 56} cy={64 + (i % 2) * 14} r="3" fill="#fff" opacity=".8" />)}
    <Kid x={90} y={178} c="#5B9BD5" /><Kid x={316} y={178} c="#E56B8A" skin="#E7B58B" />
  </g>);
}
const KG_SCENES = [SceneHouse, ScenePlayground, SceneBlocks, SceneRainbow, SceneBus, SceneTent];

/* ---------------- Repetitor sahnalari ---------------- */
const BOOKS = ['#E56B8A', '#5B9BD5', '#F2A65A', '#7BC79A', '#B58AE0', '#F6C945', '#E28E73'];
function symbolFor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('matem')) return 'x² + y² = r²';
  if (l.includes('ingliz') || l.includes('english')) return 'ABC · Hello!';
  if (l.includes('fizika')) return 'E = mc²';
  if (l.includes('dastur') || l.includes('inform')) return '</> code';
  if (l.includes('kimyo')) return 'H₂O · NaCl';
  if (l.includes('biolog')) return 'DNA · ATP';
  if (l.includes('tayyor')) return 'A B C 1 2 3';
  if (l.includes('rus')) return 'А Б В Г Д';
  return '2 + 2 = 4';
}
function SceneShelf(r: () => number, label: string) {
  return (<g>
    <rect x="52" y="152" width="296" height="10" rx="3" fill="#9A6B45" />
    {[...Array(9)].map((_, i) => { const h = 50 + Math.floor(r() * 44); const x = 64 + i * 26; return <g key={i}><rect x={x} y={152 - h} width="22" height={h} rx="3" fill={BOOKS[(i + Math.floor(r() * 7)) % 7]} /><rect x={x + 4} y={152 - h + 8} width="14" height="3" rx="1.5" fill="#fff" opacity=".6" /></g>; })}
    <g transform="translate(318 100)"><path d="M-16 52 H16 L10 30 H-10Z" fill="#8C6A4A" /><path d="M0 30 V-8" stroke="#555" strokeWidth="4" /><path d="M-22 -6 L0 -26 L22 -6Z" fill="#F6C945" /><path d="M-22 -6 L-34 14 M22 -6 L34 14" stroke="#F6C945" strokeWidth="2" opacity=".5" /></g>
    <g transform="translate(60 50)"><circle r="20" fill="#fff" stroke="#245C43" strokeWidth="4" /><path d="M0 0 V-11 M0 0 L8 5" stroke="#245C43" strokeWidth="3" strokeLinecap="round" /></g>
    <text x="200" y="40" textAnchor="middle" fontSize="15" fontWeight="800" fill="#245C43" opacity=".8">{symbolFor(label)}</text>
  </g>);
}
function SceneBoard(r: () => number, label: string) {
  return (<g>
    <rect x="62" y="34" width="276" height="124" rx="10" fill="#8C6A4A" /><rect x="72" y="44" width="256" height="104" rx="6" fill="#2F6B50" />
    <text x="200" y="102" textAnchor="middle" fontSize="26" fontWeight="800" fill="#F4F1E6">{symbolFor(label)}</text>
    <path d="M90 126 Q140 118 190 128 T300 124" stroke="#F4F1E6" strokeWidth="2" opacity=".6" fill="none" strokeLinecap="round" />
    <rect x="62" y="158" width="276" height="8" rx="3" fill="#7A5A3A" /><rect x="262" y="152" width="22" height="6" rx="2" fill="#fff" /><rect x="292" y="152" width="14" height="6" rx="2" fill="#E9C768" />
    <g transform="translate(96 150)"><circle r="11" fill="#E0463C" /><path d="M0 -10 q2 -9 9 -10" stroke="#4E9A6B" strokeWidth="3" fill="none" strokeLinecap="round" /></g>
  </g>);
}
function SceneDesk(r: () => number, label: string) {
  return (<g>
    <rect x="40" y="148" width="320" height="12" rx="4" fill="#9A6B45" /><rect x="64" y="160" width="10" height="30" fill="#7A5A3A" /><rect x="326" y="160" width="10" height="30" fill="#7A5A3A" />
    <g transform="translate(150 96)"><rect width="110" height="52" rx="6" fill="#33415C" /><rect x="6" y="6" width="98" height="40" rx="3" fill="#CFE8F7" /><text x="55" y="31" textAnchor="middle" fontSize="13" fontWeight="800" fill="#245C43">{symbolFor(label).split(' ')[0]}</text><path d="M-14 52 H124 L116 60 H-6Z" fill="#B9C2D3" /></g>
    <g transform="translate(300 126)"><path d="M-12 0 H12 L9 22 H-9Z" fill="#E56B8A" /><path d="M12 6 q9 0 9 8 q0 7 -9 7" stroke="#E56B8A" strokeWidth="3" fill="none" /><path d="M-4 -4 q-3 -8 3 -12 M4 -4 q-3 -8 3 -12" stroke="#fff" strokeWidth="2" opacity=".8" fill="none" /></g>
    <g transform="translate(86 118)"><path d="M-14 30 H14 L10 8 H-10Z" fill="#C2791F" /><path d="M0 8 Q-18 -6 -12 -22 Q2 -14 0 8 M0 8 Q18 -8 12 -24 Q-2 -14 0 8" fill="#4E9A6B" /></g>
    <g transform="translate(62 50) rotate(-14)"><rect width="60" height="9" rx="3" fill="#F6C945" /><path d="M60 0 L72 4.5 L60 9Z" fill="#F4C7A8" /><rect width="8" height="9" fill="#E56B8A" /></g>
  </g>);
}
function SceneGlobe(r: () => number, label: string) {
  return (<g>
    <g transform="translate(200 98)"><circle r="52" fill="#5B9BD5" /><path d="M-30 -22 q16 -14 32 -2 q-8 10 -2 20 q-14 8 -22 -2 q-12 -2 -8 -16z M16 10 q14 -4 22 6 q-4 16 -20 18 q-8 -8 -2 -24z" fill="#7BC79A" /><ellipse cx="-16" cy="-24" rx="12" ry="7" fill="#fff" opacity=".35" /><path d="M-52 0 H52 M0 -52 V52" stroke="#fff" strokeWidth="1.4" opacity=".5" /><ellipse rx="52" ry="18" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".4" /></g>
    <path d="M200 150 V170 M170 172 H230" stroke="#9A6B45" strokeWidth="6" strokeLinecap="round" /><path d="M152 98 a52 52 0 0 0 96 0" fill="none" stroke="#9A6B45" strokeWidth="4" opacity=".0" />
    <text x="86" y="62" fontSize="22" fontWeight="800" fill="#245C43" opacity=".75">{symbolFor(label).split(' ')[0]}</text>
    <text x="298" y="150" fontSize="20" fontWeight="800" fill="#E28E73" opacity=".85">A+</text>
    {[...Array(6)].map((_, i) => <path key={i} d={`M${60 + i * 56} ${34 + (i % 3) * 12} l3 7 7 .8-5.4 4.6 1.6 7.2-6.2-3.8-6.2 3.8 1.6-7.2-5.4-4.6 7-.8z`} fill="#F6C945" opacity=".7" />)}
  </g>);
}
const TUTOR_SCENES = [SceneShelf, SceneBoard, SceneDesk, SceneGlobe];

/** Muassasa muqovasi: id/nomga qarab noyob rasm (rang, sahna, bezaklar). */
export function ProviderCover({ id, name, type, label, className = '' }: { id?: string; name?: string; type: 'kindergarten' | 'tutor' | string; label?: string; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const seed = hash(`${id || ''}|${cleanName(name)}`);
  const art = useMemo(() => {
    const r = rng(seed);
    const sky = SKY[Math.floor(r() * SKY.length)];
    const grass = GRASS[Math.floor(r() * GRASS.length)];
    const wall = WALL[Math.floor(r() * WALL.length)];
    const roof = ROOF[Math.floor(r() * ROOF.length)];
    const kg = type === 'kindergarten';
    const idx = Math.floor(r() * (kg ? KG_SCENES.length : TUTOR_SCENES.length));
    const clouds = [{ x: 60 + r() * 60, y: 38 + r() * 20, s: 0.8 + r() * 0.5 }, { x: 250 + r() * 100, y: 30 + r() * 24, s: 0.7 + r() * 0.6 }];
    const sunX = 40 + r() * 320;
    const scene = kg ? (KG_SCENES[idx] as any)(r, { wall, roof }) : (TUTOR_SCENES[idx] as any)(r, label || '');
    return { sky, grass, clouds, sunX, scene, kg };
  }, [seed, type, label]);
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={cleanName(name) || 'Muassasa'}>
      <defs><linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={art.sky[0]} /><stop offset="1" stopColor={art.sky[1]} /></linearGradient></defs>
      <rect width="400" height="200" fill={`url(#s${uid})`} />
      {art.kg && <Sun x={art.sunX > 200 ? 54 : 346} y={44} />}
      {art.clouds.map((c, i) => <Cloud key={i} {...c} />)}
      {art.kg ? <><ellipse cx="200" cy="214" rx="280" ry="58" fill={art.grass} /><ellipse cx="60" cy="208" rx="120" ry="34" fill={art.grass} opacity=".7" /></> : <rect y="166" width="400" height="40" fill="#EFE6D2" />}
      {art.scene}
    </svg>
  );
}

const AV = [['#245C43', '#8FAE98'], ['#C2791F', '#E9C768'], ['#3F6FA8', '#9CC5E8'], ['#7A4EA3', '#C9A7E6'], ['#B5533C', '#F4C7A8'], ['#2C7A7B', '#A8D5D0'], ['#B8456B', '#F2A7BE'], ['#5A6B2C', '#C5D88F']];

/** Foydalanuvchi avatari: rasm bo'lsa rasm, bo'lmasa ismga qarab noyob rangli bosh harflar. */
export function Avatar({ name, id, src, size = 40, className = '' }: { name?: string | null; id?: string; src?: string | null; size?: number; className?: string }) {
  const n = cleanName(name) || '?';
  const [a, b] = AV[hash(`${id || ''}${n}`) % AV.length];
  const ini = n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  if (src) /* eslint-disable-next-line @next/next/no-img-element */ return <img src={src} alt={n} width={size} height={size} loading="lazy" className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  return <span aria-label={n} className={`inline-grid shrink-0 place-items-center rounded-full font-extrabold text-white ${className}`} style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${a}, ${b})` }}>{ini}</span>;
}

export function Illustrated({ children }: { children: ReactNode }) { return <>{children}</>; }
