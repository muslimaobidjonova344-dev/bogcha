'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Loader2, Star, X } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { APP_STATUS, VERIFY_STATUS } from '@/lib/format';

/* ---------- Toast ---------- */
type Toast = { id: number; kind: 'ok' | 'err'; text: string };
const ToastCtx = createContext<{ ok: (t: string) => void; err: (t: string) => void }>({ ok: () => {}, err: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: 'ok' | 'err', text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ ok: (t) => push('ok', t), err: (t) => push('err', t) }}>
      {children}
      <div className="fixed top-3 right-3 left-3 sm:left-auto z-[100] flex flex-col gap-2 sm:w-96 pointer-events-none" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
              className={clsx('pointer-events-auto flex items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-pop', t.kind === 'ok' ? 'bg-primary text-white' : 'bg-red-600 text-white')}>
              {t.kind === 'ok' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Basic ---------- */
export const Skeleton = ({ className }: { className?: string }) => <div className={clsx('skeleton', className)} />;
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={clsx('animate-spin', className)} size={18} />;

export function Button({ children, variant = 'primary', loading, className, ...rest }: any) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} className={clsx('btn', `btn-${variant}`, className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner />}
      {children}
    </motion.button>
  );
}

export function Field({ label, error, children, hint }: { label?: string; error?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-black/50">{hint}</p>}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

export const Badge = ({ children, cls }: { children: ReactNode; cls?: string }) => (
  <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', cls || 'bg-secondary-light text-primary')}>{children}</span>
);
export const StatusBadge = ({ status }: { status: string }) => <Badge cls={APP_STATUS[status]?.cls}>{APP_STATUS[status]?.label || status}</Badge>;
export const VerifyBadge = ({ status }: { status: string }) => <Badge cls={VERIFY_STATUS[status]?.cls}>{VERIFY_STATUS[status]?.label || status}</Badge>;

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} yulduz`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-sun text-sun' : 'text-black/20'} />)}
    </span>
  );
}

export function StatCard({ label, value, href, icon, tone = 'green' }: { label: string; value: ReactNode; href?: string; icon?: ReactNode; tone?: 'green' | 'peach' | 'yellow' | 'plain' }) {
  const tones = { green: 'bg-primary-50', peach: 'bg-peach-light', yellow: 'bg-sun-light', plain: 'bg-white' };
  const inner = (
    <motion.div whileHover={{ y: -2 }} className={clsx('rounded-2xl p-4 shadow-card border border-black/5 h-full', tones[tone])}>
      <div className="flex items-center justify-between text-primary/70 text-xs font-semibold">{label}{icon}</div>
      <div className="mt-2 text-2xl md:text-3xl font-extrabold text-primary">{value}</div>
    </motion.div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card p-4 md:p-5', className)}>{children}</div>;
}

export function PageTitle({ title, action, sub }: { title: string; action?: ReactNode; sub?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-primary">{title}</h1>
        {sub && <p className="text-sm text-black/55">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- States ---------- */
export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-white/60 px-6 py-12 text-center">
      <Inbox className="text-secondary" size={40} />
      <p className="mt-3 font-bold text-primary">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-black/55">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorBox({ error, retry }: { error: any; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertCircle className="text-red-500" size={36} />
      <p className="mt-2 font-semibold text-red-700">{error?.message || "Ma'lumotni yuklab bo'lmadi"}</p>
      {retry && <Button variant="outline" className="mt-3" onClick={retry}>Qayta urinish</Button>}
    </div>
  );
}
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
}

/** So'rov holatlarini bir joyda boshqaradi: loading / error / empty / data */
export function Async({ q, empty, children, rows }: { q: any; empty?: ReactNode; children: (d: any) => ReactNode; rows?: number }) {
  if (q.isLoading) return <ListSkeleton rows={rows} />;
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const d = q.data;
  const isEmpty = Array.isArray(d) ? d.length === 0 : Array.isArray(d?.items) ? d.items.length === 0 : false;
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children(d)}</>;
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Oldingi"><ChevronLeft size={18} /></Button>
      <span className="text-sm font-semibold text-primary">{page} / {pages}</span>
      <Button variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Keyingi"><ChevronRight size={18} /></Button>
    </div>
  );
}

/* ---------- Modal / Drawer ---------- */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-pop sm:max-w-lg pb-safe">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-primary">{title}</h2>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5" aria-label="Yopish"><X size={20} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside onClick={(e) => e.stopPropagation()} initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.22 }}
            className="h-full w-[82%] max-w-xs overflow-y-auto bg-white p-4 shadow-pop">{children}</motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({ open, onClose, onYes, title, text, loading, danger }: any) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-black/70">{text}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Bekor</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onYes}>Tasdiqlash</Button>
      </div>
    </Modal>
  );
}

export function SuccessCheck() {
  return (
    <motion.svg viewBox="0 0 80 80" className="h-24 w-24 mx-auto" initial="hidden" animate="show">
      <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#245C43" strokeWidth="5" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.6 } } }} />
      <motion.path d="M24 41 l11 11 l22 -24" fill="none" stroke="#245C43" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.5, delay: 0.5 } } }} />
    </motion.svg>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-primary-50 p-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={clsx('whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition min-h-[40px]', value === t.id ? 'bg-white text-primary shadow-card' : 'text-primary/70')}>{t.label}</button>
      ))}
    </div>
  );
}
