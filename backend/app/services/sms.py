"""SMS yuborish (Eskiz.uz). Kalit sozlanmagan bo'lsa False qaytaradi — soxta 'yuborildi' demaymiz."""
import logging
import httpx
from app.core.config import settings

log = logging.getLogger("sms")
_token: str | None = None


def send_sms(phone: str, text: str) -> bool:
    global _token
    if settings.SMS_PROVIDER != "eskiz" or not settings.ESKIZ_EMAIL:
        log.warning("SMS provayder sozlanmagan")
        return False
    try:
        if not _token:
            r = httpx.post("https://notify.eskiz.uz/api/auth/login",
                           data={"email": settings.ESKIZ_EMAIL, "password": settings.ESKIZ_PASSWORD}, timeout=20)
            _token = r.json()["data"]["token"]
        r = httpx.post("https://notify.eskiz.uz/api/message/sms/send",
                       headers={"Authorization": f"Bearer {_token}"},
                       data={"mobile_phone": phone.lstrip("+"), "message": text, "from": "4546"}, timeout=20)
        if r.status_code == 401:
            _token = None
        return r.status_code == 200
    except Exception:
        log.exception("SMS yuborilmadi")
        return False
