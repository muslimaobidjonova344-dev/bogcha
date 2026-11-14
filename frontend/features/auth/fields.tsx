'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { forwardRef, InputHTMLAttributes, ReactNode, useId, useState } from 'react';
import { riseIn } from './AuthShell';
import { passwordScore } from './schemas';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; icon?: ReactNode; hint?: string; trailing?: ReactNode; noAnim?: boolean };

/** Suzuvchi label'li input: fokusda halqa va rang silliq o'zgaradi, xato pastdan chiqadi. */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, error, icon, hint, trailing, noAnim, className = '', ...rest }, ref) {
  const id = useId();
  const [focus, setFocus] = useState(false);
  const Wrap: any = noAnim ? 'div' : motion.div;
  return (
    <Wrap {...(noAnim ? {} : riseIn)}>
      <div className={`group relative rounded-2xl border bg-white transition-all duration-200 ${error ? 'border-red-400 ring-4 ring-red-100' : focus ? 'border-primary ring-4 ring-primary/15' : 'border-black/10 hover:border-primary/40'}`}>
        {icon && <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focus ? 'text-primary' : 'text-black/35'}`}>{icon}</span>}
        <input
          id={id} ref={ref} placeholder=" " aria-invalid={!!error} aria-describedby={error ? id + '-e' : hint ? id + '-h' : undefined}
          {...rest}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          className={`peer h-14 w-full rounded-2xl bg-transparent pb-1 pt-5 text-[16px] text-ink outline-none ${icon ? 'pl-12' : 'pl-4'} ${trailing ? 'pr-12' : 'pr-4'} ${className}`}
        />
        <label htmlFor={id} className={`pointer-events-none absolute ${icon ? 'left-12' : 'left-4'} top-1/2 origin-left -translate-y-1/2 text-[15px] text-black/45 transition-all duration-200 peer-focus:top-3.5 peer-focus:scale-[0.78] peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:scale-[0.78]`}>{label}</label>
        {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      <FieldMsg id={id} error={error} hint={hint} />
    </Wrap>
  );
});

export function FieldMsg({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {error ? (
        <motion.p key="e" id={id + '-e'} role="alert" initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5 overflow-hidden pl-1 pt-1.5 text-[13px] font-semibold text-red-600">
          <AlertCircle size={14} className="shrink-0" />{error}
        </motion.p>
      ) : hint ? <p key="h" id={id + '-h'} className="pl-1 pt-1.5 text-[12.5px] text-black/45">{hint}</p> : null}
    </AnimatePresence>
  );
}

export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'trailing'>>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <TextField ref={ref} {...props} type={show ? 'text' : 'password'}
      trailing={<button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'} className="grid h-10 w-10 place-items-center rounded-xl text-black/45 transition hover:bg-primary-50 hover:text-primary active:scale-90">{show ? <EyeOff size={19} /> : <Eye size={19} />}</button>} />
  );
});

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const s = passwordScore(value);
  const labels = ['Juda oddiy', 'Oddiy', 'Yaxshi', 'Kuchli', 'Juda kuchli'];
  const colors = ['#E5483D', '#F4A261', '#E9C768', '#8FAE98', '#245C43'];
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden pt-2" aria-live="polite">
      <div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10"><motion.div className="h-full rounded-full" initial={false} animate={{ width: i < s ? '100%' : '0%', backgroundColor: colors[Math.max(0, s - 1)] }} transition={{ duration: 0.3 }} /></div>)}</div>
      <p className="mt-1 pl-1 text-[12.5px] font-semibold" style={{ color: colors[Math.max(0, s - 1)] }}>{labels[s]}</p>
    </motion.div>
  );
}

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; error?: string }>(function Checkbox({ label, error, ...rest }, ref) {
  const id = useId();
  return (
    <motion.div {...riseIn}>
      <label htmlFor={id} className="flex cursor-pointer select-none items-start gap-3 py-1">
        <input id={id} ref={ref} type="checkbox" className="peer sr-only" {...rest} />
        <span className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 bg-white transition-all duration-150 peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25 peer-checked:border-primary peer-checked:bg-primary [&>svg]:scale-0 peer-checked:[&>svg]:scale-100 ${error ? 'border-red-400' : 'border-black/25'}`}>
          <Check size={15} strokeWidth={3.5} className="text-white transition-transform duration-150" />
        </span>
        <span className="text-[14.5px] leading-snug text-black/70">{label}</span>
      </label>
      <FieldMsg id={id} error={error} />
    </motion.div>
  );
});

/** Asosiy tugma: bosilganda kichrayadi, yuklanayotganda spinner, muvaffaqiyatda belgi. */
export function SubmitButton({ children, loading, success, disabled, variant = 'primary', ...rest }: { children: ReactNode; loading?: boolean; success?: boolean; disabled?: boolean; variant?: 'primary' | 'outline' } & Omit<React.ComponentProps<typeof motion.button>, 'children' | 'disabled'>) {
  const base = variant === 'primary' ? 'bg-primary text-white shadow-[0_8px_20px_-6px_rgba(36,92,67,.55)] hover:bg-primary-600' : 'border border-primary/30 bg-white text-primary hover:bg-primary-50';
  return (
    <motion.button {...riseIn} whileHover={disabled || loading ? undefined : { y: -1 }} whileTap={disabled || loading ? undefined : { scale: 0.97 }} disabled={disabled || loading}
      className={`relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[16px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${base}`} {...rest}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? <motion.span key="l" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><Loader2 className="animate-spin" size={20} />Iltimos, kuting…</motion.span>
          : success ? <motion.span key="s" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2"><Check size={20} strokeWidth={3} />Tayyor</motion.span>
          : <motion.span key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">{children}</motion.span>}
      </AnimatePresence>
    </motion.button>
  );
}

export function FormError({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div role="alert" initial={{ opacity: 0, height: 0, y: -6 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" />{message}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Yashil galochka animatsiyasi: doira chiziladi, belgi chiziladi, yulduzchalar sochiladi. */
export function SuccessCheck({ size = 112 }: { size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} aria-hidden>
      {[...Array(8)].map((_, i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full" style={{ background: ['#E9C768', '#F4C7A8', '#8FAE98'][i % 3] }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }} animate={{ x: Math.cos((i / 8) * Math.PI * 2) * size * 0.72, y: Math.sin((i / 8) * Math.PI * 2) * size * 0.72, opacity: [0, 1, 0], scale: [0, 1.2, 0] }} transition={{ delay: 0.55, duration: 0.9, ease: 'easeOut' }} />
      ))}
      <motion.svg viewBox="0 0 120 120" width={size} height={size} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
        <circle cx="60" cy="60" r="54" fill="#EEF5F1" />
        <motion.circle cx="60" cy="60" r="46" fill="none" stroke="#245C43" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ rotate: -90, transformOrigin: '60px 60px' }} />
        <motion.path d="M38 62 L54 77 L83 46" fill="none" stroke="#245C43" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.4, ease: 'easeOut' }} />
      </motion.svg>
    </div>
  );
}
