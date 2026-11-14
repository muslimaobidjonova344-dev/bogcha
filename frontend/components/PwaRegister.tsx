'use client';
import { useEffect, useState } from 'react';

/** Service worker + "Ilovani o'rnatish" tugmasi (faqat o'rnatish mumkin bo'lganda). */
export default function PwaRegister() {
  const [evt, setEvt] = useState<any>(null);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
    const h = (e: any) => { e.preventDefault(); setEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  if (!evt) return null;
  return (
    <button onClick={async () => { evt.prompt(); await evt.userChoice; setEvt(null); }} className="btn btn-primary fixed bottom-24 right-3 z-50 !min-h-[40px] shadow-pop lg:bottom-4">Ilovani o‘rnatish</button>
  );
}
