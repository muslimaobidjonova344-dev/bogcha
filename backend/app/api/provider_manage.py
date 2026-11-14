"""Muassasa (bog'cha admini / repetitor) o'z ma'lumotlarini boshqarishi."""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_my_provider, require_roles
from app.core.errors import AppError, Conflict, Forbidden, NotFound
from app.core.security import now_utc
from app.models import (District, KindergartenGroup, KindergartenStaff, Provider, ProviderDocument, ProviderSchedule,
                        Region, TutorService, TutorSubject, UploadedFile, User, Category)
from app.schemas.common import Msg
from app.schemas.provider import *  # noqa
from app.services.audit import audit
from app.services.search import provider_card

router = APIRouter(prefix="/me/provider", tags=["provider-manage"])
kg_only = require_roles("kindergarten_admin")
tutor_only = require_roles("tutor")


def _own(db: Session, model, user: User, rid: str, provider: Provider):
    r = db.get(model, rid)
    if not r or getattr(r, "deleted_at", None) or r.provider_id != provider.id:
        raise NotFound()
    return r


@router.get("")
def my_profile(p: Provider = Depends(get_my_provider), db: Session = Depends(get_db)):
    d = provider_card(db, p, full=True)
    d.update(verification_status=p.verification_status, verification_note=p.verification_note, region_id=p.region_id,
             district_id=p.district_id, email=p.email, phone=p.phone)
    docs = db.query(ProviderDocument).filter(ProviderDocument.provider_id == p.id).all()
    d["documents"] = [{"id": x.id, "doc_type": x.doc_type, "title": x.title, "status": x.status, "review_note": x.review_note,
                       "file_id": x.file_id, "created_at": x.created_at} for x in docs]
    return d


@router.put("")
def update_profile(data: ProviderProfileIn, p: Provider = Depends(get_my_provider), db: Session = Depends(get_db),
                   user: User = Depends(require_roles("kindergarten_admin", "tutor"))):
    vals = data.model_dump(exclude_unset=True)
    if p.type == "kindergarten":
        for k in ("specialty", "education_degree", "education_institution", "experience_years", "teaching_style",
                  "intro_video_url", "lesson_mode", "service_area", "languages", "hourly_price"):
            vals.pop(k, None)
    else:
        for k in ("ownership", "meal_type", "monthly_price", "min_age", "max_age"):
            vals.pop(k, None)
    if vals.get("district_id"):
        d = db.get(District, vals["district_id"])
        rid = vals.get("region_id", p.region_id)
        if not d or (rid and d.region_id != rid):
            raise AppError("Tuman tanlangan viloyatga tegishli emas", 422, "validation")
    for k, v in vals.items():
        setattr(p, k, v)
    user.profile_completed = bool(p.name and p.region_id and p.address)
    audit(db, user.id, "provider.profile_updated", "provider", p.id)
    db.commit()
    return {"ok": True}


@router.post("/submit-for-review", response_model=Msg)
def submit_for_review(p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("kindergarten_admin", "tutor")),
                      db: Session = Depends(get_db)):
    if not user.email_verified:
        raise Forbidden("Avval emailingizni tasdiqlang")
    if not (p.name and p.region_id and p.district_id and p.address and p.phone):
        raise AppError("Profilni to'ldiring: nom, viloyat, tuman, manzil va telefon majburiy", 422, "incomplete")
    if not db.query(ProviderDocument).filter(ProviderDocument.provider_id == p.id).count():
        raise AppError("Kamida bitta tasdiqlovchi hujjat yuklang", 422, "no_documents")
    if p.verification_status == "approved":
        raise Conflict("Profil allaqachon tasdiqlangan")
    if p.verification_status == "suspended":
        raise Forbidden("Profil to'xtatilgan. Administrator bilan bog'laning")
    p.verification_status = "under_review"
    db.query(ProviderDocument).filter(ProviderDocument.provider_id == p.id, ProviderDocument.status == "rejected").update({"status": "pending"})
    audit(db, user.id, "provider.submitted", "provider", p.id)
    db.commit()
    return Msg(message="Tekshiruvga yuborildi")


# ---------- Hujjatlar ----------
@router.post("/documents", status_code=201)
def add_document(data: DocumentIn, p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("kindergarten_admin", "tutor")),
                 db: Session = Depends(get_db)):
    f = db.get(UploadedFile, data.file_id)
    if not f or f.owner_id != user.id or not f.is_private:
        raise NotFound("Fayl topilmadi")
    doc = ProviderDocument(provider_id=p.id, doc_type=data.doc_type, title=data.title, file_id=f.id)
    db.add(doc)
    db.commit()
    return {"id": doc.id}


@router.delete("/documents/{did}", response_model=Msg)
def delete_document(did: str, p: Provider = Depends(get_my_provider), db: Session = Depends(get_db)):
    d = db.get(ProviderDocument, did)
    if not d or d.provider_id != p.id:
        raise NotFound()
    if d.status == "approved":
        raise Conflict("Tasdiqlangan hujjatni o'chirib bo'lmaydi")
    db.delete(d)
    db.commit()
    return Msg(message="O'chirildi")


# ---------- Bog'cha: guruhlar ----------
def _group_out(g: KindergartenGroup, db: Session) -> dict:
    t = db.get(KindergartenStaff, g.teacher_id) if g.teacher_id else None
    return {"id": g.id, "name": g.name, "min_age": g.min_age, "max_age": g.max_age, "capacity": g.capacity,
            "current_count": g.current_count, "free_places": g.free_places, "teacher_id": g.teacher_id,
            "teacher_name": t.full_name if t else None, "schedule_text": g.schedule_text, "meal_type": g.meal_type,
            "extra_services": g.extra_services, "monthly_price": g.monthly_price}


def _check_teacher(db: Session, p: Provider, teacher_id: str | None):
    if teacher_id:
        t = db.get(KindergartenStaff, teacher_id)
        if not t or t.deleted_at or t.provider_id != p.id:
            raise AppError("Tarbiyachi topilmadi", 422, "validation")


@router.get("/groups")
def list_groups(p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    rows = db.query(KindergartenGroup).filter(KindergartenGroup.provider_id == p.id, KindergartenGroup.deleted_at.is_(None)).all()
    return [_group_out(g, db) for g in rows]


@router.post("/groups", status_code=201)
def create_group(data: GroupIn, p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    _check_teacher(db, p, data.teacher_id)
    g = KindergartenGroup(provider_id=p.id, **data.model_dump())
    db.add(g)
    db.commit()
    return _group_out(g, db)


@router.patch("/groups/{gid}")
def update_group(gid: str, data: GroupUpdate, p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    g = db.query(KindergartenGroup).filter(KindergartenGroup.id == gid).with_for_update().first()
    if not g or g.deleted_at or g.provider_id != p.id:
        raise NotFound()
    vals = data.model_dump(exclude_unset=True)
    if "capacity" in vals and vals["capacity"] < g.current_count:
        raise AppError("Sig'im hozirgi bolalar sonidan kam bo'lishi mumkin emas", 422, "validation")
    if "teacher_id" in vals:
        _check_teacher(db, p, vals["teacher_id"])
    for k, v in vals.items():
        setattr(g, k, v)
    if g.min_age > g.max_age:
        raise AppError("Yosh chegarasi noto'g'ri", 422, "validation")
    db.commit()
    return _group_out(g, db)


@router.delete("/groups/{gid}", response_model=Msg)
def delete_group(gid: str, p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    g = _own(db, KindergartenGroup, user, gid, p)
    if g.current_count > 0:
        raise Conflict("Guruhda bolalar bor. Avval ularni boshqa guruhga ko'chiring")
    g.deleted_at = now_utc()
    db.commit()
    return Msg(message="Guruh o'chirildi")


# ---------- Bog'cha: tarbiyachilar ----------
@router.get("/staff")
def list_staff(p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    rows = db.query(KindergartenStaff).filter(KindergartenStaff.provider_id == p.id, KindergartenStaff.deleted_at.is_(None)).all()
    return [{"id": s.id, "full_name": s.full_name, "position": s.position, "phone": s.phone,
             "experience_years": s.experience_years, "photo_url": s.photo_url} for s in rows]


@router.post("/staff", status_code=201)
def add_staff(data: StaffIn, p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    s = KindergartenStaff(provider_id=p.id, **data.model_dump())
    db.add(s)
    db.commit()
    return {"id": s.id}


@router.put("/staff/{sid}", response_model=Msg)
def update_staff(sid: str, data: StaffIn, p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    s = _own(db, KindergartenStaff, user, sid, p)
    for k, v in data.model_dump().items():
        setattr(s, k, v)
    db.commit()
    return Msg(message="Saqlandi")


@router.delete("/staff/{sid}", response_model=Msg)
def delete_staff(sid: str, p: Provider = Depends(get_my_provider), user: User = Depends(kg_only), db: Session = Depends(get_db)):
    s = _own(db, KindergartenStaff, user, sid, p)
    s.deleted_at = now_utc()
    db.query(KindergartenGroup).filter(KindergartenGroup.teacher_id == s.id).update({"teacher_id": None})
    db.commit()
    return Msg(message="O'chirildi")


# ---------- Repetitor: fanlar, xizmatlar ----------
@router.get("/subjects")
def get_subjects(p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    return [s.subject for s in db.query(TutorSubject).filter(TutorSubject.provider_id == p.id)]


@router.put("/subjects", response_model=Msg)
def set_subjects(data: SubjectsIn, p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    names = sorted({s.strip() for s in data.subjects if s.strip()})
    db.query(TutorSubject).filter(TutorSubject.provider_id == p.id).delete()
    for n in names:
        db.add(TutorSubject(provider_id=p.id, subject=n[:100]))
    db.commit()
    return Msg(message="Fanlar saqlandi")


def _svc_out(s: TutorService) -> dict:
    return {"id": s.id, "subject": s.subject, "education_level": s.education_level, "grades": s.grades,
            "duration_minutes": s.duration_minutes, "format": s.format, "mode": s.mode, "price": s.price,
            "language": s.language, "description": s.description}


@router.get("/services")
def list_services(p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    return [_svc_out(s) for s in db.query(TutorService).filter(TutorService.provider_id == p.id, TutorService.deleted_at.is_(None))]


@router.post("/services", status_code=201)
def add_service(data: ServiceIn, p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    s = TutorService(provider_id=p.id, **data.model_dump())
    db.add(s)
    if not db.query(TutorSubject).filter(TutorSubject.provider_id == p.id, TutorSubject.subject == s.subject).first():
        db.add(TutorSubject(provider_id=p.id, subject=s.subject))
    db.flush()
    prices = [x.price for x in db.query(TutorService).filter(TutorService.provider_id == p.id, TutorService.deleted_at.is_(None))]
    p.hourly_price = min(prices + [s.price])
    db.commit()
    return _svc_out(s)


@router.put("/services/{sid}")
def update_service(sid: str, data: ServiceIn, p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    s = _own(db, TutorService, user, sid, p)
    for k, v in data.model_dump().items():
        setattr(s, k, v)
    db.commit()
    return _svc_out(s)


@router.delete("/services/{sid}", response_model=Msg)
def delete_service(sid: str, p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    s = _own(db, TutorService, user, sid, p)
    s.deleted_at = now_utc()
    db.commit()
    return Msg(message="O'chirildi")


# ---------- Repetitor: haftalik bo'sh vaqt ----------
@router.get("/schedule")
def get_schedule(p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    rows = db.query(ProviderSchedule).filter(ProviderSchedule.provider_id == p.id).order_by(ProviderSchedule.weekday, ProviderSchedule.start_time)
    return [{"id": r.id, "weekday": r.weekday, "start_time": r.start_time.strftime("%H:%M"), "end_time": r.end_time.strftime("%H:%M")} for r in rows]


@router.put("/schedule", response_model=Msg)
def set_schedule(data: ScheduleIn, p: Provider = Depends(get_my_provider), user: User = Depends(tutor_only), db: Session = Depends(get_db)):
    db.query(ProviderSchedule).filter(ProviderSchedule.provider_id == p.id).delete()
    for w in data.windows:
        db.add(ProviderSchedule(provider_id=p.id, weekday=w.weekday, start_time=w.start_time, end_time=w.end_time))
    db.commit()
    return Msg(message="Jadval saqlandi")
