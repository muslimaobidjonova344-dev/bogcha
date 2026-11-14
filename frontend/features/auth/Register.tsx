'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Baby, Building2, GraduationCap, Lock, Mail, Phone, UserRound, UserPlus, School } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { post } from '@/lib/api';
import { ROLE_HOME, errMsg } from '@/lib/format';
import AuthShell, { rise } from './AuthShell';
import { Checkbox, FormError, PasswordField, PasswordStrength, SubmitButton, TextField } from './fields';
import GoogleButton from './GoogleButton';
import { RegisterValues, normPhone, registerSchema } from './schemas';

const ROLES = [
  { id: 'parent', label: 'Ota-ona', hint: 'Bog‘cha va repetitor qidiraman', icon: Baby },
  { id: 'kindergarten_admin', label: 'Bog‘cha administratori', hint: 'Bog‘chamni joylayman', icon: Building2 },
  { id: 'tutor', label: 'Repetitor', hint: 'Dars beraman', icon: GraduationCap },
] as const;

export default function Register() {
  const router = useRouter(); const sp = useSearchParams(); const qc = useQueryClient();
  const initial = ROLES.find((r) => r.id === sp.get('role'))?.id || 'parent';
  const [formErr, setFormErr] = useState('');
  const { register, control, handleSubmit, watch, setError, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema), mode: 'onTouched', defaultValues: { role: initial, agree: false as any },
  });
  const role = watch('role'); const pwd = watch('password') || '';

  const m = useMutation({
    mutationFn: (v: RegisterValues) => post('/auth/register', { role: v.role, full_name: v.full_name.trim(), email: v.email.trim(), phone: normPhone(v.phone), password: v.password, provider_name: v.role === 'parent' ? undefined : v.provider_name?.trim() || undefined }),
    onSuccess: (d: any, v) => { qc.clear(); try { sessionStorage.setItem('kt_verify_sent_at', String(Date.now())); } catch {} router.replace(`/verify-email?sent=1&email=${encodeURIComponent(v.email.trim())}&role=${d?.user?.role || v.role}`); },
    onError: (e: any) => {
      const msg = errMsg(e);
      if (e.status === 409 && /email/i.test(msg)) setError('email', { message: msg });
      else if (e.status === 409 && /telefon/i.test(msg)) setError('phone', { message: msg });
      else if (e.code === 'weak_password') setError('password', { message: msg });
      else setFormErr(msg);
    },
  });

  const providerName = watch('provider_name');
  const g = useMutation({
    mutationFn: (credential: string) => post('/auth/google', { credential, role, provider_name: role === 'parent' ? undefined : providerName?.trim() || undefined, remember: true }),
    onSuccess: (d: any) => { qc.clear(); router.replace(ROLE_HOME[d?.user?.role || role] || '/'); },
    onError: (e: any) => setFormErr(errMsg(e)),
  });

  return (
    <AuthShell title="Hisob yaratish" subtitle="Bir necha daqiqada Kichkintoy oilasiga qo‘shiling" side="register">
      <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => { setFormErr(''); m.mutate(v); })}>
        <motion.fieldset variants={rise} className="space-y-2">
          <legend className="mb-2 text-[13px] font-bold uppercase tracking-wider text-black/45">Siz kimsiz?</legend>
          <Controller control={control} name="role" render={({ field }) => (
            <div role="radiogroup" aria-label="Rolni tanlang" className="grid gap-2 sm:grid-cols-3">
              {ROLES.map((r) => {
                const on = field.value === r.id;
                return (
                  <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => field.onChange(r.id)}
                    className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors sm:flex-col sm:items-start sm:gap-2 ${on ? 'border-primary bg-primary-50' : 'border-black/10 bg-white hover:border-primary/40'}`}>
                    {on && <motion.span layoutId="role-ring" className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${on ? 'bg-primary text-white' : 'bg-secondary-light text-primary'}`}><r.icon size={20} /></span>
                    <span><span className="block text-[14px] font-extrabold leading-tight text-primary">{r.label}</span><span className="block text-[12px] leading-tight text-black/50">{r.hint}</span></span>
                  </button>
                );
              })}
            </div>
          )} />
        </motion.fieldset>

        <TextField label="Ism va familiya" autoComplete="name" icon={<UserRound size={19} />} error={errors.full_name?.message} {...register('full_name')} />
        <AnimatePresence initial={false}>
          {role !== 'parent' && (
            <motion.div key="prov" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-visible">
              <TextField label={role === 'tutor' ? 'Profil nomi (ixtiyoriy)' : 'Bog‘cha nomi'} icon={<School size={19} />} error={errors.provider_name?.message} {...register('provider_name')} />
            </motion.div>
          )}
        </AnimatePresence>
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" icon={<Mail size={19} />} error={errors.email?.message} {...register('email')} />
        <TextField label="Telefon" type="tel" autoComplete="tel" inputMode="tel" icon={<Phone size={19} />} hint="Masalan: +998 90 123 45 67" error={errors.phone?.message} {...register('phone')} />
        <div>
          <PasswordField label="Parol" autoComplete="new-password" icon={<Lock size={19} />} error={errors.password?.message} hint="Kamida 8 belgi, harf va raqam" {...register('password')} />
          <PasswordStrength value={pwd} />
        </div>
        <PasswordField label="Parolni tasdiqlang" autoComplete="new-password" icon={<Lock size={19} />} error={errors.password_confirm?.message} {...register('password_confirm')} />
        <Checkbox error={errors.agree?.message} label={<>Men <Link href="#" className="font-bold text-primary underline">foydalanish shartlari</Link> va <Link href="#" className="font-bold text-primary underline">maxfiylik siyosati</Link> bilan tanishdim va roziman</>} {...register('agree')} />
        <FormError message={formErr} />
        <SubmitButton type="submit" loading={m.isPending}><UserPlus size={19} />Hisob yaratish</SubmitButton>
      </form>
      <motion.div variants={rise} className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-black/35"><span className="h-px flex-1 bg-black/10" />yoki<span className="h-px flex-1 bg-black/10" /></motion.div>
      <GoogleButton label="Google bilan ro‘yxatdan o‘tish" onCredential={(c) => { setFormErr(''); g.mutate(c); }} disabled={g.isPending} />
      <motion.p variants={rise} className="mt-6 text-center text-[15px] text-black/60">Hisobingiz bormi? <Link href="/login" className="font-bold text-primary underline-offset-4 hover:underline">Kirish</Link></motion.p>
    </AuthShell>
  );
}
