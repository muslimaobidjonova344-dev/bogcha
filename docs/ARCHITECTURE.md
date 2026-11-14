# Kichkintoy — Arxitektura (Render + Supabase + Apps Script)

## Qaror: nima uchun promptdagidan farq qiladi
| Prompt | Bizning optimal yechim | Sabab |
|---|---|---|
| Docker+Nginx+Redis+Worker serveri | **Render Web Service (backend) + Render Static/Web (frontend)** | Bepul/arzon, HTTPS tayyor, serversiz boshqaruv |
| O'z PostgreSQL | **Supabase PostgreSQL** (pooler orqali) | Bepul, zaxira nusxa, 24/7 |
| Object Storage | **Supabase Storage** (private bucket `documents`, public `media`) | Hujjatlar maxfiy saqlanadi |
| SMTP | **Google Apps Script (script.google.com) veb-ilova** orqali email | Sizning talabingiz; SMTP kerak emas |
| Redis (rate limit, WS) | Rate limit: xotirada + DB; WebSocket: bitta instansiya | Redis pullik; keyin ulash mumkin (REDIS_URL ixtiyoriy) |
| Background Worker | FastAPI `lifespan` ichidagi asyncio vazifalar (eslatmalar, tozalash) | Alohida worker kerak emas |
| 24/7 uxlamaslik | `/health` + tashqi ping (UptimeRobot / Apps Script trigger har 5 daqiqa) + ichki self-ping | Render bepul tarifi 15 daqiqada uxlaydi |
| Google OAuth | Keyinga: `.env` orqali ulanadi | |
| Telefon OTP | SMS provayder (Eskiz.uz) uchun adapter; kalit bo'lmasa o'chiq | Haqiqiy kalit kerak |

## Prompt'da yo'qolgan, biz qo'shgan qismlar
- Sessiya/refresh token rotatsiyasi, login urinishlarini cheklash (brute force)
- Idempotent ariza (bir farzand + bir bog'cha uchun ikkita faol ariza bo'lmasin)
- Guruh sig'imi uchun `SELECT ... FOR UPDATE` (poyga holatini oldini olish)
- Repetitor jadvali: vaqt oralig'i ustma-ust tushishini bazada tekshirish
- `/health`, `/ready`, so'rov ID loglari, global xato formati
- Ma'lumotni eksport/o'chirish (shaxsiy ma'lumotlar), bolalar ma'lumotini faqat ota-ona ko'radi
- Provider (bog'cha/repetitor) ota-ona ma'lumotini faqat ariza yuborilgandan keyin ko'radi
- Cron: ariza eslatmalari, muddati o'tgan tokenlarni tozalash

## Texnologiyalar (mos versiyalar)
Backend: Python 3.11, FastAPI 0.115, SQLAlchemy 2.0, Alembic 1.13, Pydantic 2, argon2-cffi, PyJWT, psycopg 3.
Frontend: Next.js 14 (App Router), React 18, TypeScript 5, Tailwind 3, Framer Motion 11, React Hook Form + Zod, TanStack Query 5, Leaflet (OpenStreetMap).

## Tuzilma
```
bogcha/
  backend/app/{api,core,models,schemas,services,repositories,workers,middleware}
  backend/migrations, backend/tests
  frontend/ (Next.js)
  apps-script/Code.gs      <- email yuboruvchi
  render.yaml, docs/, scripts/
```

## Modullar bo'yicha yozish tartibi (xato tuzatish oson bo'lishi uchun har biri alohida fayl)
core → models → schemas → repositories → services → api (har bir modul alohida router).
