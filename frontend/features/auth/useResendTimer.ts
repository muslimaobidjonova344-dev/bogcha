'use client';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'kt_verify_sent_at';

/** Qayta yuborish taymeri (backend ham 60 soniya cheklovi qo'yadi). Sahifa yangilansa ham davom etadi. */
export function useResendTimer(seconds = 60, storageKey = KEY) {
  const calc = useCallback(() => {
    try {
      const t = Number(sessionStorage.getItem(storageKey) || 0);
      return t ? Math.max(0, Math.ceil(seconds - (Date.now() - t) / 1000)) : 0;
    } catch { return 0; }
  }, [seconds, storageKey]);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  const restart = useCallback(() => { try { sessionStorage.setItem(storageKey, String(Date.now())); } catch {} setLeft(seconds); }, [seconds, storageKey]);
  return { left, restart };
}
