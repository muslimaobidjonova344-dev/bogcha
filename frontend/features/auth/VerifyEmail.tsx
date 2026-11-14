'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MailCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { get, post } from '@/lib/api';
import { errMsg } from '@/lib/format';
import AuthShell, { rise } from './AuthShell';
import Envelope, { PopImage } from './Envelope';
import { FormError, SubmitButton, SuccessCheck, TextField } from './fields';
import { useResendTimer } from './useResendTimer';

const PROFILE_PATH: Record<string, string> = { parent: '/parent/children', kindergarten_admin: '/kindergarten/profile', tutor: '/tutor/profile', super_admin: '/admin' };
const swap = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.3 } };

export default function VerifyEmail() {
  const sp = useSearchParams(); const router = useRouter(); const qc = useQueryClient();
  const token = sp.get('token'); const qEmail = sp.get('email') || ''; const qRole = sp.get('role') || '';
  const me = useQuery({ queryKey: ['me'], queryFn: async () => { try { return await get('/auth/me'); } catch (e: any) { if (e.status === 401) return null; throw e; } }, refetchInterval: (q: any) => (!token && q.state.data && !q.state.data.email_verified ? 5000 : false) });
  const email = qEmail || me.data?.email || ''; const role = me.data?.role || qRole;
  const dest = PROFILE_PATH[role] || '/';

  // holatlar: verifying | success | error | sending | flying | sent | empty
  const [stage, setStage] = useState<'verifying' | 'success' | 'profile' | 'error' | 'sending' | 'flying' | 'sent' | 'empty'>(token ? 'verifying' : 'sending');
  const [err, setErr] = useState(''); const [manualEmail, setManualEmail] = useState('');
  const ran = useRef(false);
  const timer = useResendTimer();

  // 1) havola orqali tasdiqlash
  useEffect(() => {
    if (!token || ran.current) return; ran.current = true;
    post('/auth/verify-email', { token }).then(() => { qc.invalidateQueries({ queryKey: ['me'] }); setStage('success'); }).catch((e) => { setErr(errMsg(e)); setStage('error'); });
  }, [token]); // eslint-disable-line

  // 2) xat yuborilgan sahifa: yuklanish -> maktub uchib chiqadi -> "yuborildi"
  useEffect(() => {
    if (token) return;
    if (!qEmail && me.isFetched && !me.data) { setStage('empty'); return; }
    const t1 = setTimeout(() => setStage((s) => (s === 'sending' ? 'flying' : s)), 1700);
    const t2 = setTimeout(() => setStage((s) => (s === 'flying' ? 'sent' : s)), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [token, qEmail, me.isFetched, !!me.data]); // eslint-disable-line

  // 3) boshqa oynada tasdiqlansa (polling) avtomatik muvaffaqiyat
  useEffect(() => { if (!token && me.data?.email_verified && stage !== 'success' && stage !== 'empty') setStage('success'); }, [me.data?.email_verified, token, stage]);

  // muvaffaqiyatdan keyin profilni to'ldirishga yo'naltirish
  const [count, setCount] = useState(5);
  useEffect(() => {
    if (stage !== 'success') return;
    const id = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [stage]);
  const go = () => router.replace(me.data ? dest : `/login?next=${encodeURIComponent(dest)}`);
  useEffect(() => { if (stage === 'success' && count <= 0) setStage('profile'); }, [count, stage]); // eslint-disable-line

  const resend = useMutation({
    mutationFn: (to: string) => post('/auth/resend-verification', { email: to }),
    onSuccess: () => { timer.restart(); setErr(''); if (stage === 'error' || stage === 'empty') { setStage('sending'); setTimeout(() => setStage('flying'), 1700); setTimeout(() => setStage('sent'), 2800); } },
    onError: (e) => setErr(errMsg(e)),
  });
  const target = email || manualEmail;

  return (
    <AuthShell variant="card" step={3} emoji={stage === 'success' ? '🎉' : undefined}
      title={stage === 'success' ? 'Email tasdiqlandi!' : stage === 'profile' ? 'Profilni to‘ldiring' : stage === 'error' ? 'Havola ishlamadi' : stage === 'empty' ? 'Emailni tasdiqlash' : stage === 'verifying' ? 'Tekshirilmoqda…' : stage === 'sent' ? 'Emailingizga xat yuborildi!' : 'Email yuborilmoqda...'}
      subtitle={stage === 'sending' ? 'Tasdiqlash xatini yuborayapmiz…' : stage === 'flying' ? 'Maktub yo‘lga chiqdi!' : undefined}>
      <AnimatePresence mode="wait">
        {stage === 'verifying' && (
          <motion.div key="v" {...swap} className="py-10 text-center" role="status" aria-live="polite">
            <motion.div className="mx-auto h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
            <p className="mt-5 text-black/60">Havola tekshirilmoqda, bir lahza…</p>
          </motion.div>
        )}

        {(stage === 'sending' || stage === 'flying') && (
          <motion.div key="s" {...swap} className="py-4 text-center" role="status" aria-live="polite">
            <Envelope stage={stage} />
            <p className="mt-2 text-black/60">{stage === 'sending' ? 'Tasdiqlash xati yuborilmoqda…' : 'Xat pochtangizga yo‘l oldi'}</p>
          </motion.div>
        )}

        {stage === 'sent' && (
          <motion.div key="sent" {...swap} className="text-center">
            <Envelope stage="sent" />
            <p className="mt-3 text-[15.5px] leading-relaxed text-black/65"><b className="break-all text-[#14392A]">{email}</b> manziliga tasdiqlash havolasini yubordik. Havola 30 daqiqa amal qiladi. Xat kelmasa, <b>Spam</b> papkasini ham tekshiring.</p>
            <div className="mt-6 space-y-3">
              <FormError message={err} />
              <SubmitButton variant="outline" type="button" disabled={timer.left > 0} loading={resend.isPending} onClick={() => resend.mutate(email)}>
                <RefreshCw size={18} />{timer.left > 0 ? `Qayta yuborish (${timer.left} s)` : 'Xatni qayta yuborish'}
              </SubmitButton>
              <Link href={dest !== '/' && me.data ? dest : '/login'} className="block pt-1 text-[15px] font-bold text-primary underline-offset-4 hover:underline">{me.data ? 'Keyinroq tasdiqlayman' : 'Kirish sahifasiga'}</Link>
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
            <p className="text-center text-[15.5px] text-black/65">{stage === 'error' ? err || 'Havola yaroqsiz yoki muddati tugagan.' : 'Tasdiqlash havolasi topilmadi. Emailingizni kiriting, yangi havola yuboramiz.'}</p>
            <div className="mt-6 space-y-3">
              {!email && <TextField label="Email" type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />}
              <FormError message={stage === 'empty' ? err : ''} />
              <SubmitButton type="button" disabled={!target || timer.left > 0} loading={resend.isPending} onClick={() => resend.mutate(target)}>
                <RefreshCw size={18} />{timer.left > 0 ? `Qayta yuborish (${timer.left} s)` : 'Yangi havola yuborish'}
              </SubmitButton>
              <Link href="/login" className="block text-center text-[15px] font-bold text-primary underline-offset-4 hover:underline">Kirish sahifasiga</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
