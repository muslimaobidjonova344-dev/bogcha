# Kichkintoy

Bog'cha va repetitor qidirish/ariza platformasi (O'zbekiston). Rollar: Ota-ona, Bog'cha admini, Repetitor, Super Admin + mehmon rejimi.

> **Holat (halol hisobot):** kod to'liq yozilgan, lekin yozish muhitida paket o'rnatish/tarmoq yopiq bo'lgani uchun
> `pytest`, `npm run build` va brauzerda sinov **hali bajarilmagan**. Faqat backend uchun `py_compile` va
> `scripts/check_names.py` (aniqlanmagan nomlar) hamda frontend importlari tekshiruvi o'tgan.
> Birinchi ishga tushirishda xatoliklar chiqishi mumkin — pastdagi "Birinchi tekshiruv" bo'limiga qarang.

## Tuzilma
```
backend/    FastAPI + SQLAlchemy 2 + Alembic (app/api, app/services, app/models, app/schemas, tests/)
frontend/   Next.js 14 (App Router) + Tailwind + TanStack Query (app/, features/, components/, lib/)
apps-script/Code.gs   Email yuborish (Google Apps Script web app) + keep-alive
docs/ARCHITECTURE.md  Qaror jadvali (prompt vs tanlangan yechim)
render.yaml Render Blueprint (backend docker + frontend node)
```
Kod modullarga bo'lingan: xatoni tuzatish uchun odatda bitta fayl (`app/api/<modul>.py` yoki `features/<Modul>.tsx`) yetadi.

## Birinchi tekshiruv (lokal)
```bash
# Backend
cd backend && python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python ../scripts/check_names.py        # aniqlanmagan nomlar
pytest -q                               # testlar (SQLite)
# Postgres bilan ishga tushirish
cp ../.env.example .env                 # qiymatlarni to'ldiring
alembic upgrade head && python -m app.seed
uvicorn app.main:app --reload

# Frontend
cd ../frontend && npm install
BACKEND_URL=http://localhost:8000 npm run dev
npm run build                           # TypeScript/Next xatolarini ko'rsatadi
```
Demo ma'lumotlar `[DEMO]` belgisi bilan seed qilinadi (productionda o'chiq). Super Admin `SUPERADMIN_EMAIL/PASSWORD` dan yaratiladi.

## Muhim xususiyatlar
Argon2id, HttpOnly cookie + refresh rotation/reuse-detection, 2FA (TOTP), CSRF header, rate limit, RBAC, hujjatlar tasdig'i,
kapasitet bloklash (FOR UPDATE), repetitor bron oralig'i tekshiruvi, sharh faqat QABUL QILINGAN arizadan keyin, audit log, WebSocket chat.

## Ma'lum cheklovlar
- Gmail MailApp kvotasi ~100 xat/kun (bepul akkaunt).
- Rate limit va WebSocket bitta instansiya xotirasida (Render free: 1 instance).
- SMS (Eskiz) sozlanmasa telefon OTP 503 qaytaradi (soxta muvaffaqiyat yo'q).
- To'lov moduli yoqilmagan (daromad statistikasi o'tkazilgan darslar narxidan hisoblanadi).
- Web Push uchun VAPID kalitlari kerak (ixtiyoriy).

Deploy: `DEPLOY.md`.
