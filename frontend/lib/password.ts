/** Kuchli parol shabloni va generatori. Shablon: kamida 12 belgi, katta va kichik harf, raqam, maxsus belgi. */

export const PASSWORD_RULES = [
  { id: 'len', label: 'Kamida 8 ta belgi (tavsiya: 12 va undan ko‘p)', test: (p: string) => p.length >= 8 },
  { id: 'lower', label: 'Kichik harf (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'upper', label: 'Katta harf (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'Raqam (0–9)', test: (p: string) => /\d/.test(p) },
  { id: 'symbol', label: 'Maxsus belgi (! @ # $ % & *)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

const LOWER = 'abcdefghijkmnpqrstuvwxyz';   // l, o chiqarib tashlangan (1/l, 0/o chalkashmasligi uchun)
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // I, O chiqarib tashlangan
const DIGIT = '23456789';
const SYMBOL = '!@#$%&*?';

function rnd(n: number): number {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.getRandomValues) {
    const lim = Math.floor(0xffffffff / n) * n; // modul bo'yicha tekis taqsimot
    const a = new Uint32Array(1);
    do { c.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}
const pick = (s: string) => s[rnd(s.length)];

/** Shablon bo'yicha tasodifiy kuchli parol: 3 katta + 5 kichik + 3 raqam + 2 maxsus belgi = 13 belgi, aralashtirilgan. */
export function generateStrongPassword(): string {
  const chars = [
    ...Array.from({ length: 3 }, () => pick(UPPER)),
    ...Array.from({ length: 5 }, () => pick(LOWER)),
    ...Array.from({ length: 3 }, () => pick(DIGIT)),
    ...Array.from({ length: 2 }, () => pick(SYMBOL)),
  ];
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}
