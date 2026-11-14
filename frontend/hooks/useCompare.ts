'use client';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'bogcha_compare';
/** Taqqoslash ro'yxati (2–4 muassasa). Faqat qulaylik uchun brauzerda saqlanadi. */
export function useCompare() {
  const [ids, setIds] = useState<{ id: string; type: string; name: string }[]>([]);
  useEffect(() => { try { setIds(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {} }, []);
  const save = (v: any[]) => { setIds(v); try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const toggle = useCallback((p: { id: string; type: string; name: string }) => {
    setIds((cur) => {
      let n = cur.find((x) => x.id === p.id) ? cur.filter((x) => x.id !== p.id) : [...cur.filter((x) => x.type === p.type), p].slice(-4);
      try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);
  return { ids, toggle, clear: () => save([]) };
}
