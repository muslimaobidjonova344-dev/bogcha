'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isStandalone } from '@/lib/applock';

/** Bosh sahifalar: shu yerda "Orqaga" bosilganda ilovadan chiqishdan oldin ogohlantiriladi. */
const ROOTS = ['/', '/parent', '/kindergarten', '/tutor', '/admin', '/login'];
const WINDOW_MS = 2500;

/** O'rnatilgan ilovada: bosh sahifada "Orqaga" 2 marta ketma-ket bosilgandagina ilovadan chiqadi.
 *  Boshqa sahifalarda "Orqaga" oddiy ishlaydi (bitta amalga orqaga qaytaradi). */
export default function BackExit() {
  const path = usePathname();
  const [hint, setHint] = useState(false);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isStandalone() || !ROOTS.includes(path)) return;
    // Himoya yozuvi: joriy sahifaning nusxasi (Next.js holati saqlanadi, sahifa qayta yuklanmaydi)
    if (!(window.history.state && window.history.state.ktGuard)) window.history.pushState({ ...(window.history.state || {}), ktGuard: true }, '');
    const onPop = (e: PopStateEvent) => {
      if (e.state && e.state.ktGuard) return; // boshqa sahifadan himoya yozuviga qaytildi — hech narsa qilmaymiz
      const now = Date.now();
      if (now - last.current < WINDOW_MS) { window.removeEventListener('popstate', onPop); window.history.back(); return; } // ikkinchi bosish: chiqish
      last.current = now;
      window.history.pushState({ ...(window.history.state || {}), ktGuard: true }, '');
      setHint(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHint(false), WINDOW_MS);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [path]);

  if (!hint) return null;
  return <div role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[150] flex justify-center px-4 lg:bottom-8"><div className="rounded-full bg-[#14392A]/95 px-5 py-3 text-[14px] font-semibold text-white shadow-pop">Chiqish uchun yana bir marta bosing</div></div>;
}
