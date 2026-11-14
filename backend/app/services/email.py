"""Email yuborish: Google Apps Script veb-ilova orqali (apps-script/Code.gs)."""
import logging
import httpx
from app.core.config import settings
from app.services.email_templates import render_button_email, render_code_email

log = logging.getLogger("email")


def _send(to: str, subject: str, html: str) -> bool:
    if not settings.APPS_SCRIPT_URL:
        log.warning("APPS_SCRIPT_URL sozlanmagan. Email yuborilmadi: to=%s subject=%s", to, subject)
        return False
    payload = {"secret": settings.APPS_SCRIPT_SECRET, "to": to, "subject": subject,
               "html": html, "fromName": settings.EMAIL_FROM_NAME}
    # Apps Script 302 redirect qiladi -> follow_redirects shart
    r = httpx.post(settings.APPS_SCRIPT_URL, json=payload, timeout=30, follow_redirects=True)
    ok = r.status_code == 200 and '"ok":true' in r.text.replace(" ", "")
    if not ok:
        log.error("Apps Script xato: %s %s", r.status_code, r.text[:200])
    return ok


def send_verification_email(to: str, name: str, token: str) -> bool:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = render_button_email(
        name, "Emailingizni tasdiqlang",
        "Kichkintoy platformasida ro'yxatdan o'tganingiz uchun rahmat. Quyidagi tugma orqali emailingizni tasdiqlang.",
        "Emailni tasdiqlash", link, settings.EMAIL_TOKEN_MINUTES)
    return _send(to, "Emailingizni tasdiqlang — Kichkintoy", html)


def send_verification_code_email(to: str, name: str, code: str) -> bool:
    html = render_code_email(name, "Emailingizni tasdiqlang",
                             "Kichkintoy platformasida ro'yxatdan o'tganingiz uchun rahmat. Tasdiqlash kodini saytdagi maydonga kiriting.",
                             code, settings.EMAIL_TOKEN_MINUTES)
    return _send(to, f"{code} — Kichkintoy tasdiqlash kodi", html)


def send_password_reset_email(to: str, name: str, token: str) -> bool:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = render_button_email(
        name, "Parolni tiklash",
        "Parolingizni tiklash uchun so'rov oldik. Yangi parol o'rnatish uchun tugmani bosing.",
        "Parolni tiklash", link, settings.RESET_TOKEN_MINUTES)
    return _send(to, "Parolni tiklash — Kichkintoy", html)


def send_notification_email(to: str, name: str, title: str, body: str, link: str | None) -> bool:
    url = f"{settings.FRONTEND_URL}{link}" if link else settings.FRONTEND_URL
    html = render_button_email(name, title, body, "Ko'rish", url, None)
    return _send(to, f"{title} — Kichkintoy", html)
