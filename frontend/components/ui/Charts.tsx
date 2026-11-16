'use client';
import { ReactNode, useMemo, useState } from 'react';

/* Tashqi kutubxonasiz, tez ishlaydigan SVG diagrammalar: chiziq, ustun, halqa, gorizontal ustun, voronka. */

export const C = { green: '#245C43', sage: '#8FAE98', sun: '#E9C768', peach: '#F4C7A8', coral: '#E28E73', blue: '#5B9BD5', violet: '#9B7ED0', gray: '#B9C2BD' };
export const PALETTE = [C.green, C.sun, C.blue, C.coral, C.violet, C.sage, C.peach, C.gray];

const nf = new Intl.NumberFormat('uz-UZ');
export const num = (n: number) => nf.format(Math.round(n)).replace(/,/g, ' ');

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/** Diagramma kartasi: sarlavha, "bu nima" izohi va xulosa. Foydalanuvchida savol qolmasligi uchun har bir diagramma tushuntiriladi. */
export function ChartCard({ title, hint, insight, children, className = '' }: { title: string; hint?: string; insight?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col p-4 sm:p-5 ${className}`}>
      <h2 className="text-[15px] font-extrabold text-primary">{title}</h2>
      {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-black/50">{hint}</p>}
      <div className="mt-3 flex-1">{children}</div>
      {insight && <p className="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-[12.5px] font-semibold leading-snug text-primary">{insight}</p>}
    </section>
  );
}

export function Kpi({ label, value, hint, icon, tone = 'plain' }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: 'plain' | 'green' | 'sun' | 'peach' }) {
  const t = { plain: 'bg-white', green: 'bg-primary text-white', sun: 'bg-sun-light', peach: 'bg-peach-light' }[tone];
  const sub = tone === 'green' ? 'text-white/70' : 'text-black/50';
  return (
    <div className={`rounded-2xl p-4 shadow-card ${t}`}>
      <div className={`flex items-center justify-between text-[12.5px] font-bold ${sub}`}><span>{label}</span>{icon}</div>
      <div className={`mt-1 text-[26px] font-extrabold leading-tight ${tone === 'green' ? '' : 'text-primary'}`}>{value}</div>
      {hint && <div className={`mt-0.5 text-[12px] leading-snug ${sub}`}>{hint}</div>}
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">{items.map((i) => <span key={i.name} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-black/60"><i className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />{i.name}</span>)}</div>;
}

type Series = { name: string; color: string; values: number[] };

const W = 560, PL = 34, PR = 12, PT = 12, PB = 26;

function Axes({ max, H, ticks = 4 }: { max: number; H: number; ticks?: number }) {
  return <>{Array.from({ length: ticks + 1 }, (_, i) => { const y = PT + (H - PT - PB) * (1 - i / ticks); return <g key={i}><line x1={PL} x2={W - PR} y1={y} y2={y} stroke="#000" strokeOpacity={i === 0 ? 0.25 : 0.07} /><text x={PL - 6} y={y + 4} textAnchor="end" fontSize="10.5" fill="#000" fillOpacity=".45">{num((max * i) / ticks)}</text></g>; })}</>;
}

/** Chiziqli diagramma (bir nechta qator), ustiga kelganda qiymatlar ko'rinadi. */
export function LineChart({ labels, series, height = 230, area = true }: { labels: string[]; series: Series[]; height?: number; area?: boolean }) {
  const [hi, setHi] = useState<number | null>(null);
  const H = height;
  const max = useMemo(() => niceMax(Math.max(1, ...series.flatMap((s) => s.values))), [series]);
  const n = labels.length;
  const x = (i: number) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  const skip = n > 8 ? Math.ceil(n / 8) : 1;
  return (
    <div>
      <Legend items={series} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chiziqli diagramma" onMouseLeave={() => setHi(null)}>
          <Axes max={max} H={H} />
          {series.map((s, si) => {
            const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
            return <g key={s.name}>
              {area && si === 0 && <polygon points={`${x(0)},${y(0)} ${pts.join(' ')} ${x(n - 1)},${y(0)}`} fill={s.color} fillOpacity=".10" />}
              <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hi === i ? 5 : 3} fill="#fff" stroke={s.color} strokeWidth="2" />)}
            </g>;
          })}
          {labels.map((l, i) => i % skip === 0 && <text key={l} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#000" fillOpacity=".5">{l}</text>)}
          {hi !== null && <line x1={x(hi)} x2={x(hi)} y1={PT} y2={H - PB} stroke={C.green} strokeOpacity=".25" strokeDasharray="3 3" />}
          {labels.map((_, i) => <rect key={i} x={x(i) - (W - PL - PR) / (2 * Math.max(n - 1, 1))} y={PT} width={(W - PL - PR) / Math.max(n - 1, 1)} height={H - PT - PB} fill="transparent" onMouseEnter={() => setHi(i)} onTouchStart={() => setHi(i)} onClick={() => setHi(i)} />)}
        </svg>
        {hi !== null && <Tip left={(x(hi) / W) * 100} title={labels[hi]} rows={series.map((s) => ({ name: s.name, color: s.color, v: s.values[hi] }))} />}
      </div>
    </div>
  );
}

function Tip({ left, title, rows }: { left: number; title: string; rows: { name: string; color: string; v: number }[] }) {
  return (
    <div className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl bg-[#14392A] px-3 py-2 text-[12px] text-white shadow-pop" style={{ left: `${Math.min(86, Math.max(14, left))}%` }}>
      <div className="mb-0.5 font-extrabold">{title}</div>
      {rows.map((r) => <div key={r.name} className="flex items-center gap-1.5 whitespace-nowrap"><i className="h-2 w-2 rounded-full" style={{ background: r.color }} />{r.name}: <b>{num(r.v)}</b></div>)}
    </div>
  );
}

/** Ustunli diagramma: guruhlangan yoki ustma-ust (stacked). */
export function BarChart({ labels, series, height = 220, stacked = false }: { labels: string[]; series: Series[]; height?: number; stacked?: boolean }) {
  const [hi, setHi] = useState<number | null>(null);
  const H = height, n = labels.length;
  const totals = labels.map((_, i) => (stacked ? series.reduce((a, s) => a + s.values[i], 0) : Math.max(...series.map((s) => s.values[i]))));
  const max = niceMax(Math.max(1, ...totals));
  const slot = (W - PL - PR) / n, bw = Math.min(40, slot * 0.62) / (stacked ? 1 : series.length);
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  const skip = n > 8 ? Math.ceil(n / 8) : 1;
  return (
    <div>
      {series.length > 1 && <Legend items={series} />}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Ustunli diagramma" onMouseLeave={() => setHi(null)}>
          <Axes max={max} H={H} />
          {labels.map((l, i) => {
            const cx = PL + slot * i + slot / 2; let acc = 0;
            return <g key={l} onMouseEnter={() => setHi(i)} onTouchStart={() => setHi(i)} onClick={() => setHi(i)}>
              <rect x={PL + slot * i} y={PT} width={slot} height={H - PT - PB} fill={hi === i ? C.green : 'transparent'} fillOpacity=".05" />
              {series.map((s, si) => {
                const v = s.values[i];
                const h = (H - PT - PB) * (v / max);
                const yy = stacked ? y(acc + v) : y(v);
                const xx = stacked ? cx - bw / 2 : cx - (bw * series.length) / 2 + si * bw;
                acc += v;
                return <rect key={s.name} x={xx} y={yy} width={bw - (stacked ? 0 : 2)} height={Math.max(h, v ? 2 : 0)} rx="3" fill={s.color} />;
              })}
              {i % skip === 0 && <text x={cx} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#000" fillOpacity=".5">{l}</text>}
            </g>;
          })}
        </svg>
        {hi !== null && <Tip left={((PL + slot * hi + slot / 2) / W) * 100} title={labels[hi]} rows={series.map((s) => ({ name: s.name, color: s.color, v: s.values[hi] }))} />}
      </div>
    </div>
  );
}

/** Halqa (donut) diagramma, o'rtasida jami, yonida izoh ro'yxati. */
export function Donut({ data, center, unit = '' }: { data: { k: string; v: number; color?: string }[]; center?: string; unit?: string }) {
  const items = data.filter((d) => d.v > 0).map((d, i) => ({ ...d, color: d.color || PALETTE[i % PALETTE.length] }));
  const total = items.reduce((a, d) => a + d.v, 0);
  const r = 54, c = 2 * Math.PI * r;
  let off = 0;
  if (!total) return <p className="py-8 text-center text-sm text-black/40">Hozircha ma‘lumot yo‘q</p>;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label="Halqa diagramma">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#000" strokeOpacity=".06" strokeWidth="18" />
        {items.map((d) => { const len = (d.v / total) * c; const el = <circle key={d.k} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="18" strokeDasharray={`${Math.max(len - 1.5, 0)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"><title>{d.k}: {num(d.v)}</title></circle>; off += len; return el; })}
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="800" fill="#245C43">{center ?? num(total)}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#000" fillOpacity=".5">{unit || 'jami'}</text>
      </svg>
      <ul className="min-w-[150px] flex-1 space-y-1.5">{items.map((d) => <li key={d.k} className="flex items-center gap-2 text-[13px]"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} /><span className="flex-1 text-black/70">{d.k}</span><b className="text-primary">{num(d.v)}</b><span className="w-10 text-right text-[11.5px] text-black/40">{Math.round((d.v / total) * 100)}%</span></li>)}</ul>
    </div>
  );
}

/** Gorizontal ustunlar (reyting taqsimoti, hududlar va h.k.). */
export function HBars({ data, color = C.green, suffix = '' }: { data: { k: string; v: number; sub?: string }[]; color?: string; suffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  if (!data.length) return <p className="py-8 text-center text-sm text-black/40">Hozircha ma‘lumot yo‘q</p>;
  return <ul className="space-y-2">{data.map((d) => <li key={d.k}><div className="flex items-baseline justify-between gap-2 text-[13px]"><span className="truncate font-semibold text-black/75">{d.k}</span><span className="shrink-0 font-extrabold text-primary">{num(d.v)}{suffix}</span></div><div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/[.07]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.v / max) * 100}%`, background: color }} /></div>{d.sub && <div className="mt-0.5 text-[11.5px] text-black/45">{d.sub}</div>}</li>)}</ul>;
}

/** Voronka: bosqichlar va har bir bosqichdan keyingisiga o'tish foizi. */
export function Funnel({ steps }: { steps: { k: string; v: number }[] }) {
  const top = Math.max(1, steps[0]?.v || 1);
  return <ol className="space-y-2.5">{steps.map((s, i) => { const prev = i ? steps[i - 1].v : null; return (
    <li key={s.k}><div className="flex items-baseline justify-between text-[13px]"><span className="font-semibold text-black/75">{i + 1}. {s.k}</span><span><b className="text-primary">{num(s.v)}</b>{prev ? <span className="ml-1.5 text-[11.5px] text-black/45">({prev ? Math.round((s.v / prev) * 100) : 0}% oldingisidan)</span> : null}</span></div>
      <div className="mt-1 h-6 overflow-hidden rounded-lg bg-black/[.06]"><div className="h-full rounded-lg" style={{ width: `${Math.max((s.v / top) * 100, s.v ? 3 : 0)}%`, background: `linear-gradient(90deg, ${C.green}, ${C.sage})`, opacity: 1 - i * 0.12 }} /></div></li>); })}</ol>;
}

/** Soatni qulay ko'rinishga keltiradi: 0.5 -> "30 daqiqa", 30 -> "1.3 kun". */
export function hoursText(h?: number | null): string {
  if (h == null) return '—';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} daqiqa`;
  if (h < 48) return `${h < 10 ? h.toFixed(1) : Math.round(h)} soat`;
  return `${(h / 24).toFixed(1)} kun`;
}
