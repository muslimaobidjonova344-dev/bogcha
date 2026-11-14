'use client';
import { motion } from 'framer-motion';
import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';

/** 6 xonali kod kiritish: avtomatik keyingi katakka o'tadi, joylashtirish (paste) va Backspace ishlaydi. */
export default function Otp({ value, onChange, onComplete, error, disabled, shakeKey = 0 }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; error?: boolean; disabled?: boolean; shakeKey?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  useEffect(() => { refs.current[Math.min(value.length, 5)]?.focus(); }, [value.length]);

  const set = (v: string) => { const clean = v.replace(/\D/g, '').slice(0, 6); onChange(clean); if (clean.length === 6) onComplete?.(clean); };
  const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') { e.preventDefault(); set(value.slice(0, digits[i] ? i : Math.max(i - 1, 0))); }
    else if (e.key === 'ArrowLeft') refs.current[Math.max(i - 1, 0)]?.focus();
    else if (e.key === 'ArrowRight') refs.current[Math.min(i + 1, 5)]?.focus();
  };
  const paste = (e: ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); set(e.clipboardData.getData('text')); };

  return (
    <motion.div key={shakeKey} animate={error ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }} transition={{ duration: 0.4 }} className="flex justify-center gap-2.5 sm:gap-3" role="group" aria-label="Tasdiqlash kodi">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} disabled={disabled} aria-label={`${i + 1}-raqam`}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (!v) return; set(value.slice(0, i) + v + value.slice(i + 1)); }}
          onKeyDown={(e) => key(i, e)} onPaste={paste} onFocus={(e) => e.target.select()}
          className={`h-14 w-11 rounded-2xl border-2 bg-white text-center text-[24px] font-extrabold text-primary outline-none transition-all sm:h-16 sm:w-12 ${error ? 'border-red-400 bg-red-50' : d ? 'border-primary bg-primary-50' : 'border-black/10'} focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60`} />
      ))}
    </motion.div>
  );
}
