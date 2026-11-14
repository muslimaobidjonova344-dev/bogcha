'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Baby, Building2, GraduationCap, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Button, Card, Field, SuccessCheck, useToast } from '@/components/ui/ui';
import { post } from '@/lib/api';
import { ROLE_HOME, errMsg } from '@/lib/format';

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

function Box({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Card className="!p-6"><h1 className="text-2xl font-extrabold text-primary">{title}</h1>{sub && <p className="mt-1 text-sm text-black/55">{sub}</p>}<div className="mt-5">{children}</div></Card>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter(); const sp = useSearchParams(); const qc = useQueryClient(); const toast = useToast();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [code, setCode] = useState(''); const [need2fa, setNeed2fa] = useState(false); const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => post('/auth/login', { email, password, totp_code: need2fa ? code : undefined }),
    onSuccess: (d: any) => { qc.clear(); const role = d?.user?.role; router.replace(safeNext(sp.get('next')) || ROLE_HOME[role] || '/'); },
    onError: (e: any) => { if (e.code === 'totp_required') { setNeed2fa(true); setErr(''); } else setErr(errMsg(e)); },
  });
  return (
    <Box title="Kirish" sub="Hisobingizga kiring">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(''); m.mutate(); }}>
        <Field label="Email"><input type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Parol"><input type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {need2fa && <Field label="2FA kodi" hint="Autentifikator ilovasidagi 6 xonali kod"><input inputMode="numeric" maxLength={6} className="input" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>}
        {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
        <Button type="submit" className="w-full" loading={m.isPending}>Kirish</Button>
      </form>
      <div className="mt-4 flex justify-between text-sm"><Link className="font-semibold text-primary underline" href="/forgot-password">Parolni unutdingizmi?</Link><Link className="font-semibold text-primary underline" href="/register">Ro‘yxatdan o‘tish</Link></div>
    </Box>
  );
}

const ROLES = [
  { id: 'parent', label: 'Ota-ona', text: 'Bog‘cha va repetitor qidiraman', icon: Baby },
  { id: 'kindergarten_admin', label: 'Bog‘cha', text: 'Bog‘cha ma‘muriyatiman', icon: Building2 },
  { id: 'tutor', label: 'Repetitor', text: 'Dars beraman', icon: GraduationCap },
];

export function RegisterForm() {
  const router = useRouter(); const sp = useSearchParams(); const qc = useQueryClient();
  const [role, setRole] = useState(sp.get('role') && ROLES.some((r) => r.id === sp.get('role')) ? sp.get('role')! : 'parent');
  const [f, setF] = useState({ full_name: '', email: '', phone: '', password: '', provider_name: '' }); const [agree, setAgree] = useState(false); const [err, setErr] = useState('');
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const m = useMutation({
    mutationFn: () => post('/auth/register', { role, full_name: f.full_name, email: f.email, password: f.password, phone: f.phone || undefined, provider_name: role === 'parent' ? undefined : f.provider_name || undefined }),
    onSuccess: (d: any) => { qc.clear(); router.replace(`/verify-email?sent=1&email=${encodeURIComponent(f.email)}&next=${encodeURIComponent(ROLE_HOME[d?.user?.role || role] || '/')}`); },
    onError: (e) => setErr(errMsg(e)),
  });
  const weak = f.password.length > 0 && (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password));
  return (
    <Box title="Ro‘yxatdan o‘tish" sub="Rolingizni tanlang">
      <div className="mb-4 grid grid-cols-3 gap-2">{ROLES.map((r) => (<button type="button" key={r.id} onClick={() => setRole(r.id)} className={`rounded-2xl border p-3 text-center transition ${role === r.id ? 'border-primary bg-primary-50 shadow-card' : 'border-black/10 bg-white'}`}><r.icon className="mx-auto text-primary" size={22} /><div className="mt-1 text-sm font-bold">{r.label}</div></button>))}</div>
      <p className="mb-3 text-xs text-black/50">{ROLES.find((r) => r.id === role)?.text}</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(''); m.mutate(); }}>
        <Field label="Ism va familiya"><input required minLength={2} className="input" autoComplete="name" value={f.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
        {role !== 'parent' && <Field label={role === 'tutor' ? 'Profil nomi (ixtiyoriy)' : 'Bog‘cha nomi'}><input required={role === 'kindergarten_admin'} className="input" value={f.provider_name} onChange={(e) => set('provider_name', e.target.value)} /></Field>}
        <Field label="Email"><input type="email" required className="input" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Telefon (ixtiyoriy)" hint="+998901234567"><input className="input" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Parol" hint="Kamida 8 belgi, harf va raqam" error={weak ? 'Parol juda oddiy' : undefined}><input type="password" required minLength={8} className="input" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>Foydalanish shartlari va shaxsiy ma‘lumotlarni qayta ishlashga roziman</span></label>
        {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
        <Button type="submit" className="w-full" loading={m.isPending} disabled={!agree || weak}>Ro‘yxatdan o‘tish</Button>
      </form>
      <p className="mt-4 text-center text-sm">Hisobingiz bormi? <Link className="font-semibold text-primary underline" href="/login">Kirish</Link></p>
    </Box>
  );
}

export function VerifyEmail() {
  const sp = useSearchParams(); const router = useRouter(); const toast = useToast(); const qc = useQueryClient();
  const token = sp.get('token'); const email = sp.get('email') || '';
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'fail'>(token ? 'loading' : 'idle'); const [msg, setMsg] = useState('');
  const ran = useRef(false);
  useEffect(() => {
    if (!token || ran.current) return; ran.current = true;
    post('/auth/verify-email', { token }).then(() => { setState('ok'); qc.invalidateQueries({ queryKey: ['me'] }); }).catch((e) => { setState('fail'); setMsg(errMsg(e)); });
  }, [token]); // eslint-disable-line
  const resend = useMutation({ mutationFn: () => post('/auth/resend-verification', { email }), onSuccess: () => toast.ok('Xat qayta yuborildi'), onError: (e) => toast.err(errMsg(e)) });
  if (token) return (
    <Box title="Emailni tasdiqlash">
      {state === 'loading' && <p className="text-center text-black/60">Tekshirilmoqda…</p>}
      {state === 'ok' && <div className="text-center"><SuccessCheck /><p className="mt-3 font-bold text-primary">Email muvaffaqiyatli tasdiqlandi!</p><Button className="mt-4" onClick={() => router.replace('/login')}>Davom etish</Button></div>}
      {state === 'fail' && <div className="text-center"><p className="font-semibold text-red-600">{msg}</p>{email && <Button className="mt-4" variant="outline" loading={resend.isPending} onClick={() => resend.mutate()}>Qayta yuborish</Button>}<Link className="mt-3 block text-sm underline" href="/login">Kirish sahifasiga</Link></div>}
    </Box>
  );
  return (
    <Box title="Emailingizni tasdiqlang">
      <div className="text-center"><MailCheck className="mx-auto text-primary" size={44} /><p className="mt-3 text-sm text-black/70">{email ? <>Tasdiqlash havolasi <b>{email}</b> manziliga yuborildi.</> : 'Tasdiqlash havolasi emailingizga yuborildi.'} Havola 30 daqiqa amal qiladi. Spam papkasini ham tekshiring.</p>
        {email && <Button className="mt-4" variant="outline" loading={resend.isPending} onClick={() => resend.mutate()}>Xatni qayta yuborish</Button>}
        <Link className="mt-4 block text-sm font-semibold text-primary underline" href={safeNext(sp.get('next')) || '/login'}>Keyinroq tasdiqlayman</Link></div>
    </Box>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [err, setErr] = useState('');
  const m = useMutation({ mutationFn: () => post('/auth/forgot-password', { email }), onSuccess: () => setSent(true), onError: (e) => setErr(errMsg(e)) });
  return (
    <Box title="Parolni tiklash" sub="Emailingizni kiriting, havola yuboramiz">
      {sent ? <p className="text-sm text-black/70">Agar bu email ro‘yxatdan o‘tgan bo‘lsa, parolni tiklash havolasi yuborildi (30 daqiqa amal qiladi).</p> :
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(''); m.mutate(); }}><Field label="Email"><input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>{err && <p className="text-sm text-red-600">{err}</p>}<Button type="submit" className="w-full" loading={m.isPending}>Havola yuborish</Button></form>}
      <Link className="mt-4 block text-center text-sm font-semibold text-primary underline" href="/login">Kirishga qaytish</Link>
    </Box>
  );
}

export function ResetPassword() {
  const sp = useSearchParams(); const router = useRouter(); const token = sp.get('token') || '';
  const [p, setP] = useState(''); const [c, setC] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState(false);
  const m = useMutation({ mutationFn: () => post('/auth/reset-password', { token, password: p, password_confirm: c }), onSuccess: () => { setOk(true); setTimeout(() => router.replace('/login'), 1800); }, onError: (e) => setErr(errMsg(e)) });
  if (!token) return <Box title="Havola yaroqsiz"><Link className="text-primary underline" href="/forgot-password">Qaytadan so‘rang</Link></Box>;
  return (
    <Box title="Yangi parol">
      {ok ? <div className="text-center"><SuccessCheck /><p className="mt-3 font-bold text-primary">Parol yangilandi</p></div> :
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(''); m.mutate(); }}>
          <Field label="Yangi parol" hint="Kamida 8 belgi, harf va raqam"><input type="password" required minLength={8} className="input" autoComplete="new-password" value={p} onChange={(e) => setP(e.target.value)} /></Field>
          <Field label="Parolni takrorlang" error={c && c !== p ? 'Parollar bir xil emas' : undefined}><input type="password" required className="input" autoComplete="new-password" value={c} onChange={(e) => setC(e.target.value)} /></Field>
          {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
          <Button type="submit" className="w-full" loading={m.isPending} disabled={!p || p !== c}>Saqlash</Button></form>}
    </Box>
  );
}
