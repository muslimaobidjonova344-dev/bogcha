from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import now_utc
from app.models import Notification, PushSubscription, User
from app.services.notify import NOTIF_TYPES

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(unread_only: bool = False, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    total = q.count()
    rows = q.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    unread = db.query(Notification).filter(Notification.user_id == user.id, Notification.read_at.is_(None)).count()
    return {"items": [{"id": n.id, "type": n.type, "title": n.title, "body": n.body, "link": n.link, "read": n.read_at is not None,
                       "created_at": n.created_at} for n in rows], "total": total, "unread": unread, "page": page, "page_size": page_size}


@router.post("/{nid}/read")
def read_one(nid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.id == nid, Notification.user_id == user.id, Notification.read_at.is_(None)).update({"read_at": now_utc()})
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.read_at.is_(None)).update({"read_at": now_utc()})
    db.commit()
    return {"ok": True}


class PrefsIn(BaseModel):
    prefs: dict[str, dict[str, bool]]


@router.get("/settings")
def get_settings(user: User = Depends(get_current_user)):
    saved = user.notification_prefs or {}
    return {"types": NOTIF_TYPES, "prefs": {t: {"in_app": saved.get(t, {}).get("in_app", True), "email": saved.get(t, {}).get("email", True)} for t in NOTIF_TYPES}}


@router.put("/settings")
def put_settings(data: PrefsIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clean = {t: {"in_app": bool(v.get("in_app", True)), "email": bool(v.get("email", True))} for t, v in data.prefs.items() if t in NOTIF_TYPES}
    user.notification_prefs = clean
    db.commit()
    return {"ok": True}


class PushIn(BaseModel):
    endpoint: str
    keys: dict


@router.post("/push-subscribe")
def push_subscribe(data: PushIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == data.endpoint).first()
    if sub:
        sub.user_id, sub.keys = user.id, data.keys
    else:
        db.add(PushSubscription(user_id=user.id, endpoint=data.endpoint, keys=data.keys))
    db.commit()
    return {"ok": True}
