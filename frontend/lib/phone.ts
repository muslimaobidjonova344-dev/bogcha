/** O'zbekiston telefon raqami: doim +998 bilan boshlanadi, kiritish davomida "XX XXX XX XX" ko'rinishida bo'shliq qo'yiladi. */

/** Mavjud operator va shahar kodlari (9 xonali raqamning dastlabki 2 raqami). */
export const UZ_CODES = ['20', '33', '50', '55', '61', '62', '65', '66', '67', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '88', '90', '91', '93', '94', '95', '97', '98', '99'];

export const PHONE_PREFIX = '+998';

/** Faqat milliy qismni (9 tagacha raqam) ajratib oladi: "+998 90 123..." -> "90123". */
export function nationalDigits(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  return d.slice(0, 9);
}

/** Yozilayotgan qiymatni "+998 90 123 45 67" ko'rinishiga keltiradi (qisman kiritilganini ham). */
export function formatUzPhone(raw: string): string {
  const d = nationalDigits(raw);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.length ? `${PHONE_PREFIX} ${parts.join(' ')}` : `${PHONE_PREFIX} `;
}

export type PhoneCheck = { ok: boolean; complete: boolean; message?: string; left: number };

/** Raqamni tekshiradi: uzunligi va operator kodi. */
export function checkUzPhone(raw: string): PhoneCheck {
  const d = nationalDigits(raw);
  const left = 9 - d.length;
  if (d.length === 0) return { ok: false, complete: false, left };
  if (d.length >= 2 && !UZ_CODES.includes(d.slice(0, 2))) return { ok: false, complete: false, left, message: `“${d.slice(0, 2)}” operator kodi mavjud emas (masalan: 90, 91, 93, 94, 97, 99, 33, 88)` };
  if (d.length < 9) return { ok: false, complete: false, left, message: `Yana ${left} ta raqam kerak` };
  return { ok: true, complete: true, left: 0 };
}

/** Backendga yuboriladigan ko'rinish: +998901234567 (noto'g'ri bo'lsa null). */
export function toE164(raw: string): string | null {
  const c = checkUzPhone(raw);
  return c.ok ? PHONE_PREFIX + nationalDigits(raw) : null;
}
