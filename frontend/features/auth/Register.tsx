'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Lock, Mail, Phone, School, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { post } from '@/lib/api';
import { ROLE_HOME, errMsg } from '@/lib/format';
import AuthShell, { riseIn } from './AuthShell';
import { Checkbox, FormError, PasswordField, PasswordStrength, SubmitButton, TextField } from './fields';
import { RegisterValues, normPhone, registerSchema } from './schemas';

const ROLES = [
  { id: 'parent', label: 'Men ota-onaman', hint: 'Bog‘cha va repetitor qidiraman, ariza yuboraman', img: '/auth/role_parent.png' },
  { id: 'kindergarten_admin', label: 'Men bog‘cha administratoriman', hint: 'Bog‘cha profilini yuritaman, arizalarni boshqaraman', img: '/auth/role_school.png' },
  { id: 'tutor', label: 'Men repetitorman', hint: 'Darslarimni joylayman, o‘quvchilar bilan ishlayman', img: '/auth/role_tutor.png' },
] as const;
const TITLE: Record<string, string> = { parent: 'Ota-ona', kindergarten_admin: 'Bog‘cha administratori', tutor: 'Repetitor' };
const swap = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.28 } };

export default function Register() {
  const router = useRouter(); const sp = useSearchParams(); const qc = useQueryClient();
  const initial = ROLES.find((r) => r.id === sp.get('role'))?.id || 'parent';
  const [step, setStep] = useState<1 | 2>(1);
  const [formErr, setFormErr] = useState('');
  const { register, control, handleSubmit, watch, setError, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema), mode: 'onTouched', defaultValues: { role: initial, agree: false as any },
  });
  const role = watch('role'); const pwd = watch('password') || '';

  const m = useMutation({
    mutationFn: (v: RegisterValues) => post('/auth/register', { role: v.role, full_name: `${v.first_name.trim()} ${v.last_name.trim()}`, email: v.email.trim(), phone: normPhone(v.phone), password: v.password, provider_name: v.role === 'parent' ? undefined : v.provider_name?.trim() || undefined }),
    onSuccess: (d: any, v) => { qc.clear(); try { sessionStorage.setItem('kt_verify_sent_at', String(Date.now())); if (d?.dev_code) sessionStorage.setItem('kt_dev_code', d.dev_code); } catch {} router.replace(`/verify-email?sent=1&email=${encodeURIComponent(v.email.trim())}&role=${d?.user?.role || v.role}`); },
    onError: (e: any) => {
      const msg = errMsg(e);
      if (e.status === 409 && /email/i.test(msg)) setError('email', { message: msg });
      else if (e.status === 409 && /telefon/i.test(msg)) setError('phone', { message: msg });
      else if (e.code === 'weak_password') setError('password', { message: msg });
      else setFormErr(msg);
    },
  });

  return (
    <AuthShell variant="card" wide={step === 1} step={step} title={step === 1 ? 'Avval, o‘zingizga mos rolni tanlang' : `Ro‘yxatdan o‘tish (${TITLE[role]})`}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.div key="s1" {...swap}>
            <Controller control={control} name="role" render={({ field }) => (
              <div role="radiogroup" aria-label="Rolni tanlang" className="grid gap-3 sm:grid-cols-3">
                {ROLES.map((r) => {
                  const on = field.value === r.id;
                  return (
                    <motion.button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => field.onChange(r.id)} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                      className={`relative flex items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-colors sm:flex-col sm:gap-3 sm:text-center ${on ? 'border-primary bg-primary-50/50 shadow-[0_14px_30px_-16px_rgba(36,92,67,.5)]' : 'border-black/10 hover:border-primary/40'}`}>
                      <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-white"><Check size={14} strokeWidth={3.5} /></motion.span>}</AnimatePresence>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.img} alt="" className="h-20 w-24 shrink-0 object-contain sm:h-28 sm:w-full" />
                      <span><span className="block text-[15px] font-extrabold leading-tight text-[#14392A]">{r.label}</span><span className="mt-1 block text-[12.5px] leading-snug text-black/50">{r.hint}</span></span>
                    </motion.button>
                  );
                })}
              </div>
            )} />
            <div className="mx-auto mt-7 max-w-[300px]"><SubmitButton type="button" onClick={() => setStep(2)}>Davom etish<ArrowRight size={19} /></SubmitButton></div>
            <p className="mt-5 text-center text-[15px] text-black/60">Hisobingiz bormi? <Link href="/login" className="font-bold text-primary underline-offset-4 hover:underline">Kirish</Link></p>
          </motion.div>
        ) : (
          <motion.div key="s2" {...swap}>
            <form noValidate className="space-y-3.5" onSubmit={handleSubmit((v) => { setFormErr(''); m.mutate(v); })}>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <TextField label="Ismingiz" autoComplete="given-name" icon={<UserRound size={19} />} error={errors.first_name?.message} {...register('first_name')} />
                <TextField label="Familiyangiz" autoComplete="family-name" icon={<UserRound size={19} />} error={errors.last_name?.message} {...register('last_name')} />
              </div>
              <AnimatePresence initial={false}>
                {role !== 'parent' && (
                  <motion.div key="prov" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} style={{ overflow: 'hidden' }}>
                    <TextField noAnim label={role === 'tutor' ? 'Profil nomi (ixtiyoriy)' : 'Bog‘cha nomi'} icon={<School size={19} />} error={errors.provider_name?.message} {...register('provider_name')} />
                  </motion.div>
                )}
              </AnimatePresence>
              <TextField label="Email manzilingiz" type="email" autoComplete="email" inputMode="email" icon={<Mail size={19} />} error={errors.email?.message} {...register('email')} />
              <TextField label="Telefon raqamingiz" type="tel" autoComplete="tel" inputMode="tel" icon={<Phone size={19} />} hint="Masalan: +998 90 123 45 67" error={errors.phone?.message} {...register('phone')} />
              <div>
                <PasswordField label="Parol (kamida 8 ta belgi)" autoComplete="new-password" icon={<Lock size={19} />} error={errors.password?.message} {...register('password')} />
                <PasswordStrength value={pwd} />
              </div>
              <PasswordField label="Parolni takrorlang" autoComplete="new-password" icon={<Lock size={19} />} error={errors.password_confirm?.message} {...register('password_confirm')} />
              <Checkbox error={errors.agree?.message} label={<><Link href="#" className="font-bold text-primary underline">Foydalanish shartlariga</Link> va <Link href="#" className="font-bold text-primary underline">maxfiylik siyosatiga</Link> roziman</>} {...register('agree')} />
              <FormError message={formErr} />
              <SubmitButton type="submit" loading={m.isPending}>Hisob yaratish<Check size={19} strokeWidth={3} /></SubmitButton>
            </form>
            <button type="button" onClick={() => setStep(1)} className="mx-auto mt-6 flex items-center gap-1.5 text-[15px] font-bold text-primary underline-offset-4 hover:underline"><ArrowLeft size={17} />Rolni o‘zgartirish</button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
