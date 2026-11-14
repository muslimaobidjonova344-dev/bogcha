# Deploy: Supabase + Google Apps Script + Render (24/7)

## 1. Supabase
1. Yangi project yarating. **Settings → Database → Connection string → Transaction pooler (port 6543)** ni nusxalang → `DATABASE_URL`
   (`postgresql://postgres.<ref>:<parol>@aws-0-...pooler.supabase.com:6543/postgres`). Kod `postgresql+psycopg://` ga o'zi o'giradi.
2. **Storage**: bucket `documents` (**Private**) va `media` (**Public**) yarating.
3. **Settings → API**: `Project URL` → `SUPABASE_URL`, `service_role` kalit → `SUPABASE_SERVICE_KEY` (faqat backendda, hech qachon frontendda emas).

## 2. Google Apps Script (email)
1. https://script.google.com → yangi project → `apps-script/Code.gs` mazmunini qo'ying.
2. **Project Settings → Script Properties**: `SECRET` = uzun tasodifiy qator, `BACKEND_URL` = Render backend manzili.
3. **Deploy → New deployment → Web app**: Execute as *Me*, Who has access *Anyone*. URL → `APPS_SCRIPT_URL`, SECRET → `APPS_SCRIPT_SECRET`.
4. Bir marta `installKeepAliveTrigger` funksiyasini ishga tushiring (har 5 daqiqada `/health` ni chaqiradi — Render uxlab qolmasligi uchun). `testSend` bilan sinang.

## 3. Render
1. Repozitoriyni GitHub'ga push qiling → **New → Blueprint** → `render.yaml`.
2. Backend env: `DATABASE_URL`, `FRONTEND_URL` (frontend https URL), `BACKEND_URL`, `APP_URL`, `APPS_SCRIPT_URL/SECRET`, `SUPABASE_*`,
   `SUPERADMIN_EMAIL/PASSWORD`, `SELF_PING_URL` (= `<backend>/health`). `SECRET_KEY`, `JWT_SECRET` avtomatik yaratiladi.
3. Frontend env: `BACKEND_URL` = backend https URL (rewrites `/api/v1/*` va `/media/*` ni shunga yo'naltiradi → cookie first-party).
4. Backend ishga tushganda `alembic upgrade head` va `seed` avtomatik bajariladi.
5. Tekshiruv: `<backend>/health`, `<backend>/ready`, so'ng frontend'da Super Admin bilan kirish → Sozlamalar → **2FA yoqish** (productionda muhim admin amallari uchun majburiy).

## 4. 24/7 ishlash
Render free servis 15 daqiqa so'rovsiz uxlaydi. Ikki qatlamli himoya: (a) Apps Script trigger, (b) backend ichidagi self-ping (`SELF_PING_URL`).
Qo'shimcha: UptimeRobot (5 daqiqa) ni ham `/health` ga ulash mumkin. **Frontend** servisni ham ping qiling (`https://<frontend>/`).
Kafolatli 24/7 uchun pullik instance (Starter) tavsiya etiladi.

## 5. Zaxira va xavfsizlik
- Supabase: Database → Backups (Pro) yoki `pg_dump` bilan haftalik zaxira.
- Kalitlarni (`service_role`, SECRET) repoga qo'ymang. `.env` `.gitignore`da.
- WebSocket proxy muammo bersa: backend uchun `NEXT_PUBLIC_WS_URL=wss://<backend-domen>` (yo‘l `/api/v1/ws` o‘zi qo‘shiladi) qo'ying (token `/auth/ws-token` orqali).

## 6. GitHub'ga push (Kichkintoy)
```bash
cd D:\Projects\bogcha
git init -b main
git config user.name  "muslimaobidjonova344-dev"
git config user.email "muslimaobidjonova344@gmail.com"
git add .
git commit -m "Kichkintoy: birinchi versiya"
git remote add origin https://github.com/muslimaobidjonova344-dev/bogcha.git
git push -u origin main
```
Agar push `ulugbekkamalov` nomidan ketayotgan bo'lsa — Windows **Credential Manager → Windows Credentials → git:https://github.com** yozuvini o'chiring va qayta push qiling (brauzerda kerakli akkauntga kirasiz). Yoki ulugbekkamalov repoga *Collaborator* sifatida qo'shilgan bo'lsa, shu akkaunt bilan ham push ishlaydi; commit muallifi esa yuqoridagi `user.name/email` bo'ladi.
`.env` hech qachon gitga tushmaydi (`.gitignore`da).

## 7. Google orqali kirish (bepul)
1. https://console.cloud.google.com → yuqoridagi **Select a project → New project** → nom: `Kichkintoy`.
2. **APIs & Services → OAuth consent screen**: *External* → App name `Kichkintoy`, support email va developer email (o'zingizniki) → Save. So'ng **Publish app** (Testing holatida faqat qo'shilgan test foydalanuvchilar kira oladi; kerakli scope'lar `email`, `profile`, `openid` oddiy, Google tekshiruvi talab qilmaydi).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Application type: **Web application**, nom `Kichkintoy web`.
   - **Authorized JavaScript origins**: `https://kichkintoy-frontend.onrender.com` va lokal uchun `http://localhost:3000`.
   - *Authorized redirect URIs* kerak emas (popup rejimi).
4. Chiqqan **Client ID** (`....apps.googleusercontent.com`) ni nusxalang → Render → **kichkintoy-backend → Environment → `GOOGLE_CLIENT_ID`** → Save (servis qayta ishga tushadi). Client **Secret** kerak emas.
5. Tekshiruv: `/login` sahifasida Google tugmasi chiqadi. Yangi foydalanuvchi birinchi marta kirganda hisob turini (ota-ona/bog'cha/repetitor) tanlaydi; mavjud emailga ega hisob bo'lsa, shu hisobga kiradi (Google emailni tasdiqlagan bo'ladi).
Eslatma: 2FA yoqilgan hisoblar (masalan Super Admin) Google orqali kira olmaydi, faqat parol + 2FA kod bilan.

## 8. Sinov (demo) ma'lumotlari va email kodi

**Demo ma'lumotlar** (6 bog'cha, 5 repetitor, 2 ota-ona, barcha holatdagi arizalar, sharhlar, suhbatlar, bildirishnomalar, ikkita shartnoma):
Render → kichkintoy-backend → Environment: `SEED_DEMO=1` va `ALLOW_DEMO_IN_PROD=1` qo'shing, keyin **Manual Deploy**.
Seed idempotent: qayta ishga tushirsa takrorlamaydi. Demo hisoblar (parol `Demo12345`):
`demo.parent@example.com`, `demo.parent2@example.com`, `demo.kg1..6@example.com`, `demo.tutor1..5@example.com`.
Haqiqiy foydalanuvchilar uchun ochishdan oldin ikkala o'zgaruvchini o'chiring va demo yozuvlarni admin panelidan olib tashlang.

**Email tasdiqlash kodi:** ro'yxatdan o'tgach 6 xonali kod Apps Script orqali yuboriladi (30 daqiqa, 5 ta urinish). Apps Script hali sozlanmagan bo'lsa,
lokal sinov uchun backendda `EMAIL_DEV_ECHO=1` (faqat ENV != production) qo'ying: kod sahifada ko'rinadi.
Eslatma: bazaga yangi jadval/ustun qo'shilgani uchun deploy paytida `alembic upgrade head` (0002) avtomatik ishlaydi.
