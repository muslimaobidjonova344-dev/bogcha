/** Ilova qulfi: PIN kod (PBKDF2 bilan xeshlanadi) va barmoq izi/yuz (WebAuthn platforma autentifikatori).
 *  Bu QURILMA qulfi: ilova interfeysini begonalardan himoya qiladi. Server sessiyasi o'zgarmaydi, PIN serverga yuborilmaydi. */

const KEY = 'kt_lock_v1';
const FAIL = 'kt_lock_fail';
const SKIP = 'kt_lock_skip';
export const RELOCK_MS = 30_000; // ilova fonda shuncha turib qolsa, qayta qulflanadi
export const PIN_LENGTHS = [4, 6] as const;

type Lock = { s: string; h: string; len: number; bio?: string | null };
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...Array.from(new Uint8Array(b as ArrayBuffer))));
const unb64 = (s: string): Uint8Array<ArrayBuffer> => { const b = atob(s); const a = new Uint8Array(new ArrayBuffer(b.length)); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const rand = (n: number): Uint8Array<ArrayBuffer> => { const a = new Uint8Array(new ArrayBuffer(n)); crypto.getRandomValues(a); return a; };

function read(): Lock | null { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch { return null; } }
function write(l: Lock | null) { try { l ? localStorage.setItem(KEY, JSON.stringify(l)) : localStorage.removeItem(KEY); } catch { /* xotira yopiq */ } }

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150_000 }, key, 256));
}

export const hasLock = () => !!read();
export const pinLength = () => read()?.len || 4;
export const bioEnabled = () => !!read()?.bio;
export const lockSupported = () => typeof window !== 'undefined' && !!window.crypto?.subtle;

export async function setPin(pin: string): Promise<boolean> {
  if (!lockSupported() || !/^\d{4,6}$/.test(pin)) return false;
  const salt = rand(16);
  const prev = read();
  write({ s: b64(salt), h: await derive(pin, salt), len: pin.length, bio: prev?.bio || null });
  clearFails();
  return true;
}
export async function checkPin(pin: string): Promise<boolean> {
  const l = read();
  if (!l) return true;
  return (await derive(pin, unb64(l.s))) === l.h;
}
export function removeLock() { write(null); clearFails(); }

/* ---- noto'g'ri urinishlar: har 5-xatodan keyin vaqtincha bloklanadi ---- */
export function failState(): { n: number; wait: number } {
  try { const f = JSON.parse(localStorage.getItem(FAIL) || '{}'); return { n: f.n || 0, wait: Math.max(0, Math.ceil(((f.until || 0) - Date.now()) / 1000)) }; } catch { return { n: 0, wait: 0 }; }
}
export function registerFail(): { n: number; wait: number } {
  const { n } = failState();
  const k = n + 1;
  const until = k % 5 === 0 ? Date.now() + Math.min(30 * (k / 5), 300) * 1000 : 0;
  try { localStorage.setItem(FAIL, JSON.stringify({ n: k, until })); } catch { /* */ }
  return failState();
}
export function clearFails() { try { localStorage.removeItem(FAIL); } catch { /* */ } }

/* ---- o'rnatish so'rovini keyinga qoldirish ---- */
export const skipSetup = () => { try { localStorage.setItem(SKIP, String(Date.now())); } catch { /* */ } };
export const setupSkipped = () => { try { const t = Number(localStorage.getItem(SKIP) || 0); return !!t && Date.now() - t < 3 * 864e5; } catch { return false; } };

/** O'rnatilgan ilova (PWA) rejimidami? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches || (navigator as any).standalone === true;
}

/* ---- barmoq izi / yuz (WebAuthn) ---- */
export async function bioSupported(): Promise<boolean> {
  try { return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
export async function enableBio(): Promise<boolean> {
  const l = read();
  if (!l || !(await bioSupported())) return false;
  try {
    const cred = (await navigator.credentials.create({ publicKey: {
      challenge: rand(32), rp: { name: 'Kichkintoy' }, user: { id: rand(16), name: 'kichkintoy-qurilma', displayName: 'Kichkintoy' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60_000,
    } })) as PublicKeyCredential | null;
    if (!cred) return false;
    write({ ...l, bio: b64(cred.rawId) });
    return true;
  } catch { return false; }
}
export function disableBio() { const l = read(); if (l) write({ ...l, bio: null }); }
export async function bioUnlock(): Promise<boolean> {
  const l = read();
  if (!l?.bio) return false;
  try {
    const a = await navigator.credentials.get({ publicKey: { challenge: rand(32), allowCredentials: [{ id: unb64(l.bio), type: 'public-key', transports: ['internal'] }], userVerification: 'required', timeout: 60_000 } });
    return !!a;
  } catch { return false; }
}
