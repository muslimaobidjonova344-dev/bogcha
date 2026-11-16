'use client';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Fingerprint, Sprout } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useMe } from '@/hooks/useAuth';
import { post } from '@/lib/api';
import { PIN_LENGTHS, RELOCK_MS, bioEnabled, bioSupported, bioUnlock, checkPin, clearFails, enableBio, failState, hasLock, isStandalone, lockSupported, pinLength, registerFail, removeLock, setPin, setupSkipped, skipSetup } from '@/lib/applock';
import PinPad from './PinPad';

function Screen({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-y-auto bg-bg px-5 py-8">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-card"><Sprout size={30} /></div>
      {children}
    </motion.div>
  );
}

/** PIN o'rnatish: yangi PIN -> takrorlash -> (qurilma qo'llasa) barmoq izi. */
export function PinSetupDialog({ onDone, onCancel, cancelLabel = 'Keyinroq' }: { onDone: () => void; onCancel: () => void; cancelLabel?: string }) {
  const [len, setLen] = useState<number>(4);
  const [step, setStep] = useState<'new' | 'confirm' | 'bio'>('new');
  const [first, setFirst] = useState('');
  const [err, setErr] = useState(''); const [shake, setShake] = useState(0); const [busy, setBusy] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  useEffect(() => { bioSupported().then(setBioOk); }, []);

  const onPin = async (pin: string) => {
    if (step === 'new') { setFirst(pin); setErr(''); setStep('confirm'); return; }
    if (pin !== first) { setErr('PIN kodlar bir xil emas. Qaytadan kiriting.'); setShake((s) => s + 1); setStep('new'); setFirst(''); return; }
    setBusy(true);
    const ok = await setPin(pin);
    setBusy(false);
    if (!ok) { setErr('Bu qurilmada PIN o‘rnatib bo‘lmadi (xavfsiz ulanish kerak).'); setShake((s) => s + 1); setStep('new'); return; }
    if (bioOk) setStep('bio'); else onDone();
  };
  if (step === 'bio') return (
    <Screen>
      <div className="mx-auto max-w-[320px] text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-50 text-primary"><Fingerprint size={44} /></div>
        <h1 className="mt-4 text-[22px] font-extrabold text-[#14392A]">Barmoq izi bilan ochish</h1>
        <p className="mt-1 text-[14px] leading-snug text-black/55">PIN o‘rnatildi. Endi ilovani barmoq izi yoki yuz bilan tezroq ochishni yoqishingiz mumkin.</p>
        <button disabled={busy} onClick={async () => { setBusy(true); await enableBio(); setBusy(false); onDone(); }} className="btn btn-primary mt-6 w-full">Yoqish</button>
        <button onClick={onDone} className="mt-3 text-[14px] font-bold text-black/50">Hozircha kerak emas</button>
      </div>
    </Screen>
  );
  return (
    <Screen>
      <PinPad length={len} key={`${step}-${len}`} shake={shake} error={err} disabled={busy}
        title={step === 'new' ? 'PIN kod o‘rnating' : 'PIN kodni takrorlang'}
        subtitle={step === 'new' ? 'Ilova har safar ochilganda shu PIN so‘raladi. PIN faqat shu qurilmada saqlanadi.' : 'Xuddi shu PIN ni yana bir bor kiriting.'}
        onComplete={onPin}
        footer={<div className="space-y-3">
          {step === 'new' && <div className="flex justify-center gap-2">{PIN_LENGTHS.map((n) => <button key={n} onClick={() => { setLen(n); setErr(''); }} className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${len === n ? 'bg-primary text-white' : 'bg-primary-50 text-primary'}`}>{n} xonali</button>)}</div>}
          <button onClick={onCancel} className="text-[14px] font-bold text-black/50">{cancelLabel}</button>
        </div>} />
    </Screen>
  );
}

/** Butun ilova qulfi + o'rnatilgan ilovada birinchi marta PIN o'rnatishni taklif qilish. */
export default function AppLock() {
  const me = useMe();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [setup, setSetup] = useState(false);
  const [err, setErr] = useState(''); const [shake, setShake] = useState(0); const [wait, setWait] = useState(0);
  const hiddenAt = useRef(0);
  const logged = !!me.data;

  useEffect(() => { setMounted(true); if (hasLock()) setLocked(true); }, []);
  useEffect(() => {
    const h = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hasLock() && hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_MS) setLocked(true);
    };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);
  // Chiqib ketgan (sessiyasi yo'q) foydalanuvchida qulf kerak emas
  useEffect(() => { if (me.isFetched && !me.data) { if (hasLock()) removeLock(); setLocked(false); } }, [me.isFetched, me.data]);
  // O'rnatilgan ilovada birinchi kirishdan keyin PIN taklif qilinadi
  useEffect(() => {
    if (!logged || !isStandalone() || !lockSupported() || hasLock() || setupSkipped()) return;
    const t = setTimeout(() => setSetup(true), 1500);
    return () => clearTimeout(t);
  }, [logged]);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const unlock = useCallback(() => { clearFails(); setErr(''); setLocked(false); hiddenAt.current = 0; }, []);
  const tryBio = useCallback(async () => { if (await bioUnlock()) unlock(); }, [unlock]);
  useEffect(() => { if (mounted && locked && bioEnabled()) { const t = setTimeout(tryBio, 350); return () => clearTimeout(t); } }, [mounted, locked, tryBio]);

  const onPin = async (pin: string) => {
    const f = failState();
    if (f.wait > 0) { setWait(f.wait); setShake((s) => s + 1); return; }
    if (await checkPin(pin)) { unlock(); return; }
    const r = registerFail();
    setShake((s) => s + 1);
    if (r.wait > 0) { setWait(r.wait); setErr(''); } else setErr(`PIN noto‘g‘ri. Yana ${5 - (r.n % 5)} ta urinish qoldi.`);
  };
  const logout = async () => { try { await post('/auth/logout'); } catch { /* */ } removeLock(); qc.clear(); setLocked(false); window.location.href = '/login'; };

  if (!mounted) return null;
  return (
    <AnimatePresence>
      {locked && (me.isLoading || logged) && (
        <Screen key="lock">
          <PinPad length={pinLength()} shake={shake} disabled={wait > 0} error={wait > 0 ? `Juda ko‘p urinish. ${wait} soniyadan keyin qayta urinib ko‘ring.` : err}
            title="PIN kodni kiriting" subtitle={logged && me.data?.full_name ? `${me.data.full_name}, xush kelibsiz` : 'Ilovani ochish uchun PIN kiriting'}
            onComplete={onPin} onBio={bioEnabled() ? tryBio : undefined}
            footer={<button onClick={logout} className="text-[13.5px] font-bold text-black/50 underline-offset-4 hover:underline">PIN esdan chiqdimi? Hisobdan chiqish</button>} />
        </Screen>
      )}
      {setup && !locked && (
        <PinSetupDialog key="setup" onDone={() => setSetup(false)} onCancel={() => { skipSetup(); setSetup(false); }} />
      )}
    </AnimatePresence>
  );
}

