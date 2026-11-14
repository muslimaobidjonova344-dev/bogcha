"""Ariza biznes jarayoni: holat mashinasi, tarix, bildirishnoma, guruh sig'imi va repetitor jadvali."""
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.errors import AppError, Conflict, Forbidden
from app.core.security import now_utc
from app.models import (Application, ApplicationHistory, Child, KindergartenGroup, Lesson, LessonBooking, Provider,
                        ProviderSchedule, Student, TutorService, User)
from app.services.notify import notify

TZ = ZoneInfo("Asia/Tashkent")
ACTIVE = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED", "INTERVIEW_SCHEDULED"]
TERMINAL = ["ACCEPTED", "REJECTED", "CANCELLED"]
# provider ruxsat etilgan o'tishlar
PROVIDER_TRANSITIONS = {
    "SUBMITTED": {"UNDER_REVIEW", "MORE_INFO_REQUIRED", "INTERVIEW_SCHEDULED", "ACCEPTED", "REJECTED"},
    "UNDER_REVIEW": {"MORE_INFO_REQUIRED", "INTERVIEW_SCHEDULED", "ACCEPTED", "REJECTED"},
    "MORE_INFO_REQUIRED": {"REJECTED"},
    "INTERVIEW_SCHEDULED": {"ACCEPTED", "REJECTED", "MORE_INFO_REQUIRED"},
}
LABELS = {"SUBMITTED": "yuborildi", "UNDER_REVIEW": "ko'rib chiqilmoqda", "MORE_INFO_REQUIRED": "qo'shimcha ma'lumot kerak",
          "INTERVIEW_SCHEDULED": "suhbat belgilandi", "ACCEPTED": "qabul qilindi", "REJECTED": "rad etildi", "CANCELLED": "bekor qilindi"}
NOTIF_TYPE = {"UNDER_REVIEW": "application_under_review", "MORE_INFO_REQUIRED": "application_more_info",
              "INTERVIEW_SCHEDULED": "interview_scheduled", "ACCEPTED": "application_accepted", "REJECTED": "application_rejected"}


def age_in_years(b, today=None):
    t = today or datetime.now(TZ).date()
    return t.year - b.year - ((t.month, t.day) < (b.month, b.day))


def new_number(db: Session) -> str:
    for _ in range(10):
        n = f"ARZ-{datetime.now(TZ).year}-{secrets.randbelow(900000) + 100000}"
        if not db.query(Application).filter(Application.number == n).first():
            return n
    raise AppError("Raqam yaratib bo'lmadi, qayta urinib ko'ring", 500)


def add_history(db: Session, app: Application, to_status: str, actor_id: str | None, note: str | None, from_status: str | None = None):
    db.add(ApplicationHistory(application_id=app.id, from_status=from_status, to_status=to_status, actor_id=actor_id, note=note))


def create_kindergarten_application(db: Session, parent: User, child: Child, provider: Provider, group_id: str,
                                    note: str | None, start_date) -> Application:
    g = db.get(KindergartenGroup, group_id)
    if not g or g.deleted_at or g.provider_id != provider.id:
        raise AppError("Guruh topilmadi", 422, "validation")
    age = age_in_years(child.birth_date)
    if not (g.min_age <= age <= g.max_age):
        raise AppError(f"Farzandingiz yoshi ({age}) bu guruh yosh chegarasiga ({g.min_age}–{g.max_age}) mos emas", 422, "age_mismatch")
    dup = db.query(Application).filter(Application.child_id == child.id, Application.provider_id == provider.id,
                                       Application.status.in_(ACTIVE)).first()
    if dup:
        raise Conflict("Bu farzand uchun ushbu bog'chaga faol ariza mavjud")
    if db.query(Student).filter(Student.child_id == child.id, Student.provider_id == provider.id, Student.status == "active").first():
        raise Conflict("Farzandingiz bu bog'chada allaqachon qabul qilingan")
    app = Application(number=new_number(db), type="kindergarten", parent_user_id=parent.id, child_id=child.id,
                      provider_id=provider.id, group_id=g.id, parent_note=note, desired_start_date=start_date, status="SUBMITTED")
    db.add(app)
    db.flush()
    add_history(db, app, "SUBMITTED", parent.id, note)
    _notify_submitted(db, app, parent, provider, child)
    return app


def create_tutor_request(db: Session, parent: User, child: Child, provider: Provider, service_id: str,
                         slot_start: datetime | None, grade: str | None, note: str | None) -> Application:
    s = db.get(TutorService, service_id)
    if not s or s.deleted_at or s.provider_id != provider.id:
        raise AppError("Xizmat topilmadi", 422, "validation")
    dup = db.query(Application).filter(Application.child_id == child.id, Application.provider_id == provider.id,
                                       Application.service_id == s.id, Application.status.in_(ACTIVE)).first()
    if dup:
        raise Conflict("Bu xizmat uchun faol so'rov mavjud")
    if slot_start:
        slot_start = _aware(slot_start)
        if slot_start <= now_utc():
            raise AppError("Dars vaqti kelajakda bo'lishi kerak", 422, "validation")
        _check_slot(db, provider, slot_start, s.duration_minutes, exclude_app=None)
    app = Application(number=new_number(db), type="tutor", parent_user_id=parent.id, child_id=child.id, provider_id=provider.id,
                      service_id=s.id, subject=s.subject, grade=grade, lesson_format=s.format, lesson_mode=s.mode,
                      duration_minutes=s.duration_minutes, desired_slot_start=slot_start, parent_note=note, status="SUBMITTED")
    db.add(app)
    db.flush()
    add_history(db, app, "SUBMITTED", parent.id, note)
    _notify_submitted(db, app, parent, provider, child)
    return app


def _aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=TZ) if dt.tzinfo is None else dt


def _check_slot(db: Session, provider: Provider, start: datetime, minutes: int, exclude_app: str | None):
    """Vaqt repetitorning bo'sh oynasida bo'lishi va boshqa bron bilan kesishmasligi shart."""
    end = start + timedelta(minutes=minutes)
    local = start.astimezone(TZ)
    local_end = end.astimezone(TZ)
    wins = db.query(ProviderSchedule).filter(ProviderSchedule.provider_id == provider.id, ProviderSchedule.weekday == local.isoweekday()).all()
    if not any(w.start_time <= local.time() and local_end.time() <= w.end_time and local.date() == local_end.date() for w in wins):
        raise AppError("Tanlangan vaqt repetitorning bo'sh vaqtlariga to'g'ri kelmaydi", 422, "slot_unavailable")
    q = db.query(LessonBooking).filter(LessonBooking.provider_id == provider.id, LessonBooking.status == "booked",
                                       LessonBooking.starts_at < end, LessonBooking.ends_at > start)
    if q.first():
        raise Conflict("Bu vaqt band. Boshqa vaqtni tanlang")


def _notify_submitted(db, app, parent, provider, child):
    notify(db, parent.id, "application_submitted", "Ariza yuborildi", f"{provider.name} — {app.number}", f"/parent/applications/{app.id}")
    kind = "bog'cha arizasi" if app.type == "kindergarten" else "dars so'rovi"
    notify(db, provider.owner_user_id, "application_submitted", "Yangi " + kind,
           f"{child.first_name} uchun {app.number}", "/provider/applications/" + app.id, send_email=True)


def change_status(db: Session, app: Application, to: str, actor: User, note: str | None = None, interview_at: datetime | None = None) -> Application:
    """Provider tomonidan holat o'zgartirish. Sig'im/jadval bilan bog'liq amallar tranzaksiya ichida qulflanadi."""
    allowed = PROVIDER_TRANSITIONS.get(app.status, set())
    if to not in allowed:
        raise AppError(f"'{LABELS.get(app.status)}' holatidan '{LABELS.get(to, to)}' holatiga o'tib bo'lmaydi", 409, "bad_transition")
    if to in ("REJECTED", "MORE_INFO_REQUIRED") and not (note and note.strip()):
        raise AppError("Izoh yozish majburiy", 422, "note_required")
    if to == "INTERVIEW_SCHEDULED":
        if not interview_at or _aware(interview_at) <= now_utc():
            raise AppError("Suhbat vaqti kelajakda bo'lishi kerak", 422, "validation")
        app.interview_at = _aware(interview_at)
    prev = app.status
    if to == "ACCEPTED":
        _accept(db, app)
    app.status = to
    if note:
        app.provider_note = note
    add_history(db, app, to, actor.id, note, prev)
    msg = note or ""
    if to == "INTERVIEW_SCHEDULED":
        msg = f"Suhbat: {app.interview_at.astimezone(TZ).strftime('%d.%m.%Y %H:%M')}. {note or ''}".strip()
    provider = db.get(Provider, app.provider_id)
    notify(db, app.parent_user_id, NOTIF_TYPE[to], f"Ariza {LABELS[to]}", f"{provider.name}: {msg}".strip(": "),
           f"/parent/applications/{app.id}", send_email=True)
    return app


def _accept(db: Session, app: Application):
    provider = db.get(Provider, app.provider_id)
    if provider.verification_status != "approved":
        raise Forbidden("Muassasa tasdiqlanmagan")
    if app.type == "kindergarten":
        # poyga holatidan himoya: guruh qatorini qulflaymiz
        g = db.execute(select(KindergartenGroup).where(KindergartenGroup.id == app.group_id).with_for_update()).scalar_one()
        if g.current_count >= g.capacity:
            raise Conflict("Guruhda bo'sh joy qolmagan")
        g.current_count += 1
        _ensure_student(db, app, g.id)
    else:
        db.execute(select(Provider).where(Provider.id == provider.id).with_for_update())  # bron uchun qulf
        if not app.desired_slot_start:
            raise AppError("Ariza uchun dars vaqti ko'rsatilmagan", 422, "no_slot")
        start = app.desired_slot_start
        end = start + timedelta(minutes=app.duration_minutes or 60)
        _check_slot(db, provider, start, app.duration_minutes or 60, exclude_app=app.id)
        st = _ensure_student(db, app, None)
        b = LessonBooking(provider_id=provider.id, application_id=app.id, student_id=st.id, starts_at=start, ends_at=end)
        db.add(b)
        db.flush()
        svc = db.get(TutorService, app.service_id)
        db.add(Lesson(provider_id=provider.id, student_id=st.id, booking_id=b.id, service_id=app.service_id, subject=app.subject,
                      starts_at=start, ends_at=end, price=svc.price if svc else None))


def _ensure_student(db: Session, app: Application, group_id: str | None) -> Student:
    st = db.query(Student).filter(Student.provider_id == app.provider_id, Student.child_id == app.child_id).first()
    if st:
        st.status, st.group_id, st.application_id = "active", group_id or st.group_id, app.id
    else:
        st = Student(provider_id=app.provider_id, child_id=app.child_id, parent_user_id=app.parent_user_id,
                     application_id=app.id, group_id=group_id)
        db.add(st)
    db.flush()
    return st


def cancel(db: Session, app: Application, actor: User, note: str | None):
    if app.status not in ACTIVE + ["ACCEPTED"]:
        raise AppError("Bu arizani bekor qilib bo'lmaydi", 409, "bad_transition")
    prev = app.status
    if prev == "ACCEPTED":  # joy/vaqtni bo'shatish
        if app.type == "kindergarten":
            g = db.execute(select(KindergartenGroup).where(KindergartenGroup.id == app.group_id).with_for_update()).scalar_one()
            g.current_count = max(g.current_count - 1, 0)
            db.query(Student).filter(Student.application_id == app.id).update({"status": "left"})
        else:
            db.query(LessonBooking).filter(LessonBooking.application_id == app.id).update({"status": "cancelled"})
            db.query(Lesson).filter(Lesson.booking_id.in_(select(LessonBooking.id).where(LessonBooking.application_id == app.id)),
                                    Lesson.status == "planned").update({"status": "cancelled"}, synchronize_session=False)
            db.query(Student).filter(Student.application_id == app.id).update({"status": "left"})
    app.status = "CANCELLED"
    add_history(db, app, "CANCELLED", actor.id, note, prev)
    provider = db.get(Provider, app.provider_id)
    notify(db, provider.owner_user_id, "application_rejected", "Ariza bekor qilindi", f"{app.number} ota-ona tomonidan bekor qilindi",
           f"/provider/applications/{app.id}")
    return app


def parent_respond(db: Session, app: Application, actor: User, note: str):
    if app.status != "MORE_INFO_REQUIRED":
        raise AppError("Hozir qo'shimcha ma'lumot so'ralmagan", 409, "bad_transition")
    app.status = "UNDER_REVIEW"
    app.parent_note = ((app.parent_note or "") + "\n— " + note).strip()
    add_history(db, app, "UNDER_REVIEW", actor.id, note, "MORE_INFO_REQUIRED")
    provider = db.get(Provider, app.provider_id)
    notify(db, provider.owner_user_id, "application_under_review", "Ota-ona javob yubordi", f"{app.number}: {note[:200]}",
           f"/provider/applications/{app.id}", send_email=True)
