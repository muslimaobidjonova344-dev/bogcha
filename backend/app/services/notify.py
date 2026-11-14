"""Bildirishnoma yaratish: bazaga yozadi, foydalanuvchi sozlamasiga qarab email yuboradi."""
import logging
from sqlalchemy.orm import Session
from app.models import Notification, User
from app.services import email as email_service
from app.services.realtime import hub

log = logging.getLogger("notify")

NOTIF_TYPES = ["application_submitted", "application_under_review", "application_accepted",
               "application_rejected", "application_more_info", "new_message", "interview_scheduled",
               "lesson_reminder", "provider_approved", "provider_rejected", "review_new", "system"]


def notify(db: Session, user_id: str, type_: str, title: str, body: str = "", link: str | None = None,
           send_email: bool = False):
    user = db.get(User, user_id)
    if not user:
        return None
    prefs = (user.notification_prefs or {})
    if prefs.get(type_, {}).get("in_app", True) is False:
        return None
    n = Notification(user_id=user_id, type=type_, title=title, body=body[:500], link=link)
    db.add(n)
    hub.publish(user_id, {"type": "notification", "title": title, "body": body[:200], "link": link})
    want_email = send_email and user.email and prefs.get(type_, {}).get("email", True)
    if want_email:
        try:
            email_service.send_notification_email(user.email, user.full_name, title, body, link)
        except Exception:  # email xatosi asosiy jarayonni to'xtatmasin
            log.exception("Bildirishnoma emaili yuborilmadi")
    return n
