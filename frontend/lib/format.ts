export const uzs = (n?: number | null) => (n == null ? '—' : new Intl.NumberFormat('uz-UZ').format(n).replace(/,/g, ' ') + " so'm");

export function dmy(d?: string | Date | null) {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric' }).format(x);
}
export function dmyHm(d?: string | Date | null) {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  const date = dmy(x);
  const t = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }).format(x);
  return `${date} ${t}`;
}

export const APP_STATUS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: 'Yuborildi', cls: 'bg-sun-light text-amber-800' },
  UNDER_REVIEW: { label: "Ko'rib chiqilmoqda", cls: 'bg-blue-50 text-blue-700' },
  MORE_INFO_REQUIRED: { label: "Qo'shimcha ma'lumot kerak", cls: 'bg-orange-50 text-orange-700' },
  INTERVIEW_SCHEDULED: { label: 'Suhbat belgilandi', cls: 'bg-purple-50 text-purple-700' },
  ACCEPTED: { label: 'Qabul qilindi', cls: 'bg-primary-100 text-primary' },
  REJECTED: { label: 'Rad etildi', cls: 'bg-red-50 text-red-700' },
  CANCELLED: { label: 'Bekor qilindi', cls: 'bg-gray-100 text-gray-600' },
};
export const VERIFY_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Kutilmoqda', cls: 'bg-sun-light text-amber-800' },
  under_review: { label: "Ko'rib chiqilmoqda", cls: 'bg-blue-50 text-blue-700' },
  approved: { label: 'Tasdiqlangan', cls: 'bg-primary-100 text-primary' },
  rejected: { label: 'Rad etilgan', cls: 'bg-red-50 text-red-700' },
  suspended: { label: "To'xtatilgan", cls: 'bg-gray-200 text-gray-700' },
};
export const WEEKDAYS = ['', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
export const ROLE_LABEL: Record<string, string> = { parent: 'Ota-ona', kindergarten_admin: "Bog'cha admini", tutor: 'Repetitor', super_admin: 'Super Admin' };
export const ROLE_HOME: Record<string, string> = { parent: '/parent', kindergarten_admin: '/kindergarten', tutor: '/tutor', super_admin: '/admin' };
export const errMsg = (e: any) => (e?.message as string) || 'Xatolik yuz berdi';
