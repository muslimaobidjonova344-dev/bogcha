from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_my_provider, require_roles, require_verified
from app.core.errors import Forbidden, NotFound
from app.models import (Application, ApplicationHistory, Child, KindergartenGroup, Provider, Student, TutorService, User)
from app.schemas.application import *  # noqa
from app.services import applications as svc
from app.services.audit import audit

router = APIRouter(tags=["applications"])


def _history(db: Session, app: Application) -> list[dict]:
    rows = db.query(ApplicationHistory).filter(ApplicationHistory.application_id == app.id).order_by(ApplicationHistory.created_at).all()
    return [{"from_status": h.from_status, "to_status": h.to_status, "note": h.note, "created_at": h.created_at, "actor_id": h.actor_id} for h in rows]


def _base(db: Session, a: Application) -> dict:
    prov = db.get(Provider, a.provider_id)
    child = db.get(Child, a.child_id)
    grp = db.get(KindergartenGroup, a.group_id) if a.group_id else None
    return {"id": a.id, "number": a.number, "type": a.type, "status": a.status, "created_at": a.created_at,
            "updated_at": a.updated_at, "provider_id": prov.id, "provider_name": prov.name, "child_id": child.id,
            "child_name": f"{child.first_name} {child.last_name}", "group_id": a.group_id, "group_name": grp.name if grp else None,
            "service_id": a.service_id, "subject": a.subject, "grade": a.grade, "lesson_format": a.lesson_format,
            "lesson_mode": a.lesson_mode, "duration_minutes": a.duration_minutes, "desired_start_date": a.desired_start_date,
            "desired_slot_start": a.desired_slot_start, "parent_note": a.parent_note, "provider_note": a.provider_note,
            "interview_at": a.interview_at}


def _parent_app(db: Session, user: User, aid: str) -> Application:
    a = db.get(Application, aid)
    if not a or a.parent_user_id != user.id:
        raise NotFound("Ariza topilmadi")
    return a


def _provider_app(db: Session, p: Provider, aid: str) -> Application:
    a = db.get(Application, aid)
    if not a or a.provider_id != p.id:  # provider faqat o'z arizalarini ko'radi
        raise NotFound("Ariza topilmadi")
    return a


def _own_child_and_provider(db: Session, user: User, child_id: str, provider_id: str, ptype: str):
    child = db.get(Child, child_id)
    if not child or child.deleted_at or child.parent_user_id != user.id:
        raise NotFound("Farzand topilmadi")
    prov = db.get(Provider, provider_id)
    if not prov or prov.deleted_at or prov.type != ptype or prov.verification_status != "approved":
        raise NotFound("Muassasa topilmadi yoki tasdiqlanmagan")
    return child, prov


# ---------- Ota-ona ----------
@router.post("/applications/kindergarten", status_code=201)
def apply_kindergarten(data: KgApplicationIn, user: User = Depends(require_roles("parent")), _v=Depends(require_verified), db: Session = Depends(get_db)):
    child, prov = _own_child_and_provider(db, user, data.child_id, data.provider_id, "kindergarten")
    a = svc.create_kindergarten_application(db, user, child, prov, data.group_id, data.parent_note, data.desired_start_date)
    db.commit()
    return _base(db, a)


@router.post("/applications/tutor", status_code=201)
def request_tutor(data: TutorRequestIn, user: User = Depends(require_roles("parent")), _v=Depends(require_verified), db: Session = Depends(get_db)):
    child, prov = _own_child_and_provider(db, user, data.child_id, data.provider_id, "tutor")
    a = svc.create_tutor_request(db, user, child, prov, data.service_id, data.desired_slot_start, data.grade, data.parent_note)
    db.commit()
    return _base(db, a)


@router.get("/applications/mine")
def my_applications(status: str | None = None, type: str | None = None, page: int = Query(1, ge=1),
                    page_size: int = Query(20, ge=1, le=50), user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    q = db.query(Application).filter(Application.parent_user_id == user.id)
    if status:
        q = q.filter(Application.status == status)
    if type:
        q = q.filter(Application.type == type)
    total = q.count()
    rows = q.order_by(Application.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [_base(db, a) for a in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/applications/mine/{aid}")
def my_application(aid: str, user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    a = _parent_app(db, user, aid)
    return {**_base(db, a), "history": _history(db, a)}


@router.post("/applications/mine/{aid}/cancel")
def cancel_application(aid: str, data: CancelIn, user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    a = _parent_app(db, user, aid)
    svc.cancel(db, a, user, data.note)
    audit(db, user.id, "application.cancelled", "application", a.id)
    db.commit()
    return _base(db, a)


@router.post("/applications/mine/{aid}/respond")
def respond_more_info(aid: str, data: NoteIn, user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    a = _parent_app(db, user, aid)
    svc.parent_respond(db, a, user, data.note)
    db.commit()
    return _base(db, a)


# ---------- Provider ----------
@router.get("/me/provider/applications")
def provider_applications(status: str | None = None, q: str | None = None, page: int = Query(1, ge=1),
                          page_size: int = Query(20, ge=1, le=50), p: Provider = Depends(get_my_provider),
                          user: User = Depends(require_roles("kindergarten_admin", "tutor")), db: Session = Depends(get_db)):
    query = db.query(Application).filter(Application.provider_id == p.id)
    if status:
        query = query.filter(Application.status == status)
    if q:
        like = f"%{q.strip()}%"
        ids = [c.id for c in db.query(Child).filter(or_(Child.first_name.ilike(like), Child.last_name.ilike(like)))]
        query = query.filter(or_(Application.number.ilike(like), Application.child_id.in_(ids or [""])))
    total = query.count()
    rows = query.order_by(Application.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for a in rows:
        b = _base(db, a)
        c = db.get(Child, a.child_id)
        b["child_age"] = svc.age_in_years(c.birth_date)
        items.append(b)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/me/provider/applications/{aid}")
def provider_application(aid: str, p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("kindergarten_admin", "tutor")),
                         db: Session = Depends(get_db)):
    a = _provider_app(db, p, aid)
    child = db.get(Child, a.child_id)
    parent = db.get(User, a.parent_user_id)
    out = {**_base(db, a), "history": _history(db, a)}
    # bola ma'lumoti: asosiy qismi; maxfiy qo'shimcha ma'lumot faqat qabul qilingandan keyin
    out["child"] = {"first_name": child.first_name, "last_name": child.last_name, "birth_date": child.birth_date,
                    "age": svc.age_in_years(child.birth_date), "education_level": child.education_level, "interests": child.interests,
                    "parent_note": child.parent_note, "extra_info": child.extra_info if a.status == "ACCEPTED" else None}
    out["parent"] = {"full_name": parent.full_name, "phone": parent.phone if a.status in ("INTERVIEW_SCHEDULED", "ACCEPTED") else None}
    return out


@router.post("/me/provider/applications/{aid}/status")
def provider_change_status(aid: str, data: StatusIn, p: Provider = Depends(get_my_provider),
                           user: User = Depends(require_roles("kindergarten_admin", "tutor")), db: Session = Depends(get_db)):
    a = _provider_app(db, p, aid)
    svc.change_status(db, a, data.status, user, data.note, data.interview_at)
    audit(db, user.id, "application.status", "application", a.id, {"to": data.status})
    db.commit()
    return _base(db, a)
