'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MailCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { get, post } from '@/lib/api';
import { errMsg } from '@/lib/format';
import AuthShell from './AuthShell';
import Envelope, { PopImage } from './Envelope';
import { FormError, SubmitButton, TextField } from './fields';
import Otp from './Otp';
import { useResendTimer } from './useResendTimer';

const PROFILE_PATH: Record<string, string> = { parent: '/parent/children', kindergarten_admin: '/kindergarten/profile', tutor: '/tutor/profile', super_admin: '/admin' };
const swap = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.3 } };
type Stage = 'verifying' | 'sending' | 'flying' | 'code' | 'success' | 'profile' | 'error' | 'empty';

/** Email tasdiqlash: 6 xonali kod. (Eski xatlardagi ?token= havolasi ham ishlaydi.) */
export default function VerifyEmail() {
  const sp = useSearchParams(); const router = useRouter(); const qc = useQueryClient();
  const token = sp.get('token'); const qEmail = sp.get('email') || ''; const qRole = sp.get('role') || '';
  const me = useQuery({ queryKey: ['me'], queryFn: async () => { try { return await get('/auth/me'); } catch (e: any) { if (e.status === 401) return null; throw e; } } });
  const [manualEmail, setManualEmail] = useState('');
  const email = qEmail || me.data?.email || manualEmail; const role = me.data?.role || qRole; const dest = PROFILE_PATH[role] || '/';

  const [stage, setStage] = useState<Stage>(token ? 'verifying' : 'sending');
  const [err, setErr] = useState(''); const [code, setCode] = useState(''); const [shake, setShake] = useState(0); const [devCode, setDevCode] = useState('');
  const ran = useRef(false); const timer = useResendTimer();
  useEffect(() => { try { setDevCode(sessionStorage.getItem('kt_dev_code') || ''); } catch {} }, []);

  // eski havola orqali tasdiqlash
  useEffect(() => {
    if (!token || ran.current) return; ran.current = true;
    post('/auth/verify-email', { token }).then(() => { qc.invalidateQueries({ queryKey: ['me'] }); setStage('success'); }).catch((e) => { setErr(errMsg(e)); setStage('error'); });
  }, [token]); // eslint-disable-line

  // xat yuborilmoqda -> maktub uchib chiqadi -> kod kiritish
  const play = () => { setStage('sending'); setTimeout(() => setStage((s) => (s === 'sending' ? 'flying' : s)), 1500); setTimeout(() => setStage((s) => (s === 'flying' ? 'code' : s)), 2700); };
  useEffect(() => {
    if (token) return;
    if (!qEmail && me.isFetched && !me.data) { setStage('empty'); return; }
    if (!me.isFetched && !qEmail) return;
    if (me.data?.email_verified && !qEmail) { setStage('success'); return; }
    play();
  }, [token, qEmail, me.isFetched, !!me.data]); // eslint-disable-line

  const [count, setCount] = useState(5);
  useEffect(() => { if (stage !== 'success') return; const id = setInterval(() => setCount((c) => c - 1), 1000); return () => clearInterval(id); }, [stage]);
  useEffect(() => { if (stage === 'success' && count <= 0) setStage('profile'); }, [count, stage]);
  const go = () => router.replace(me.data ? dest : `/login?next=${encodeURIComponent(dest)}`);

  const verify = useMutation({
    mutationFn: (c: string) => post('/auth/verify-code', { email, code: c }),
    onSuccess: () => { try { sessionStorage.removeItem('kt_dev_code'); } catch {} setErr(''); qc.invalidateQueries({ queryKey: ['me'] }); setStage('success'); },
    onError: (e) => { setErr(errMsg(e)); setShake((n) => n + 1); setCode(''); },
  });
  const resend = useMutation({
    mutationFn: (to: string) => post('/auth/resend-verification', { email: to }),
    onSuccess: () => { timer.restart(); setErr(''); setCode(''); play(); },
    onError: (e) => setErr(errMsg(e)),
  });

  const title = stage === 'success' ? 'Email tasdiqlandi!' : stage === 'profile' ? 'Profilni to‘ldiring' : stage === 'error' ? 'Havola ishlamadi' : stage === 'empty' ? 'Emailni tasdiqlash' : stage === 'verifying' ? 'Tekshirilmoqda…' : stage === 'code' ? 'Emailingizga kod yuborildi!' : 'Email yuborilmoqda...';
  return (
    <AuthShell variant="card" step={3} emoji={stage === 'success' ? '🎉' : undefined} title={title} subtitle={stage === 'sending' ? 'Tasdiqlash kodini yuborayapmiz…' : stage === 'flying' ? 'Maktub yo‘lga chiqdi!' : undefined}>
      <AnimatePresence mode="wait">
        {stage === 'verifying' && (
          <motion.div key="v" {...swap} className="py-10 text-center" role="status">
            <motion.div className="mx-auto h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
            <p className="mt-5 text-black/60">Havola tekshirilmoqda, bir lahza…</p>
          </motion.div>
        )}

        {(stage === 'sending' || stage === 'flying') && (
          <motion.div key="s" {...swap} className="py-2 text-center" role="status" aria-live="polite"><Envelope stage={stage} /></motion.div>
        )}

        {stage === 'code' && (
          <motion.div key="c" {...swap} className="text-center">
            <Envelope stage="sent" />
            <p className="mt-1 text-[15px] leading-relaxed text-black/65"><b className="break-all text-[#14392A]">{email}</b> manziliga 6 xonali kod yubordik. Uni quyiga kiriting. Kod 30 daqiqa amal qiladi, xat kelmasa <b>Spam</b> papkasini tekshiring.</p>
            {devCode && <div className="mx-auto mt-3 w-fit rounded-xl border border-dashed border-amber-400 bg-sun-light px-3 py-1.5 text-[13px] font-bold text-amber-900">Sinov rejimi: kod {devCode} <button type="button" className="ml-2 underline" onClick={() => { setCode(devCode); verify.mutate(devCode); }}>kiritish</button></div>}
            <div className="mt-5"><Otp value={code} onChange={setCode} onComplete={(c) => verify.mutate(c)} error={!!err && !code} disabled={verify.isPending} shakeKey={shake} /></div>
            <div className="mt-4 space-y-3">
              <FormError message={err} />
              <SubmitButton type="button" loading={verify.isPending} disabled={code.length < 6} onClick={() => verify.mutate(code)}>Tasdiqlash<ArrowRight size={19} /></SubmitButton>
              <SubmitButton variant="outline" type="button" disabled={timer.left > 0} loading={resend.isPending} onClick={() => resend.mutate(email)}>
                <RefreshCw size={18} />{timer.left > 0 ? `Qayta yuborish (${timer.left} s)` : 'Kodni qayta yuborish'}
              </SubmitButton>
              <Link href={me.data ? dest : '/login'} className="block pt-1 text-[15px] font-bold text-primary underline-offset-4 hover:underline">{me.data ? 'Keyinroq tasdiqlayman' : 'Kirish sahifasiga'}</Link>
            </div>
          </motion.div>
        )}

        {stage === 'success' && (
          <motion.div key="ok" {...swap} className="py-2 text-center" role="status">
            <PopImage src="/auth/check.png" className="w-36" />
            <p className="mt-4 text-[16px] text-black/65">Ajoyib! Hisobingiz muvaffaqiyatli tasdiqlandi.</p>
            <div className="mt-6"><SubmitButton type="button" onClick={() => setStage('profile')}>Davom etish <ArrowRight size={19} /></SubmitButton></div>
            <p className="mt-3 text-[13px] text-black/40">{Math.max(count, 0)} soniyadan keyin avtomatik o‘tiladi</p>
          </motion.div>
        )}

        {stage === 'profile' && (
          <motion.div key="pf" {...swap} className="py-2 text-center">
            <PopImage src="/auth/clip.png" className="w-36" />
            <p className="mt-4 text-[16px] text-black/65">Endi o‘zingiz va {role === 'parent' ? 'farzandingiz' : 'faoliyatingiz'} haqidagi ma‘lumotlarni kiriting.</p>
            <div className="mt-6"><SubmitButton type="button" onClick={go}>Profilni to‘ldirish <ArrowRight size={19} /></SubmitButton></div>
          </motion.div>
        )}

        {(stage === 'error' || stage === 'empty') && (
          <motion.div key="er" {...swap}>
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-peach-light text-amber-700">{stage === 'error' ? <TriangleAlert size={36} /> : <MailCheck size={36} />}</div>
            <p className="text-center text-[15.5px] text-black/65">{stage === 'error' ? err || 'Havola yaroqsiz yoki muddati tugagan.' : 'Emailingizni kiriting, tasdiqlash kodini yuboramiz.'}</p>
            <div className="mt-6 space-y-3">
              {!(qEmail || me.data?.email) && <TextField label="Email" type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />}
              <FormError message={stage === 'empty' ? err : ''} />
              <SubmitButton type="button" disabled={!email || timer.left > 0} loading={resend.isPending} onClick={() => resend.mutate(email)}><RefreshCw size={18} />{timer.left > 0 ? `Qayta yuborish (${timer.left} s)` : 'Kod yuborish'}</SubmitButton>
              <Link href="/login" className="block text-center text-[15px] font-bold text-primary underline-offset-4 hover:underline">Kirish sahifasiga</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
