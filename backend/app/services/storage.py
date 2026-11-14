"""Fayl saqlash: Supabase Storage (ishlab chiqarish) yoki lokal papka (dev). Hujjatlar PRIVATE bucketda."""
import os
import uuid
import httpx
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.errors import AppError
from app.models import UploadedFile

ALLOWED = {
    "image/jpeg": (b"\xff\xd8\xff",), "image/png": (b"\x89PNG",), "image/webp": (b"RIFF",),
    "application/pdf": (b"%PDF",),
}
EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf"}


def _use_supabase() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)


def _headers(ctype: str | None = None) -> dict:
    h = {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}", "apikey": settings.SUPABASE_SERVICE_KEY}
    if ctype:
        h["Content-Type"] = ctype
    return h


async def save_upload(db: Session, owner_id: str, file: UploadFile, private: bool, allow_pdf: bool = True) -> UploadedFile:
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise AppError(f"Fayl hajmi {settings.MAX_UPLOAD_MB} MB dan oshmasligi kerak", 413, "too_large")
    ctype = file.content_type or ""
    if ctype not in ALLOWED or (ctype == "application/pdf" and not allow_pdf):
        raise AppError("Faqat JPG, PNG, WEBP" + (" yoki PDF" if allow_pdf else "") + " fayllar ruxsat etiladi", 415, "bad_type")
    if not any(data.startswith(sig) for sig in ALLOWED[ctype]):  # kontent turini haqiqatan tekshirish
        raise AppError("Fayl mazmuni ko'rsatilgan turga mos emas", 415, "bad_type")
    bucket = settings.STORAGE_BUCKET_PRIVATE if private else settings.STORAGE_BUCKET_PUBLIC
    path = f"{owner_id}/{uuid.uuid4().hex}.{EXT[ctype]}"
    if _use_supabase():
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}", content=data, headers=_headers(ctype))
        if r.status_code not in (200, 201):
            raise AppError("Faylni saqlab bo'lmadi", 502, "storage_error")
    else:
        full = os.path.join(settings.LOCAL_UPLOAD_DIR, bucket, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(data)
    rec = UploadedFile(owner_id=owner_id, bucket=bucket, path=path, filename=(file.filename or "file")[:200],
                       content_type=ctype, size=len(data), is_private=private)
    db.add(rec)
    db.flush()
    return rec


def public_url(rec: UploadedFile) -> str | None:
    if rec.is_private:
        return None
    if _use_supabase():
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{rec.bucket}/{rec.path}"
    return f"{settings.BACKEND_URL}/media/{rec.bucket}/{rec.path}"


async def read_private(rec: UploadedFile) -> bytes:
    if _use_supabase():
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.get(f"{settings.SUPABASE_URL}/storage/v1/object/{rec.bucket}/{rec.path}", headers=_headers())
        if r.status_code != 200:
            raise AppError("Fayl topilmadi", 404, "not_found")
        return r.content
    with open(os.path.join(settings.LOCAL_UPLOAD_DIR, rec.bucket, rec.path), "rb") as f:
        return f.read()
