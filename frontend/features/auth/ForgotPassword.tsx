'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Mail, RefreshCw, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { post } from '@/lib/api';
import { errMsg } from '@/lib/format';
import AuthShell, { rise } from './AuthShell';
import Envelope from './Envelope';
import { FormError, SubmitButton, TextField } from './fields';
import { ForgotValues, forgotSchema } from './schemas';
import { useResendTimer } from './useResendTimer';

const swap = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.3 } };

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState(''); const [stage, setStage] = useState<'form' | 'flying' | 'sent'>('form'); const [err, setErr] = useState('');
  const timer = useResendTimer(60, 'kt_reset_sent_at');
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), mode: 'onTouched' });

  const m = useMutation({
    mutationFn: (email: string) => post('/auth/forgot-password', { email }),
    onSuccess: (_d, email) => { setSentTo(email); timer.restart(); setErr(''); setStage('flying'); setTimeout(() => setStage('sent'), 1300); },
    onError: (e) => setErr(errMsg(e)),
  });

  return (
    <AuthShell title={stage === 'form' ? 'Parolni tiklash' : 'Xat yuborildi'} subtitle={stage === 'form' ? 'Emailingizni kiriting, tiklash havolasini yuboramiz' : undefined} side="plain">
      <AnimatePresence mode="wait">
        {stage === 'form' ? (
          <motion.form key="f" {...swap} noValidate className="space-y-4" onSubmit={handleSubmit((v) => { setErr(''); m.mutate(v.email.trim()); })}>
            <TextField label="Email" type="email" autoComplete="email" inputMode="email" icon={<Mail size={19} />} error={errors.email?.message} {...register('email')} />
            <FormError message={err} />
            <SubmitButton type="submit" loading={m.isPending}><Send size={18} />Havolani yuborish</SubmitButton>
            <Link href="/login" className="flex items-center justify-center gap-1.5 pt-2 text-[15px] font-bold text-primary underline-offset-4 hover:underline"><ArrowLeft size={17} />Kirishga qaytish</Link>
          </motion.form>
        ) : (
          <motion.div key="s" {...swap} className="text-center" role="status" aria-live="polite">
            <Envelope stage={stage === 'flying' ? 'flying' : 'sent'} />
            <p className="mt-3 text-[15.5px] leading-relaxed text-black/65">Agar <b className="break-all text-primary">{sentTo}</b> ro‘yxatdan o‘tgan bo‘lsa, parolni tiklash havolasi yuborildi. Havola 30 daqiqa amal qiladi. Spam papkasini ham tekshiring.</p>
            <div className="mt-6 space-y-3">
              <FormError message={err} />
              <SubmitButton variant="outline" type="button" disabled={timer.left > 0} loading={m.isPending} onClick={() => m.mutate(sentTo)}><RefreshCw size={18} />{timer.left > 0 ? `Qayta yuborish (${timer.left} s)` : 'Qayta yuborish'}</SubmitButton>
              <button type="button" onClick={() => setStage('form')} className="block w-full pt-1 text-[15px] font-bold text-primary underline-offset-4 hover:underline">Boshqa email kiritish</button>
              <Link href="/login" className="block text-[15px] font-semibold text-black/50 hover:text-primary">Kirishga qaytish</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
