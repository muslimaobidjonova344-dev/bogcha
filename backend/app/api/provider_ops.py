"""Muassasa dashboardlari, bolalar/o'quvchilar, darslar, statistika (haqiqiy hisoblar)."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_my_provider, require_roles
from app.core.errors import AppError, NotFound
from app.core.security import now_utc
from app.models import (Application, Child, ConversationMember, Conversation, KindergartenGroup, Lesson, LessonBooking, Message, Provider, Review, Student, User)
from app.schemas.common import Msg
from app.services.applications import age_in_years

router = APIRouter(prefix="/me/provider", tags=["provider-ops"])
TZ = ZoneInfo("Asia/Tashkent")
prov_roles = require_roles("kindergarten_admin", "tutor")


def _month_series(db: Session, provider_id: str, months: int = 6):
    now = datetime.now(TZ)
    out = []
    for i in range(months - 1, -1, -1):
        y, m = now.year, now.month - i
        while m <= 0:
            m += 12
            y -= 1
        start = datetime(y, m, 1, tzinfo=TZ)
        end = datetime(y + (m == 12), 1 if m == 12 else m + 1, 1, tzinfo=TZ)
        n = db.query(Application).filter(Application.provider_id == provider_id, Application.created_at >= start, Application.created_at < end).count()
        out.append({"month": f"{m:02d}.{y}", "count": n})
    return out


def _status_counts(db: Session, pid: str) -> dict:
    rows = db.query(Application.status, func.count()).filter(Application.provider_id == pid).group_by(Application.status).all()
    return {s: c for s, c in rows}


def _unread(db: Session, user: User) -> int:
    ids = [m.conversation_id for m in db.query(ConversationMember).filter(ConversationMember.user_id == user.id)]
    if not ids:
        return 0
    return db.query(Message).filter(Message.conversation_id.in_(ids), Message.sender_id != user.id, Message.read_at.is_(None), Message.hidden.is_(False)).count()


@router.get("/dashboard")
def dashboard(p: Provider = Depends(get_my_provider), user: User = Depends(prov_roles), db: Session = Depends(get_db)):
    sc = _status_counts(db, p.id)
    base = {"verification_status": p.verification_status, "unread_messages": _unread(db, user),
            "applications_by_month": _month_series(db, p.id), "rating_avg": p.rating_avg, "rating_count": p.rating_count}
    if p.type == "kindergarten":
        groups = db.query(KindergartenGroup).filter(KindergartenGroup.provider_id == p.id, KindergartenGroup.deleted_at.is_(None)).all()
        base.update(
            total_applications=sum(sc.values()), new_applications=sc.get("SUBMITTED", 0),
            under_review=sc.get("UNDER_REVIEW", 0) + sc.get("MORE_INFO_REQUIRED", 0) + sc.get("INTERVIEW_SCHEDULED", 0),
            accepted=sc.get("ACCEPTED", 0), rejected=sc.get("REJECTED", 0),
            total_children=db.query(Student).filter(Student.provider_id == p.id, Student.status == "active").count(),
            groups_count=len(groups), free_places=sum(g.free_places for g in groups))
    else:
        now = now_utc()
        today = datetime.now(TZ).date()
        day_start = datetime(today.year, today.month, today.day, tzinfo=TZ)
        week_end = day_start + timedelta(days=7)
        L = db.query(Lesson).filter(Lesson.provider_id == p.id, Lesson.status == "planned")
        month_start = datetime(today.year, today.month, 1, tzinfo=TZ)
        income = db.query(func.coalesce(func.sum(Lesson.price), 0)).filter(Lesson.provider_id == p.id, Lesson.status == "done", Lesson.starts_at >= month_start).scalar()
        base.update(
            total_students=db.query(Student).filter(Student.provider_id == p.id, Student.status == "active").count(),
            new_requests=sc.get("SUBMITTED", 0), active_lessons=L.filter(Lesson.ends_at >= now).count(),
            today_lessons=L.filter(Lesson.starts_at >= day_start, Lesson.starts_at < day_start + timedelta(days=1)).count(),
            week_lessons=L.filter(Lesson.starts_at >= day_start, Lesson.starts_at < week_end).count(),
            monthly_income=int(income or 0), payment_module_enabled=False)  # to'lov moduli yoqilmagan: daromad faqat o'tkazilgan darslar narxi
    return base


@router.get("/students")
def students(group_id: str | None = None, p: Provider = Depends(get_my_provider), user: User = Depends(prov_roles), db: Session = Depends(get_db)):
    q = db.query(Student).filter(Student.provider_id == p.id, Student.status == "active")
    if group_id:
        q = q.filter(Student.group_id == group_id)
    out = []
    for s in q.all():
        c = db.get(Child, s.child_id)
        par = db.get(User, s.parent_user_id)
        g = db.get(KindergartenGroup, s.group_id) if s.group_id else None
        out.append({"id": s.id, "first_name": c.first_name, "last_name": c.last_name, "age": age_in_years(c.birth_date),
                    "group_id": s.group_id, "group_name": g.name if g else None, "parent_name": par.full_name, "parent_phone": par.phone,
                    "extra_info": c.extra_info, "since": s.created_at})
    return out


class MoveIn(BaseModel):
    group_id: str


@router.post("/students/{sid}/move", response_model=Msg)
def move_student(sid: str, data: MoveIn, p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("kindergarten_admin")), db: Session = Depends(get_db)):
    st = db.get(Student, sid)
    if not st or st.provider_id != p.id or st.status != "active":
        raise NotFound()
    c = db.get(Child, st.child_id)
    g_new = db.query(KindergartenGroup).filter(KindergartenGroup.id == data.group_id).with_for_update().first()
    if not g_new or g_new.provider_id != p.id or g_new.deleted_at:
        raise NotFound("Guruh topilmadi")
    if g_new.current_count >= g_new.capacity:
        raise AppError("Guruhda bo'sh joy yo'q", 409, "full")
    if not g_new.min_age <= age_in_years(c.birth_date) <= g_new.max_age:
        raise AppError("Bola yoshi guruh chegarasiga mos emas", 422, "age_mismatch")
    if st.group_id:
        g_old = db.query(KindergartenGroup).filter(KindergartenGroup.id == st.group_id).with_for_update().first()
        if g_old:
            g_old.current_count = max(g_old.current_count - 1, 0)
    g_new.current_count += 1
    st.group_id = g_new.id
    db.commit()
    return Msg(message="Ko'chirildi")


@router.get("/lessons")
def lessons(history: bool = False, page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100),
            p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("tutor")), db: Session = Depends(get_db)):
    q = db.query(Lesson).filter(Lesson.provider_id == p.id)
    now = now_utc()
    q = q.filter(Lesson.ends_at < now) if history else q.filter(Lesson.ends_at >= now, Lesson.status != "cancelled")
    total = q.count()
    rows = q.order_by(Lesson.starts_at.desc() if history else Lesson.starts_at).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for l in rows:
        st = db.get(Student, l.student_id)
        c = db.get(Child, st.child_id) if st else None
        items.append({"id": l.id, "subject": l.subject, "starts_at": l.starts_at, "ends_at": l.ends_at, "price": l.price, "status": l.status,
                      "student_name": f"{c.first_name} {c.last_name}" if c else None})
    return {"items": items, "total": total}


class LessonStatusIn(BaseModel):
    status: str  # done | cancelled


@router.post("/lessons/{lid}/status", response_model=Msg)
def lesson_status(lid: str, data: LessonStatusIn, p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("tutor")), db: Session = Depends(get_db)):
    l = db.get(Lesson, lid)
    if not l or l.provider_id != p.id:
        raise NotFound()
    if data.status not in ("done", "cancelled") or l.status != "planned":
        raise AppError("Holatni o'zgartirib bo'lmaydi", 409, "bad_transition")
    if data.status == "done" and l.starts_at > now_utc():
        raise AppError("Hali boshlanmagan darsni o'tkazilgan deb belgilab bo'lmaydi", 409, "bad_transition")
    l.status = data.status
    if data.status == "cancelled" and l.booking_id:
        b = db.get(LessonBooking, l.booking_id)
        if b:
            b.status = "cancelled"  # vaqt bo'shaydi
    db.commit()
    return Msg(message="Saqlandi")


@router.get("/statistics")
def statistics(p: Provider = Depends(get_my_provider), user: User = Depends(prov_roles), db: Session = Depends(get_db)):
    sc = _status_counts(db, p.id)
    dist = dict(db.query(Review.rating, func.count()).filter(Review.provider_id == p.id, Review.status == "published", Review.deleted_at.is_(None)).group_by(Review.rating).all())
    return {"applications_by_month": _month_series(db, p.id, 12), "status_counts": sc,
            "rating_distribution": {str(i): dist.get(i, 0) for i in range(1, 6)}, "rating_avg": p.rating_avg, "rating_count": p.rating_count}
