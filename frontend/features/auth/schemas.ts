import { z } from 'zod';

/** Telefonni +998XXXXXXXXX ko'rinishiga keltiradi (backend norm_phone bilan bir xil qoida). */
export function normPhone(v: string): string | null {
  const d = v.replace(/[\s\-()]/g, '');
  if (/^\d{9}$/.test(d)) return '+998' + d;
  if (/^998\d{9}$/.test(d)) return '+' + d;
  if (/^\+998\d{9}$/.test(d)) return d;
  return null;
}

export const passwordRule = z.string().min(8, 'Kamida 8 belgi').max(128)
  .refine((v) => /[A-Za-z]/.test(v), 'Kamida bitta harf kerak')
  .refine((v) => /\d/.test(v), 'Kamida bitta raqam kerak');

export const emailRule = z.string().trim().min(1, 'Email kiriting').email('Email noto‘g‘ri formatda');
export const phoneRule = z.string().trim().min(1, 'Telefon kiriting').refine((v) => !!normPhone(v), 'Format: +998 90 123 45 67');

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email yoki telefon kiriting').refine((v) => (v.includes('@') ? z.string().email().safeParse(v).success : !!normPhone(v)), 'Email yoki +998 telefon raqam kiriting'),
  password: z.string().min(1, 'Parol kiriting'),
  remember: z.boolean().default(true),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  role: z.enum(['parent', 'kindergarten_admin', 'tutor']),
  first_name: z.string().trim().min(2, 'Ismingizni kiriting'),
  last_name: z.string().trim().min(2, 'Familiyangizni kiriting'),
  provider_name: z.string().trim().max(200).optional(),
  email: emailRule,
  phone: phoneRule,
  password: passwordRule,
  password_confirm: z.string().min(1, 'Parolni takrorlang'),
  agree: z.literal(true, { errorMap: () => ({ message: 'Davom etish uchun rozilik bering' }) }),
}).refine((d) => d.password === d.password_confirm, { path: ['password_confirm'], message: 'Parollar bir xil emas' })
  .refine((d) => d.role !== 'kindergarten_admin' || !!d.provider_name?.trim(), { path: ['provider_name'], message: 'Bog‘cha nomini kiriting' });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email: emailRule });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z.object({ password: passwordRule, password_confirm: z.string().min(1, 'Parolni takrorlang') })
  .refine((d) => d.password === d.password_confirm, { path: ['password_confirm'], message: 'Parollar bir xil emas' });
export type ResetValues = z.infer<typeof resetSchema>;

/** Parol kuchi 0..4 */
export function passwordScore(p: string): number {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Za-z]/.test(p) && /\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) && /[A-Z]/.test(p)) s++;
  return s;
}
