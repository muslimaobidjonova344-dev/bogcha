'use client';
import { Fingerprint, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PinSetupDialog } from '@/components/AppLock';
import PinPad from '@/components/PinPad';
import { Button, Card, useToast } from '@/components/ui/ui';
import { bioEnabled, bioSupported, checkPin, disableBio, enableBio, hasLock, lockSupported, pinLength, removeLock } from '@/lib/applock';

type Mode = null | 'setup' | 'verify-change' | 'verify-remove' | 'verify-bio';

/** Sozlamalar: ilova qulfi (PIN va barmoq izi). */
export default function LockSettings() {
  const toast = useToast();
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState<Mode>(null);
  const [bioOk, setBioOk] = useState(false);
  const [err, setErr] = useState(''); const [shake, setShake] = useState(0);
  const [on, setOn] = useState(false); const [bio, setBio] = useState(false);
  useEffect(() => { setOn(hasLock()); setBio(bioEnabled()); bioSupported().then(setBioOk); }, [tick]);
  if (typeof window !== 'undefined' && !lockSupported()) return null;

  const verify = async (pin: string) => {
    if (!(await checkPin(pin))) { setErr('PIN noto‘g‘ri'); setShake((s) => s + 1); return; }
    setErr('');
    if (mode === 'verify-change') setMode('setup');
    else if (mode === 'verify-remove') { removeLock(); setMode(null); setTick((t) => t + 1); toast.ok('Ilova qulfi o‘chirildi'); }
    else if (mode === 'verify-bio') {
      setMode(null);
      if (bio) { disableBio(); toast.ok('Barmoq izi o‘chirildi'); } else if (await enableBio()) toast.ok('Barmoq izi yoqildi'); else toast.err('Barmoq izini yoqib bo‘lmadi');
      setTick((t) => t + 1);
    }
  };
  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-bold text-primary">{on ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}Ilova qulfi</h2>
      <p className="mb-3 text-sm text-black/60">Ilova ochilganda PIN kod (yoki barmoq izi) so‘raladi. Qurilmangizni boshqalar qo‘liga tushsa ham, ma‘lumotlaringiz himoyada qoladi. PIN faqat shu qurilmada saqlanadi.</p>
      {!on ? <Button onClick={() => setMode('setup')}><KeyRound size={16} />PIN kod o‘rnatish</Button> : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setErr(''); setMode('verify-change'); }}><KeyRound size={16} />PIN ni o‘zgartirish</Button>
            {bioOk && <Button variant="outline" onClick={() => { setErr(''); setMode('verify-bio'); }}><Fingerprint size={16} />{bio ? 'Barmoq izini o‘chirish' : 'Barmoq izini yoqish'}</Button>}
            <Button variant="ghost" className="!text-red-600" onClick={() => { setErr(''); setMode('verify-remove'); }}>Qulfni o‘chirish</Button>
          </div>
          <p className="text-[12.5px] text-black/45">Holat: PIN yoqilgan{bio ? ' · barmoq izi yoqilgan' : ''}.</p>
        </div>
      )}
      {mode === 'setup' && <PinSetupDialog cancelLabel="Bekor qilish" onCancel={() => { setMode(null); setTick((t) => t + 1); }} onDone={() => { setMode(null); setTick((t) => t + 1); toast.ok('Ilova qulfi yoqildi'); }} />}
      {mode && mode.startsWith('verify') && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-bg px-5">
          <PinPad length={pinLength()} shake={shake} error={err} title="Joriy PIN ni kiriting" subtitle="Davom etish uchun shaxsingizni tasdiqlang." onComplete={verify}
            footer={<button onClick={() => setMode(null)} className="text-[14px] font-bold text-black/50">Bekor qilish</button>} />
        </div>
      )}
    </Card>
  );
}
