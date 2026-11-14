'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, LogIn, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { post } from '@/lib/api';
import { ROLE_HOME, errMsg } from '@/lib/format';
import AuthShell, { rise } from './AuthShell';
import { Checkbox, FormError, PasswordField, SubmitButton, TextField } from './fields';
import { LoginValues, loginSchema, normPhone } from './schemas';

export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export default function Login() {
  const router = useRouter(); const sp = useSearchParams(); const qc = useQueryClient();
  const [need2fa, setNeed2fa] = useState(false); const [code, setCode] = useState(''); const [formErr, setFormErr] = useState(''); const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched', defaultValues: { remember: true } });

  const m = useMutation({
    mutationFn: (v: LoginValues) => post('/auth/login', { identifier: v.identifier.includes('@') ? v.identifier.trim() : normPhone(v.identifier), password: v.password, remember: v.remember, totp_code: need2fa ? code : undefined }),
    onSuccess: (d: any) => { setDone(true); qc.clear(); const role = d?.user?.role; setTimeout(() => router.replace(safeNext(sp.get('next')) || ROLE_HOME[role] || '/'), 450); },
    onError: (e: any) => { if (e.code === 'totp_required') { setNeed2fa(true); setFormErr(''); } else setFormErr(errMsg(e)); },
  });

  return (
    <AuthShell title="Xush kelibsiz!" subtitle="Hisobingizga kiring va davom eting" side="login">
      {sp.get('reset') && <div className="mb-4 rounded-2xl bg-primary-50 px-4 py-3 text-sm font-semibold text-primary">Parol yangilandi. Endi yangi parol bilan kiring.</div>}
      <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => { setFormErr(''); m.mutate(v); })}>
        <TextField label="Email yoki telefon" autoComplete="username" inputMode="email" icon={<UserRound size={19} />} error={errors.identifier?.message} {...register('identifier')} />
        <PasswordField label="Parol" autoComplete="current-password" icon={<Lock size={19} />} error={errors.password?.message} {...register('password')} />
        {need2fa && <TextField label="2FA kodi (6 xonali)" inputMode="numeric" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} hint="Autentifikator ilovasidagi kod" />}
        <motion.div variants={rise} className="flex items-center justify-between gap-3">
          <Checkbox label="Meni eslab qolish" {...register('remember')} />
          <Link href="/forgot-password" className="shrink-0 text-[14px] font-bold text-primary underline-offset-4 hover:underline">Parolni unutdingizmi?</Link>
        </motion.div>
        <FormError message={formErr} />
        <SubmitButton type="submit" loading={m.isPending} success={done}><LogIn size={19} />Kirish</SubmitButton>
      </form>

      <motion.div variants={rise} className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-black/35"><span className="h-px flex-1 bg-black/10" />yoki<span className="h-px flex-1 bg-black/10" /></motion.div>
      <motion.button variants={rise} type="button" disabled title="Google orqali kirish tez orada qo‘shiladi" className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white text-[15px] font-bold text-black/40">
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" /><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
        Google orqali kirish <span className="rounded-full bg-sun-light px-2 py-0.5 text-[11px] font-bold text-amber-800">Tez orada</span>
      </motion.button>
      <motion.p variants={rise} className="mt-6 text-center text-[15px] text-black/60">Hisobingiz yo‘qmi? <Link href="/register" className="font-bold text-primary underline-offset-4 hover:underline">Ro‘yxatdan o‘ting</Link></motion.p>
    </AuthShell>
  );
}
