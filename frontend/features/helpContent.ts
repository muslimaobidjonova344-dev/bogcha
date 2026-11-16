/** Yo'riqnoma va "Ilova haqida" sahifalari uchun matnlar (bir joyda tahrirlanadi). */
export type Guide = { role: string; title: string; steps: { t: string; d: string }[] };

export const GUIDES: Guide[] = [
  { role: 'parent', title: 'Ota-ona', steps: [
    { t: 'Ro‘yxatdan o‘ting', d: '“Ro‘yxatdan o‘tish” tugmasi orqali ism, email yoki telefon va kuchli parol kiriting. Emailingizga kelgan 6 xonali kodni kiritib hisobni tasdiqlang.' },
    { t: 'Farzand profilini qo‘shing', d: '“Farzandlar” bo‘limida farzandingizning ismi va tug‘ilgan sanasini kiriting. Ariza shu ma’lumot asosida to‘ldiriladi.' },
    { t: 'Qidiring va solishtiring', d: '“Qidiruv”da viloyat, tuman, narx, reyting va yosh bo‘yicha filtrlang. Xaritada joylashuvni ko‘ring, 2–3 ta muassasani “Solishtirish” ga qo‘shing.' },
    { t: 'Ariza yuboring', d: 'Muassasa sahifasida “Ariza yuborish” ni bosing, farzandni tanlang va izoh yozing. Ariza holatini “Arizalarim” bo‘limida kuzating.' },
    { t: 'Muassasa bilan yozishing', d: '“Xabarlar” bo‘limida muassasa bilan to‘g‘ridan-to‘g‘ri yozishing. Yangi xabar va holat o‘zgarishlari bildirishnoma bo‘lib keladi.' },
    { t: 'Shartnoma va sharh', d: 'Ariza qabul qilingach shartnomani ko‘rib, elektron imzolang. Xizmatdan foydalangach reyting va sharh qoldiring.' },
  ] },
  { role: 'kindergarten', title: 'Bog‘cha ma’muriyati', steps: [
    { t: 'Profilni to‘ldiring', d: '“Profil” bo‘limida nomi, manzil, tavsif, ish vaqti, hujjatlar va galereyani kiriting. Profil administrator tomonidan tekshirilgach ommaga ko‘rinadi.' },
    { t: 'Guruh va narxlarni kiriting', d: '“Guruhlar”, “Xizmatlar va narxlar”, “Xodimlar” va “Bo‘sh o‘rinlar” bo‘limlarini yangilab turing — ota-onalar aynan shuni ko‘radi.' },
    { t: 'Arizalarni ko‘rib chiqing', d: '“Arizalar”da yangi arizani oching va holatini o‘zgartiring: ko‘rib chiqilmoqda, qo‘shimcha ma’lumot kerak, suhbat tayinlandi, qabul qilindi yoki rad etildi.' },
    { t: 'Shartnoma tuzing', d: 'Qabul qilingan ariza uchun shartnoma yuboring. Ota-ona imzolagach u “faol” holatga o‘tadi.' },
    { t: 'Statistikani kuzating', d: '“Statistika” bo‘limida arizalar oqimi, konversiya, javob berish tezligi, guruhlar to‘lishi va daromad diagrammalarda ko‘rsatiladi.' },
  ] },
  { role: 'tutor', title: 'Repetitor', steps: [
    { t: 'Profil va xizmatlar', d: 'Fan, tajriba, ta’lim va dars formati (yakka, guruh, onlayn) ni kiriting. Har bir xizmat uchun narxni belgilang.' },
    { t: 'Bo‘sh vaqtni belgilang', d: '“Jadval” bo‘limida haftalik bo‘sh vaqtlaringizni kiriting — ota-onalar shu vaqtlarga dars band qiladi.' },
    { t: 'So‘rovlarga javob bering', d: '“So‘rovlar” bo‘limida yangi so‘rovlarni qabul qiling yoki rad eting, kerak bo‘lsa xabar orqali aniqlashtiring.' },
    { t: 'Darslarni yuriting', d: 'Darslarni “rejalashtirilgan / o‘tkazildi / bekor qilindi” holatlariga o‘tkazib boring; tarix va daromad avtomatik hisoblanadi.' },
  ] },
  { role: 'admin', title: 'Administrator', steps: [
    { t: 'Moderatsiya', d: '“Moderatsiya” da yangi bog‘cha va repetitor profillarini hujjatlari bilan tekshiring: tasdiqlang yoki sabab ko‘rsatib rad eting.' },
    { t: 'Sharh va shikoyatlar', d: '“Sharhlar” va “Xabarlar nazorati” da shikoyat qilingan kontentni ko‘rib, yashiring yoki qoldiring.' },
    { t: 'Foydalanuvchilar va ma’lumotnomalar', d: '“Foydalanuvchilar”, “Hududlar”, “Toifalar” orqali tizimni boshqaring; barcha amallar “Audit” jurnalida saqlanadi.' },
    { t: 'Hisobotlar', d: '“Hisobotlar”da foydalanuvchilar, arizalar, voronka, hududlar va reytinglar diagrammalarda; ma’lumotni CSV sifatida yuklab olish mumkin.' },
  ] },
];

export const FAQ: { q: string; a: string }[] = [
  { q: 'Platforma pullikmi?', a: 'Ota-onalar uchun ro‘yxatdan o‘tish, qidirish, ariza yuborish va xabar yozish bepul.' },
  { q: 'Emailga kod kelmadi, nima qilish kerak?', a: 'Spam (keraksiz xatlar) papkasini tekshiring. Kod kelmasa, tasdiqlash sahifasida “Qayta yuborish” tugmasini bosing. Kod cheklangan vaqt amal qiladi.' },
  { q: 'Parolni unutdim.', a: 'Kirish sahifasidagi “Parolni unutdingizmi?” havolasi orqali emailga tiklash kodi yuboriladi.' },
  { q: 'Telefon raqamni qanday kiritaman?', a: 'Raqam doim +998 bilan boshlanadi, keyin faqat raqamlarni yozing — bo‘shliqlar +998 90 123 45 67 ko‘rinishida avtomatik qo‘yiladi. Operator kodi noto‘g‘ri bo‘lsa, tizim xabar beradi.' },
  { q: 'Kuchli parol qanday bo‘ladi?', a: 'Kamida 8 belgi: katta va kichik harf, raqam va belgi bo‘lishi kerak. “Kuchli parol yaratish” tugmasi shablon asosida xavfsiz parol tuzib beradi.' },
  { q: 'Ilovani telefonga qanday o‘rnataman?', a: 'Chrome’da saytni oching va “Ilovani o‘rnatish” tugmasini yoki menyudagi “Bosh ekranga qo‘shish” ni tanlang (iPhone: Safari → Ulashish → Bosh ekranga qo‘shish).' },
  { q: 'PIN kod va barmoq izi nima uchun?', a: 'O‘rnatilgan ilovani ochganda PIN (yoki barmoq izi) so‘raladi, shunda telefonni boshqa odam ochsa ham ma’lumotlaringiz himoyada qoladi. Sozlamalar → “Ilova qulfi” da o‘zgartirish yoki o‘chirish mumkin. PIN faqat shu qurilmada saqlanadi.' },
  { q: 'Ilovadan qanday chiqaman?', a: 'Bosh sahifada “Orqaga” tugmasini ketma-ket ikki marta bosing. Boshqa sahifalarda bir marta bosish bitta qadam orqaga qaytaradi.' },
  { q: 'Ariza holatlari nimani anglatadi?', a: 'Yuborildi → Ko‘rib chiqilmoqda → (Qo‘shimcha ma’lumot kerak) → Suhbat tayinlandi → Qabul qilindi yoki Rad etildi. Ota-ona arizani o‘zi ham bekor qilishi mumkin.' },
  { q: 'Ma’lumotlarim xavfsizmi?', a: 'Parollar zamonaviy xeshlash bilan saqlanadi, kirish xavfsiz cookie orqali amalga oshadi, rollar bo‘yicha ruxsatlar cheklangan. Shaxsiy yozishmalarni administrator faqat shikoyat bo‘lganda ko‘radi.' },
  { q: 'Sayt sekin ochilsa?', a: 'Tekin hosting uzoq vaqt ishlatilmasa “uxlaydi”; birinchi ochilish 30–50 soniya olishi mumkin, keyin tez ishlaydi.' },
];

export const FEATURES = [
  ['Qidiruv va filtrlar', 'Viloyat, tuman, narx, reyting, yosh va turi bo‘yicha ko‘p mezonli qidiruv.'],
  ['Xarita va taqqoslash', 'Muassasalarni xaritada ko‘rish va narx/reyting bo‘yicha yonma-yon solishtirish.'],
  ['Arizalar', 'Ariza yuborish, holatini kuzatish, tahrirlash va bekor qilish; muassasa uchun to‘liq ko‘rib chiqish jarayoni.'],
  ['Xabarlar va bildirishnomalar', 'Ota-ona va muassasa o‘rtasida chat hamda real vaqtdagi bildirishnomalar.'],
  ['Shartnoma', 'Elektron shartnoma va imzo, holat tarixi bilan.'],
  ['Sharhlar va reyting', 'Faqat haqiqiy foydalanuvchilar sharh qoldiradi; moderatsiya orqali nazorat qilinadi.'],
  ['Hisobotlar', 'Har bir rol uchun diagrammali statistika va admin uchun umumiy tahlil.'],
  ['Ilova (PWA)', 'Telefonga o‘rnatiladi, tez ochiladi, PIN/barmoq izi bilan himoyalanadi.'],
] as const;
