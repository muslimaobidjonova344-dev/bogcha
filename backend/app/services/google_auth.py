"""Google ID token (GSI 'credential') ni tekshirish. Qo'shimcha kutubxona kerak emas: Google'ning tokeninfo endpointi."""
import logging
import httpx
from app.core.config import settings
from app.core.errors import AppError

log = logging.getLogger("google_auth")
TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"
ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def verify_id_token(credential: str) -> dict:
    """Token to'g'ri bo'lsa {email, name, sub, picture} qaytaradi, aks holda AppError."""
    if not settings.GOOGLE_CLIENT_ID:
        raise AppError("Google orqali kirish sozlanmagan", 503, "google_not_configured")
    try:
        r = httpx.get(TOKENINFO, params={"id_token": credential}, timeout=10)
    except httpx.HTTPError:
        log.exception("Google tokeninfo bilan aloqa xatosi")
        raise AppError("Google bilan aloqa o'rnatib bo'lmadi. Keyinroq urinib ko'ring", 503, "google_unreachable")
    if r.status_code != 200:
        raise AppError("Google tokeni yaroqsiz yoki muddati tugagan", 401, "google_invalid")
    d = r.json()
    if d.get("aud") != settings.GOOGLE_CLIENT_ID or d.get("iss") not in ISSUERS:
        raise AppError("Google tokeni bu ilova uchun berilmagan", 401, "google_invalid")
    if str(d.get("email_verified")).lower() != "true" or not d.get("email"):
        raise AppError("Google emailingiz tasdiqlanmagan", 401, "google_email_unverified")
    return {"email": d["email"].lower(), "name": d.get("name") or d["email"].split("@")[0], "sub": d.get("sub"), "picture": d.get("picture")}
