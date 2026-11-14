'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Sahifalar o'rtasida yengil o'tish (login <-> register <-> forgot). */
export default function Template({ children }: { children: ReactNode }) {
  return <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
