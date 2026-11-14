'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { post } from '@/lib/api';
import { ROLE_HOME, errMsg } from '@/lib/format';
import AuthShell, { rise } from './AuthShell';
import { Checkbox, FormError, PasswordField, SubmitButton, TextField } from './fields';
import GoogleButton from './GoogleButton';
import RolePicker from './RolePicker';
import { LoginValues, loginSchema, normPhone } from './schemas';

export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export default function Login() {
  const router = useRouter(); const sp = useSearchParams(); const qc = useQueryClient();
  const [cred, setCred] = useState(''); const [needRole, setNeedRole] = useState(false); const [need2fa, setNeed2fa] = useState(false); const [code, setCode] = useState(''); const [formErr, setFormErr] = useState(''); const [done, setDone] = useState(false);
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const { register, handleSubmit, setValue, clearErrors, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched', defaultValues: { remember: true } });

  const m = useMutation({
    mutationFn: (v: LoginValues) => post('/auth/login', { identifier: v.identifier.includes('@') ? v.identifier.trim() : normPhone(v.identifier), password: v.password, remember: v.remember, totp_code: need2fa ? code : undefined }),
    onSuccess: (d: any) => { setDone(true); qc.clear(); const role = d?.user?.role; setTimeout(() => router.replace(safeNext(sp.get('next')) || ROLE_HOME[role] || '/'), 450); },
    onError: (e: any) => { if (e.code === 'totp_required') { setNeed2fa(true); setFormErr(''); } else setFormErr(errMsg(e)); },
  });

  const g = useMutation({
    mutationFn: (b: { credential: string; role?: string; provider_name?: string }) => post('/auth/google', { ...b, remember: true }),
    onSuccess: (d: any) => { setDone(true); qc.clear(); const role = d?.user?.role; setTimeout(() => router.replace(safeNext(sp.get('next')) || ROLE_HOME[role] || '/'), 450); },
    onError: (e: any) => { if (e.code === 'role_required') { setNeedRole(true); setFormErr(''); } else { setNeedRole(false); setFormErr(errMsg(e)); } },
  });

  if (needRole) {
    return (
      <AuthShell variant="hero" title="Deyarli tayyor!">
        <RolePicker loading={g.isPending} error={formErr} onCancel={() => { setNeedRole(false); setCred(''); }} onPick={(role, provider_name) => g.mutate({ credential: cred, role, provider_name })} />
      </AuthShell>
    );
  }

  return (
    <AuthShell variant="hero" title="Tizimga kirish" emoji="👋" subtitle="Hisobingizga kiring va barcha imkoniyatlardan foydalaning">
      {sp.get('reset') && <div className="mb-4 rounded-2xl bg-primary-50 px-4 py-3 text-sm font-semibold text-primary">Parol yangilandi. Endi yangi parol bilan kiring.</div>}
      <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => { setFormErr(''); m.mutate(v); })}>
        <div role="tablist" aria-label="Kirish usuli" className="relative grid grid-cols-2 rounded-full bg-primary-50 p-1">
          {([['email', 'Email orqali'], ['phone', 'Telefon orqali']] as const).map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setValue('identifier', ''); clearErrors('identifier'); }} className={`relative z-10 h-11 rounded-full text-[15px] font-bold transition-colors ${mode === k ? 'text-white' : 'text-primary/80'}`}>
              {mode === k && <motion.span layoutId="login-tab" className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_6px_16px_-6px_rgba(36,92,67,.6)]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              {t}
            </button>
          ))}
        </div>
        <TextField key={mode} label={mode === 'email' ? 'Email manzilingiz' : 'Telefon raqamingiz'} autoComplete={mode === 'email' ? 'email' : 'tel'} inputMode={mode === 'email' ? 'email' : 'tel'} type={mode === 'email' ? 'email' : 'tel'} hint={mode === 'phone' ? 'Masalan: +998 90 123 45 67' : undefined} icon={mode === 'email' ? <Mail size={19} /> : <Phone size={19} />} error={errors.identifier?.message} {...register('identifier')} />
        <PasswordField label="Parol" autoComplete="current-password" icon={<Lock size={19} />} error={errors.password?.message} {...register('password')} />
        {need2fa && <TextField label="2FA kodi (6 xonali)" inputMode="numeric" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} hint="Autentifikator ilovasidagi kod" />}
        <motion.div variants={rise} className="flex items-center justify-between gap-3">
          <Checkbox label="Meni eslab qolish" {...register('remember')} />
          <Link href="/forgot-password" className="shrink-0 text-[14px] font-bold text-primary underline-offset-4 hover:underline">Parolni unutdingizmi?</Link>
        </motion.div>
        <FormError message={formErr} />
        <SubmitButton type="submit" loading={m.isPending} success={done}>Kirish<ArrowRight size={19} /></SubmitButton>
      </form>

      <motion.div variants={rise} className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-black/35"><span className="h-px flex-1 bg-black/10" />yoki<span className="h-px flex-1 bg-black/10" /></motion.div>
      <GoogleButton onCredential={(c) => { setFormErr(""); setCred(c); g.mutate({ credential: c }); }} disabled={g.isPending || m.isPending} />
      <motion.p variants={rise} className="mt-6 text-center text-[15px] text-black/60">Hisobingiz yo‘qmi? <Link href="/register" className="font-bold text-primary underline-offset-4 hover:underline">Ro‘yxatdan o‘ting</Link></motion.p>
    </AuthShell>
  );
}
