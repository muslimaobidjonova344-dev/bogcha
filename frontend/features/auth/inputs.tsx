'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, Copy, Phone, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { generateStrongPassword, PASSWORD_RULES } from '@/lib/password';
import { PHONE_PREFIX, checkUzPhone, formatUzPhone } from '@/lib/phone';
import { TextField } from './fields';

/** Telefon maydoni: doim +998 bilan boshlanadi, yozilganda "XX XXX XX XX" shaklida bo'shliq qo'yadi, raqamni darhol tekshiradi. */
export function PhoneField({ value, onChange, onBlur, error, label = 'Telefon raqamingiz', name }: { value?: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; label?: string; name?: string }) {
  const [touched, setTouched] = useState(false);
  const v = value || '';
  const chk = checkUzPhone(v);
  const show = touched && v.replace(/\D/g, '').length > 3;
  const msg = error || (show && !chk.ok ? chk.message : undefined);
  return (
    <TextField
      name={name} label={label} type="tel" inputMode="numeric" autoComplete="tel-national" icon={<Phone size={19} />} maxLength={17}
      value={v} error={msg} hint={chk.ok ? undefined : 'Masalan: +998 90 123 45 67'}
      trailing={chk.ok ? <span className="grid h-10 w-10 place-items-center text-primary" title="Raqam to‘g‘ri"><CheckCircle2 size={21} /></span> : undefined}
      onFocus={() => { if (!v) onChange(PHONE_PREFIX + ' '); }}
      onChange={(e) => { setTouched(true); onChange(formatUzPhone(e.target.value)); }}
      onBlur={() => { setTouched(true); if (v.replace(/\D/g, '').length <= 3) onChange(''); onBlur?.(); }}
    />
  );
}

/** Parol shabloni: talablar ro'yxati (jonli belgilanadi) + "Kuchli parol yaratish" tugmasi. Yaratilgan parol ko'rsatiladi va nusxalanadi. */
export function PasswordTemplate({ value, onGenerate }: { value: string; onGenerate: (pw: string) => void }) {
  const [gen, setGen] = useState('');
  const [copied, setCopied] = useState(false);
  const make = () => { const p = generateStrongPassword(); setGen(p); setCopied(false); onGenerate(p); };
  const copy = async () => { try { await navigator.clipboard.writeText(gen); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard yo'q */ } };
  const stale = gen && value !== gen; // foydalanuvchi o'zgartirgan bo'lsa, yaratilgan parolni ko'rsatmaymiz
  return (
    <div className="mt-2 rounded-2xl border border-primary/15 bg-primary-50/50 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-extrabold text-primary">Kuchli parol shabloni</p>
        <button type="button" onClick={make} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-primary-600 active:scale-95"><Sparkles size={15} />Kuchli parol yaratish</button>
      </div>
      <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => { const ok = !!value && r.test(value); return (
          <li key={r.id} className={`flex items-start gap-2 text-[12.5px] leading-snug transition-colors ${ok ? 'font-semibold text-primary' : 'text-black/50'}`}>
            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${ok ? 'bg-primary text-white' : 'bg-black/10 text-black/40'}`}>{ok ? <Check size={11} strokeWidth={3.5} /> : <X size={10} strokeWidth={3} />}</span>{r.label}
          </li>); })}
      </ul>
      <AnimatePresence initial={false}>
        {gen && !stale && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-white px-3 py-2.5">
              <code className="flex-1 select-all break-all text-[15px] font-bold tracking-wide text-[#14392A]">{gen}</code>
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-[12.5px] font-bold text-primary active:scale-95">{copied ? <><Check size={14} />Nusxalandi</> : <><Copy size={14} />Nusxalash</>}</button>
            </div>
            <p className="mt-1.5 text-[12px] text-black/50">Parol ikkala maydonga avtomatik kiritildi. Uni xavfsiz joyga saqlab qo‘ying.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
