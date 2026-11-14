'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, Lock, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { post } from '@/lib/api';
import { errMsg } from '@/lib/format';
import AuthShell from './AuthShell';
import { FormError, PasswordField, PasswordStrength, SubmitButton, SuccessCheck } from './fields';
import { ResetValues, resetSchema } from './schemas';

const swap = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.3 } };

export default function ResetPassword() {
  const sp = useSearchParams(); const router = useRouter(); const token = sp.get('token') || '';
  const [stage, setStage] = useState<'form' | 'ok' | 'bad'>(token ? 'form' : 'bad'); const [err, setErr] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), mode: 'onTouched' });
  const pwd = watch('password') || '';

  const m = useMutation({
    mutationFn: (v: ResetValues) => post('/auth/reset-password', { token, password: v.password, password_confirm: v.password_confirm }),
    onSuccess: () => setStage('ok'),
    onError: (e: any) => { if (e.code === 'invalid_token' || e.status === 400) { setErr(errMsg(e)); setStage('bad'); } else setErr(errMsg(e)); },
  });
  useEffect(() => { if (stage !== 'ok') return; const t = setTimeout(() => router.replace('/login?reset=1'), 2600); return () => clearTimeout(t); }, [stage]); // eslint-disable-line

  return (
    <AuthShell title={stage === 'ok' ? 'Parol yangilandi!' : stage === 'bad' ? 'Havola yaroqsiz' : 'Yangi parol yarating'} subtitle={stage === 'form' ? 'Kuchli va eslab qoladigan parol tanlang' : undefined} side="plain">
      <AnimatePresence mode="wait">
        {stage === 'form' && (
          <motion.form key="f" {...swap} noValidate className="space-y-4" onSubmit={handleSubmit((v) => { setErr(''); m.mutate(v); })}>
            <div><PasswordField label="Yangi parol" autoComplete="new-password" icon={<Lock size={19} />} error={errors.password?.message} hint="Kamida 8 belgi, harf va raqam" {...register('password')} /><PasswordStrength value={pwd} /></div>
            <PasswordField label="Parolni takrorlang" autoComplete="new-password" icon={<Lock size={19} />} error={errors.password_confirm?.message} {...register('password_confirm')} />
            <FormError message={err} />
            <SubmitButton type="submit" loading={m.isPending}><KeyRound size={18} />Parolni saqlash</SubmitButton>
          </motion.form>
        )}
        {stage === 'ok' && (
          <motion.div key="ok" {...swap} className="py-4 text-center" role="status">
            <SuccessCheck />
            <p className="mt-6 text-[16px] text-black/65">Parolingiz muvaffaqiyatli yangilandi. Kirish sahifasiga o‘tkazilmoqda…</p>
            <Link href="/login?reset=1" className="mt-5 inline-block text-[15px] font-bold text-primary underline-offset-4 hover:underline">Hozir kirish</Link>
          </motion.div>
        )}
        {stage === 'bad' && (
          <motion.div key="bad" {...swap} className="text-center">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-peach-light text-amber-700"><TriangleAlert size={36} /></div>
            <p className="text-[15.5px] text-black/65">{err || 'Tiklash havolasi topilmadi yoki muddati tugagan. Yangi havola so‘rang.'}</p>
            <div className="mt-6 space-y-3"><Link href="/forgot-password" className="flex h-14 items-center justify-center rounded-2xl bg-primary text-[16px] font-bold text-white shadow-card">Yangi havola so‘rash</Link><Link href="/login" className="block text-[15px] font-bold text-primary underline-offset-4 hover:underline">Kirishga qaytish</Link></div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
