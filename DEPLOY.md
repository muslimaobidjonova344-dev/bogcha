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
