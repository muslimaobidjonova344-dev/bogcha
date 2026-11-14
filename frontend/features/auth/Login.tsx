'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, Phone, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { post } from '@/lib/api';
import { ROLE_HOME, errMsg } from '@/lib/format';
import AuthShell, { riseIn } from './AuthShell';
import { Checkbox, FormError, PasswordField, SubmitButton, TextField } from './fields';
import { LoginValues, loginSchema, normPhone } from './schemas';

export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

// Sinov (demo) hisoblari: backendda `python -m app.seed --demo` (yoki SEED_DEMO=1) bajarilgan bo'lsa ishlaydi.
const DEMO = [
  { label: 'Ota-ona', email: 'demo.parent@example.com' },
  { label: 'Bog‘cha admini', email: 'demo.kg1@example.com' },
  { label: 'Repetitor', email: 'demo.tutor1@example.com' },
];
const DEMO_PASSWORD = 'Demo12345';

export default function Login() {
  const router = useRouter(); const sp = useSearchParams(); const qc = useQueryClient();
  const [need2fa, setNeed2fa] = useState(false); const [code, setCode] = useState(''); const [formErr, setFormErr] = useState(''); const [done, setDone] = useState(false);
  const [mode, setMode] = useState<'email' | 'phone'>('email'); const [demoOpen, setDemoOpen] = useState(false);
  const { register, handleSubmit, setValue, clearErrors, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched', defaultValues: { remember: true } });

  const m = useMutation({
    mutationFn: (v: LoginValues) => post('/auth/login', { identifier: v.identifier.includes('@') ? v.identifier.trim() : normPhone(v.identifier), password: v.password, remember: v.remember, totp_code: need2fa ? code : undefined }),
    onSuccess: (d: any) => { setDone(true); qc.clear(); const role = d?.user?.role; setTimeout(() => router.replace(safeNext(sp.get('next')) || ROLE_HOME[role] || '/'), 450); },
    onError: (e: any) => { if (e.code === 'totp_required') { setNeed2fa(true); setFormErr(''); } else setFormErr(errMsg(e)); },
  });

  const fillDemo = (email: string) => { setMode('email'); setTimeout(() => { setValue('identifier', email, { shouldValidate: true }); setValue('password', DEMO_PASSWORD, { shouldValidate: true }); }, 0); };

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
        <motion.div {...riseIn} className="flex items-center justify-between gap-3">
          <Checkbox label="Meni eslab qolish" {...register('remember')} />
          <Link href="/forgot-password" className="shrink-0 text-[14px] font-bold text-primary underline-offset-4 hover:underline">Parolni unutdingizmi?</Link>
        </motion.div>
        <FormError message={formErr} />
        <SubmitButton type="submit" loading={m.isPending} success={done}>Kirish<ArrowRight size={19} /></SubmitButton>
      </form>

      <motion.p {...riseIn} className="mt-6 text-center text-[15px] text-black/60">Hisobingiz yo‘qmi? <Link href="/register" className="font-bold text-primary underline-offset-4 hover:underline">Ro‘yxatdan o‘ting</Link></motion.p>

      <div className="mt-5 border-t border-dashed border-black/10 pt-4">
        <button type="button" onClick={() => setDemoOpen((o) => !o)} className="mx-auto flex items-center gap-1.5 text-[13px] font-bold text-amber-700"><Sparkles size={15} />Sinov uchun demo hisoblar</button>
        <AnimatePresence initial={false}>
          {demoOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 grid grid-cols-3 gap-2">{DEMO.map((d) => (
                <button key={d.email} type="button" onClick={() => fillDemo(d.email)} className="rounded-xl border border-amber-200 bg-sun-light px-2 py-2 text-[12.5px] font-bold text-amber-900 transition hover:-translate-y-0.5 hover:shadow-card">{d.label}</button>
              ))}</div>
              <p className="mt-2 text-center text-[11.5px] text-black/45">Parol: {DEMO_PASSWORD}. Hisoblar sinov ma‘lumotlari yuklangan bo‘lsagina ishlaydi.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}
