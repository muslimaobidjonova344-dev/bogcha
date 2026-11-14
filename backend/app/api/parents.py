from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.errors import Conflict, NotFound
from app.models import (Application, Child, Conversation, ConversationMember, Favorite, Message, Notification, ParentProfile, Provider, User)
from app.schemas.common import Msg
from app.schemas.parent import ChildIn, ChildOut, ChildUpdate, ParentProfileIn
from app.services.audit import audit
from app.services.search import provider_card, search_providers

router = APIRouter(tags=["parents"])
parent_only = require_roles("parent")


def calc_age(b: date, today: date | None = None) -> int:
    t = today or date.today()
    return t.year - b.year - ((t.month, t.day) < (b.month, b.day))


def child_out(c: Child) -> dict:
    age = calc_age(c.birth_date)
    months = (date.today().year - c.birth_date.year) * 12 + date.today().month - c.birth_date.month
    text = f"{age} yosh" if age >= 1 else f"{max(months, 0)} oylik"
    return {**{k: getattr(c, k) for k in ("id", "first_name", "last_name", "birth_date", "education_level", "interests", "parent_note", "extra_info")},
            "age": age, "age_text": text}


def own_child(db: Session, user: User, cid: str) -> Child:
    c = db.get(Child, cid)
    # boshqa ota-onaning bolasi mavjudligi ham oshkor bo'lmasin -> 404
    if not c or c.deleted_at or c.parent_user_id != user.id:
        raise NotFound("Farzand topilmadi")
    return c


@router.get("/children", response_model=list[ChildOut])
def list_children(user: User = Depends(parent_only), db: Session = Depends(get_db)):
    rows = db.query(Child).filter(Child.parent_user_id == user.id, Child.deleted_at.is_(None)).order_by(Child.created_at).all()
    return [child_out(c) for c in rows]


@router.post("/children", response_model=ChildOut, status_code=201)
def add_child(data: ChildIn, user: User = Depends(parent_only), db: Session = Depends(get_db)):
    c = Child(parent_user_id=user.id, **data.model_dump())
    db.add(c)
    db.commit()
    return child_out(c)


@router.get("/children/{cid}", response_model=ChildOut)
def get_child(cid: str, user: User = Depends(parent_only), db: Session = Depends(get_db)):
    return child_out(own_child(db, user, cid))


@router.patch("/children/{cid}", response_model=ChildOut)
def update_child(cid: str, data: ChildUpdate, user: User = Depends(parent_only), db: Session = Depends(get_db)):
    c = own_child(db, user, cid)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    return child_out(c)


@router.delete("/children/{cid}", response_model=Msg)
def delete_child(cid: str, user: User = Depends(parent_only), db: Session = Depends(get_db)):
    from app.models.mixins import utcnow
    c = own_child(db, user, cid)
    active = db.query(Application).filter(Application.child_id == c.id, Application.status.in_(
        ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED", "INTERVIEW_SCHEDULED"])).count()
    if active:
        raise Conflict("Bu farzand uchun faol arizalar bor. Avval ularni bekor qiling")
    c.deleted_at = utcnow()  # soft delete: tarix saqlanadi
    audit(db, user.id, "child.deleted", "child", c.id)
    db.commit()
    return Msg(message="Farzand o'chirildi")


@router.get("/parents/profile")
def get_profile(user: User = Depends(parent_only), db: Session = Depends(get_db)):
    p = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
    return {"region_id": p.region_id, "district_id": p.district_id, "address": p.address, "lat": p.lat, "lng": p.lng}


@router.put("/parents/profile")
def put_profile(data: ParentProfileIn, user: User = Depends(parent_only), db: Session = Depends(get_db)):
    p = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    return {"ok": True}


# ---------- Sevimlilar ----------
@router.get("/favorites")
def favorites(user: User = Depends(parent_only), db: Session = Depends(get_db)):
    rows = db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc()).all()
    out = []
    for f in rows:
        p = db.get(Provider, f.provider_id)
        if p and not p.deleted_at and p.verification_status == "approved":
            out.append(provider_card(db, p))
    return out


@router.put("/favorites/{pid}", response_model=Msg)
def add_favorite(pid: str, user: User = Depends(parent_only), db: Session = Depends(get_db)):
    p = db.get(Provider, pid)
    if not p or p.deleted_at or p.verification_status != "approved":
        raise NotFound("Muassasa topilmadi")
    if not db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.provider_id == pid).first():
        db.add(Favorite(user_id=user.id, provider_id=pid))
        db.commit()
    return Msg(message="Saqlandi")


@router.delete("/favorites/{pid}", response_model=Msg)
def remove_favorite(pid: str, user: User = Depends(parent_only), db: Session = Depends(get_db)):
    db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.provider_id == pid).delete()
    db.commit()
    return Msg(message="Olib tashlandi")


# ---------- Dashboard (haqiqiy hisoblar) ----------
@router.get("/parents/dashboard")
def dashboard(user: User = Depends(parent_only), db: Session = Depends(get_db)):
    children = db.query(Child).filter(Child.parent_user_id == user.id, Child.deleted_at.is_(None)).all()
    apps = db.query(Application).filter(Application.parent_user_id == user.id)
    active = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED", "INTERVIEW_SCHEDULED"]
    awaiting = ["SUBMITTED", "UNDER_REVIEW"]
    my_convs = [m.conversation_id for m in db.query(ConversationMember).filter(ConversationMember.user_id == user.id)]
    unread = 0
    if my_convs:
        unread = db.query(Message).filter(Message.conversation_id.in_(my_convs), Message.sender_id != user.id,
                                          Message.read_at.is_(None), Message.hidden.is_(False)).count()
    profile = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
    region_id = profile.region_id if profile else None
    min_age = min([calc_age(c.birth_date) for c in children], default=None)
    kg, _ = search_providers(db, "kindergarten", {"region_id": region_id, "age": min_age, "has_places": True, "sort": "rating"}, 1, 4)
    tu, _ = search_providers(db, "tutor", {"region_id": region_id, "sort": "rating"}, 1, 4)
    recent = apps.order_by(Application.created_at.desc()).limit(5).all()
    return {
        "children_count": len(children),
        "active_applications": apps.filter(Application.status.in_(active)).count(),
        "awaiting_applications": apps.filter(Application.status.in_(awaiting)).count(),
        "unread_messages": unread,
        "saved_count": db.query(Favorite).filter(Favorite.user_id == user.id).count(),
        "unread_notifications": db.query(Notification).filter(Notification.user_id == user.id, Notification.read_at.is_(None)).count(),
        "children": [child_out(c) for c in children],
        "recent_applications": [{"id": a.id, "number": a.number, "type": a.type, "status": a.status, "created_at": a.created_at,
                                 "provider_name": db.get(Provider, a.provider_id).name} for a in recent],
        "recommended_kindergartens": kg, "recommended_tutors": tu,
    }
