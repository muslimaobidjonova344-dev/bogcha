# Kichkintoy — loyihani topshirish (qisqa)

**Nima bu:** bog'cha va repetitor qidirish/ariza platformasi. Rollar: ota-ona, bog'cha admini, repetitor, super admin.
**Stek:** FastAPI + SQLAlchemy + Alembic (backend), Next.js 14 (frontend), Supabase Postgres, Render (2 servis), email — Google Apps Script.

## Papkalar
- `backend/app` — `api/` (yo'llar), `models/`, `services/` (analytics va b.), `seed.py` + `seed_demo_extra.py` (demo ma'lumot)
- `frontend/app` — sahifalar; `features/` — ekran logikasi; `components/` — umumiy UI; `lib/` — yordamchilar (`phone`, `password`, `applock`)
- `frontend/public` — `sw.js`, `manifest.json`, rasmlar
- `DEPLOY.md` — joylashtirish, env o'zgaruvchilar, demo ma'lumot

## Muhim env
Backend: `DATABASE_URL`, `SECRET_KEY`, `SEED_DEMO`, `ALLOW_DEMO_IN_PROD`, Apps Script kalitlari. Frontend: `BACKEND_URL` (backendning haqiqiy Render manzili).

## Demo kirish (parol `Demo12345`)
Ota-ona `demo.parent@example.com`, bog'cha `demo.kg1@example.com`, repetitor `demo.tutor1@example.com`.

## Ishga tushirishdan oldin
- Demo env'larni o'chirib, demo yozuvlarni admin paneldan olib tashlang; kirish sahifasidagi "Tezkor kirish" panelini olib tashlang (`features/auth/Login.tsx`, `DEMO`).
- Apps Script maxfiy kalitini yangilang; `public/auth/` dagi rasmlarni asl sifatiga almashtiring.

## Ma'lum cheklovlar
- Frontend `npm run build` va backend testlari to'liq sinovdan o'tkazilmagan — birinchi deploy loglarini tekshiring.
- PIN/barmoq izi — qurilma qulfi (server autentifikatsiyasi emas).
