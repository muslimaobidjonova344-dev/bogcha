"""Fon vazifalari (alohida worker kerak emas): lifespan ichida asyncio bilan."""
import asyncio
import logging
from datetime import timedelta
import httpx
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import now_utc
from app.models import (EmailVerificationToken, Lesson, OtpCode, PasswordResetToken, Student, Provider, Child)
from app.services.notify import notify

log = logging.getLogger("worker")


def lesson_reminders():
    """Keyingi 24 soat ichidagi darslar uchun eslatma (bir marta)."""
    db = SessionLocal()
    try:
        now = now_utc()
        rows = db.query(Lesson).filter(Lesson.status == "planned", Lesson.reminded.is_(False),
                                       Lesson.starts_at > now, Lesson.starts_at <= now + timedelta(hours=24)).all()
        for l in rows:
            st = db.get(Student, l.student_id)
            prov = db.get(Provider, l.provider_id)
            child = db.get(Child, st.child_id) if st else None
            when = l.starts_at.astimezone(_tz()).strftime("%d.%m.%Y %H:%M")
            if st:
                notify(db, st.parent_user_id, "lesson_reminder", "Dars eslatmasi",
                       f"{child.first_name if child else ''} — {l.subject or 'dars'}, {when}", "/parent/applications", True)
            notify(db, prov.owner_user_id, "lesson_reminder", "Dars eslatmasi", f"{l.subject or 'Dars'}: {when}", "/tutor/schedule")
            l.reminded = True
        db.commit()
    except Exception:
        db.rollback()
        log.exception("lesson_reminders")
    finally:
        db.close()


def cleanup():
    db = SessionLocal()
    try:
        cutoff = now_utc() - timedelta(days=7)
        for M in (EmailVerificationToken, PasswordResetToken, OtpCode):
            db.query(M).filter(M.expires_at < cutoff).delete()
        db.commit()
    except Exception:
        db.rollback()
        log.exception("cleanup")
    finally:
        db.close()


def _tz():
    from zoneinfo import ZoneInfo
    return ZoneInfo("Asia/Tashkent")


async def _loop(fn, seconds: int):
    while True:
        try:
            await asyncio.get_running_loop().run_in_executor(None, fn)
        except Exception:
            log.exception("worker loop")
        await asyncio.sleep(seconds)


async def _self_ping():
    """Render bepul tarifida uxlab qolmaslik uchun o'z-o'ziga so'rov."""
    while True:
        await asyncio.sleep(settings.SELF_PING_MINUTES * 60)
        try:
            async with httpx.AsyncClient(timeout=20) as c:
                await c.get(settings.SELF_PING_URL)
        except Exception:
            log.warning("self-ping xato")


def start_background(loop_tasks: list):
    loop_tasks.append(asyncio.create_task(_loop(lesson_reminders, 600)))
    loop_tasks.append(asyncio.create_task(_loop(cleanup, 6 * 3600)))
    if settings.SELF_PING_URL:
        loop_tasks.append(asyncio.create_task(_self_ping()))
