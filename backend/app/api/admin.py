"""Super Admin: foydalanuvchilar, moderatsiya, shikoyatlar, hududlar, kategoriyalar, audit, hisobotlar, tizim."""
import csv
import io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import client_ip, require_roles
from app.core.errors import AppError, Forbidden, NotFound
from app.core.security import now_utc
from app.models import (Application, AuditLog, Category, District, Message, Provider, ProviderDocument, Region, Report, Review, UploadedFile, User, UserSession)
from app.models.identity import ROLES
from app.schemas.common import Msg
from app.services.audit import audit
from app.services.notify import notify
from app.services.reviews import recompute_rating

router = APIRouter(prefix="/admin", tags=["admin"])
admin_only = require_roles("super_admin")


def _need_2fa(user: User = Depends(admin_only)) -> User:
    """Muhim amallar uchun adminda 2FA yoqilgan bo'lishi talab qilinadi (production'da)."""
    from app.core.config import settings
    if settings.is_prod and not user.totp_enabled:
        raise Forbidden("Muhim amallar uchun avval 2FA ni yoqing (Sozlamalar → Xavfsizlik)")
    return user


# ---------- Dashboard ----------
@router.get("/dashboard")
def dashboard(user: User = Depends(admin_only), db: Session = Depends(get_db)):
    now = now_utc()
    role_counts = dict(db.query(User.role, func.count()).filter(User.deleted_at.is_(None)).group_by(User.role).all())
    pstat = dict(db.query(Provider.verification_status, func.count()).filter(Provider.deleted_at.is_(None)).group_by(Provider.verification_status).all())
    growth = []
    for i in range(5, -1, -1):
        y, m = now.year, now.month - i
        while m <= 0:
            m += 12
            y -= 1
        s = datetime(y, m, 1, tzinfo=now.tzinfo)
        e = datetime(y + (m == 12), 1 if m == 12 else m + 1, 1, tzinfo=now.tzinfo)
        growth.append({"month": f"{m:02d}.{y}", "users": db.query(User).filter(User.created_at >= s, User.created_at < e).count()})
    return {
        "total_users": sum(role_counts.values()), "parents": role_counts.get("parent", 0),
        "kindergartens": db.query(Provider).filter(Provider.type == "kindergarten", Provider.deleted_at.is_(None)).count(),
        "tutors": db.query(Provider).filter(Provider.type == "tutor", Provider.deleted_at.is_(None)).count(),
        "active_providers": pstat.get("approved", 0),
        "pending_providers": pstat.get("pending", 0) + pstat.get("under_review", 0),
        "total_applications": db.query(Application).count(),
        "new_users_7d": db.query(User).filter(User.created_at >= now - timedelta(days=7)).count(),
        "open_reports": db.query(Report).filter(Report.status == "open").count(),
        "active_users_7d": db.query(User).filter(User.last_login_at >= now - timedelta(days=7)).count(),
        "growth": growth,
    }


# ---------- Foydalanuvchilar ----------
def _user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "phone": u.phone, "full_name": u.full_name, "role": u.role, "is_active": u.is_active,
            "blocked_reason": u.blocked_reason, "email_verified": u.email_verified, "totp_enabled": u.totp_enabled,
            "created_at": u.created_at, "last_login_at": u.last_login_at, "is_demo": u.is_demo}


@router.get("/users")
def users(role: str | None = None, q: str | None = None, active: bool | None = None, page: int = Query(1, ge=1),
          page_size: int = Query(20, ge=1, le=100), user: User = Depends(admin_only), db: Session = Depends(get_db)):
    query = db.query(User).filter(User.deleted_at.is_(None))
    if role:
        query = query.filter(User.role == role)
    if active is not None:
        query = query.filter(User.is_active == active)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.email.ilike(like), User.full_name.ilike(like), User.phone.ilike(like)))
    total = query.count()
    rows = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [_user_out(u) for u in rows], "total": total, "page": page, "page_size": page_size}


class BlockIn(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


def _target(db: Session, me: User, uid: str) -> User:
    t = db.get(User, uid)
    if not t or t.deleted_at:
        raise NotFound("Foydalanuvchi topilmadi")
    if t.id == me.id:
        raise AppError("O'zingizning hisobingizni o'zgartira olmaysiz (vakolat yo'qolib qolmasligi uchun)", 409, "self_action")
    return t


@router.post("/users/{uid}/block", response_model=Msg)
def block_user(uid: str, data: BlockIn, request: Request, me: User = Depends(_need_2fa), db: Session = Depends(get_db)):
    t = _target(db, me, uid)
    t.is_active, t.blocked_reason = False, data.reason
    db.query(UserSession).filter(UserSession.user_id == t.id, UserSession.revoked_at.is_(None)).update({"revoked_at": now_utc()})
    audit(db, me.id, "admin.user_blocked", "user", t.id, {"reason": data.reason}, client_ip(request))
    db.commit()
    return Msg(message="Foydalanuvchi bloklandi")


@router.post("/users/{uid}/unblock", response_model=Msg)
def unblock_user(uid: str, request: Request, me: User = Depends(_need_2fa), db: Session = Depends(get_db)):
    t = _target(db, me, uid)
    t.is_active, t.blocked_reason = True, None
    audit(db, me.id, "admin.user_unblocked", "user", t.id, ip=client_ip(request))
    db.commit()
    return Msg(message="Qayta faollashtirildi")


class RoleIn(BaseModel):
    role: str


@router.post("/users/{uid}/role", response_model=Msg)
def change_role(uid: str, data: RoleIn, request: Request, me: User = Depends(_need_2fa), db: Session = Depends(get_db)):
    if data.role not in ROLES:
        raise AppError("Noma'lum rol", 422, "validation")
    t = _target(db, me, uid)
    if t.role in ("kindergarten_admin", "tutor") and data.role != t.role or (t.role == "parent" and data.role != "parent"):
        raise AppError("Provider va ota-ona rollari o'rtasida almashtirib bo'lmaydi (profil turi mos kelmaydi). Yangi hisob yarating", 409, "role_conflict")
    if data.role == "super_admin" and not t.email_verified:
        raise AppError("Super Admin faqat tasdiqlangan email bilan tayinlanadi", 409, "validation")
    old = t.role
    t.role = data.role
    db.query(UserSession).filter(UserSession.user_id == t.id, UserSession.revoked_at.is_(None)).update({"revoked_at": now_utc()})
    audit(db, me.id, "admin.role_changed", "user", t.id, {"from": old, "to": data.role}, client_ip(request))
    db.commit()
    return Msg(message="Rol o'zgartirildi")


# ---------- Muassasalar va tasdiqlash ----------
def _prov_row(db: Session, p: Provider) -> dict:
    owner = db.get(User, p.owner_user_id)
    return {"id": p.id, "type": p.type, "name": p.name, "owner_name": owner.full_name, "owner_email": owner.email,
            "owner_email_verified": owner.email_verified, "verification_status": p.verification_status,
            "verification_note": p.verification_note, "created_at": p.created_at, "rating_avg": p.rating_avg, "is_demo": p.is_demo,
            "documents_count": db.query(ProviderDocument).filter(ProviderDocument.provider_id == p.id).count()}


@router.get("/providers")
def providers(type: str | None = None, status: str | None = None, q: str | None = None, page: int = Query(1, ge=1),
              page_size: int = Query(20, ge=1, le=100), user: User = Depends(admin_only), db: Session = Depends(get_db)):
    query = db.query(Provider).filter(Provider.deleted_at.is_(None))
    if type:
        query = query.filter(Provider.type == type)
    if status:
        query = query.filter(Provider.verification_status == status)
    if q:
        query = query.filter(Provider.name.ilike(f"%{q.strip()}%"))
    total = query.count()
    rows = query.order_by(Provider.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [_prov_row(db, p) for p in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/providers/{pid}")
def provider_detail(pid: str, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    p = db.get(Provider, pid)
    if not p:
        raise NotFound()
    docs = db.query(ProviderDocument).filter(ProviderDocument.provider_id == p.id).all()
    out = _prov_row(db, p)
    out.update(description=p.description, address=p.address, phone=p.phone, lat=p.lat, lng=p.lng,
               documents=[{"id": d.id, "doc_type": d.doc_type, "title": d.title, "status": d.status, "file_id": d.file_id,
                           "reviewed_by": d.reviewed_by, "reviewed_at": d.reviewed_at, "review_note": d.review_note} for d in docs])
    return out


class DocReviewIn(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    note: str | None = Field(default=None, max_length=500)


@router.post("/documents/{did}/review", response_model=Msg)
def review_document(did: str, data: DocReviewIn, request: Request, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    d = db.get(ProviderDocument, did)
    if not d:
        raise NotFound()
    if data.status == "rejected" and not (data.note and data.note.strip()):
        raise AppError("Rad etish sababini yozing", 422, "note_required")
    d.status, d.reviewed_by, d.reviewed_at, d.review_note = data.status, me.id, now_utc(), data.note
    audit(db, me.id, "admin.document_reviewed", "provider_document", d.id, {"status": data.status, "doc_type": d.doc_type}, client_ip(request))
    db.commit()
    return Msg(message="Hujjat holati saqlandi")


class VerifyIn(BaseModel):
    status: str = Field(pattern="^(under_review|approved|rejected|suspended|pending)$")
    note: str | None = Field(default=None, max_length=500)


@router.post("/providers/{pid}/verification", response_model=Msg)
def set_verification(pid: str, data: VerifyIn, request: Request, me: User = Depends(_need_2fa), db: Session = Depends(get_db)):
    p = db.get(Provider, pid)
    if not p or p.deleted_at:
        raise NotFound()
    owner = db.get(User, p.owner_user_id)
    if data.status == "approved":
        # tasdiqlanmagan muassasani tasdiqlangan deb ko'rsatib bo'lmaydi: hujjat va email shart
        docs = db.query(ProviderDocument).filter(ProviderDocument.provider_id == p.id).all()
        if not docs or not any(d.status == "approved" for d in docs):
            raise AppError("Tasdiqlash uchun kamida bitta hujjat tasdiqlangan bo'lishi kerak", 409, "no_approved_docs")
        if not owner.email_verified:
            raise AppError("Muassasa egasi emailini tasdiqlamagan", 409, "email_unverified")
    if data.status in ("rejected", "suspended") and not (data.note and data.note.strip()):
        raise AppError("Sababni yozing", 422, "note_required")
    old = p.verification_status
    p.verification_status, p.verification_note = data.status, data.note
    audit(db, me.id, "admin.provider_verification", "provider", p.id, {"from": old, "to": data.status, "note": data.note}, client_ip(request))
    if data.status in ("approved", "rejected"):
        ok = data.status == "approved"
        notify(db, owner.id, "provider_approved" if ok else "provider_rejected",
               "Muassasangiz tasdiqlandi" if ok else "Muassasa profili rad etildi", data.note or "", "/provider/profile", send_email=True)
    db.commit()
    return Msg(message="Holat yangilandi")


# ---------- Arizalar monitoringi ----------
@router.get("/applications")
def applications_monitor(status: str | None = None, type: str | None = None, region_id: int | None = None, page: int = Query(1, ge=1),
                         page_size: int = Query(20, ge=1, le=100), user: User = Depends(admin_only), db: Session = Depends(get_db)):
    q = db.query(Application)
    if status:
        q = q.filter(Application.status == status)
    if type:
        q = q.filter(Application.type == type)
    if region_id:
        q = q.join(Provider, Provider.id == Application.provider_id).filter(Provider.region_id == region_id)
    total = q.count()
    rows = q.order_by(Application.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    by_status = dict(db.query(Application.status, func.count()).group_by(Application.status).all())
    return {"items": [{"id": a.id, "number": a.number, "type": a.type, "status": a.status, "created_at": a.created_at,
                       "provider_name": db.get(Provider, a.provider_id).name} for a in rows],
            "total": total, "by_status": by_status, "page": page, "page_size": page_size}


# ---------- Sharhlar moderatsiyasi ----------
def _suspicious(db: Session, r: Review) -> list[str]:
    flags = []
    u = db.get(User, r.parent_user_id)
    if u and (r.created_at - u.created_at) < timedelta(hours=24):
        flags.append("Hisob ochilgandan 24 soat ichida yozilgan")
    day = db.query(Review).filter(Review.provider_id == r.provider_id, Review.created_at >= r.created_at - timedelta(hours=24),
                                  Review.created_at <= r.created_at + timedelta(hours=24), Review.rating == r.rating).count()
    if day >= 5:
        flags.append(f"24 soat ichida bir xil bahodagi {day} ta sharh")
    if r.comment:
        dup = db.query(Review).filter(Review.comment == r.comment, Review.id != r.id).count()
        if dup:
            flags.append("Bir xil matn boshqa sharhlarda ham mavjud")
    return flags


@router.get("/reviews")
def reviews(status: str | None = None, suspicious_only: bool = False, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
            user: User = Depends(admin_only), db: Session = Depends(get_db)):
    q = db.query(Review).filter(Review.deleted_at.is_(None))
    if status:
        q = q.filter(Review.status == status)
    rows = q.order_by(Review.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all() if not suspicious_only else q.order_by(Review.created_at.desc()).limit(500).all()
    out = []
    for r in rows:
        flags = _suspicious(db, r)
        if suspicious_only and not flags:
            continue
        out.append({"id": r.id, "provider_name": db.get(Provider, r.provider_id).name, "rating": r.rating, "comment": r.comment,
                    "status": r.status, "created_at": r.created_at, "flags": flags})
    return {"items": out, "page": page, "page_size": page_size}


class ModerateIn(BaseModel):
    status: str = Field(pattern="^(published|hidden|flagged)$")
    note: str | None = Field(default=None, max_length=300)


@router.post("/reviews/{rid}/moderate", response_model=Msg)
def moderate_review(rid: str, data: ModerateIn, request: Request, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    r = db.get(Review, rid)
    if not r:
        raise NotFound()
    r.status, r.moderation_note = data.status, data.note
    recompute_rating(db, r.provider_id)
    audit(db, me.id, "admin.review_moderated", "review", r.id, {"status": data.status}, client_ip(request))
    db.commit()
    return Msg(message="Saqlandi")


# ---------- Shikoyatlar ----------
@router.get("/reports")
def reports(status: str | None = "open", page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
            user: User = Depends(admin_only), db: Session = Depends(get_db)):
    q = db.query(Report)
    if status:
        q = q.filter(Report.status == status)
    total = q.count()
    rows = q.order_by(Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [{"id": r.id, "target_type": r.target_type, "target_id": r.target_id, "reason": r.reason, "details": r.details,
                       "status": r.status, "created_at": r.created_at, "reporter": db.get(User, r.reporter_id).full_name} for r in rows],
            "total": total}


class ResolveIn(BaseModel):
    status: str = Field(pattern="^(resolved|dismissed)$")
    note: str | None = Field(default=None, max_length=500)


@router.post("/reports/{rid}/resolve", response_model=Msg)
def resolve_report(rid: str, data: ResolveIn, request: Request, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    r = db.get(Report, rid)
    if not r:
        raise NotFound()
    r.status, r.resolved_by, r.resolution_note = data.status, me.id, data.note
    audit(db, me.id, "admin.report_resolved", "report", r.id, {"status": data.status}, client_ip(request))
    db.commit()
    return Msg(message="Saqlandi")


# ---------- Xabarlar nazorati ----------
@router.get("/messages/flagged")
def messages_for_review(page: int = Query(1, ge=1), user: User = Depends(admin_only), db: Session = Depends(get_db)):
    ids = [r.target_id for r in db.query(Report).filter(Report.target_type == "message", Report.status == "open")]
    rows = db.query(Message).filter(Message.id.in_(ids or [""])).all()
    return [{"id": m.id, "conversation_id": m.conversation_id, "sender_id": m.sender_id, "body": m.body, "hidden": m.hidden, "created_at": m.created_at} for m in rows]


@router.post("/messages/{mid}/hide", response_model=Msg)
def hide_message(mid: str, request: Request, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    m = db.get(Message, mid)
    if not m:
        raise NotFound()
    m.hidden = True
    audit(db, me.id, "admin.message_hidden", "message", m.id, ip=client_ip(request))
    db.commit()
    return Msg(message="Xabar yashirildi")


# ---------- Hududlar va kategoriyalar ----------
class RegionIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class DistrictIn(RegionIn):
    region_id: int


class CategoryIn(BaseModel):
    kind: str = Field(pattern="^(subject|amenity|education_level)$")
    name: str = Field(min_length=2, max_length=100)


@router.post("/regions", status_code=201)
def add_region(data: RegionIn, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", data.name.lower()).strip("-") or data.name.lower()
    if db.query(Region).filter((Region.name == data.name) | (Region.slug == slug)).first():
        raise AppError("Bunday viloyat mavjud", 409, "conflict")
    r = Region(name=data.name, slug=slug)
    db.add(r)
    audit(db, me.id, "admin.region_added", "region", None, {"name": data.name})
    db.commit()
    return {"id": r.id}


@router.post("/districts", status_code=201)
def add_district(data: DistrictIn, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    if not db.get(Region, data.region_id):
        raise NotFound("Viloyat topilmadi")
    if db.query(District).filter(District.region_id == data.region_id, District.name == data.name).first():
        raise AppError("Bunday tuman mavjud", 409, "conflict")
    d = District(region_id=data.region_id, name=data.name)
    db.add(d)
    audit(db, me.id, "admin.district_added", "district", None, {"name": data.name})
    db.commit()
    return {"id": d.id}


@router.post("/regions/{rid}/toggle", response_model=Msg)
def toggle_region(rid: int, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    r = db.get(Region, rid)
    if not r:
        raise NotFound()
    r.is_active = not r.is_active
    audit(db, me.id, "admin.region_toggled", "region", str(rid), {"active": r.is_active})
    db.commit()
    return Msg(message="Saqlandi")


@router.post("/categories", status_code=201)
def add_category(data: CategoryIn, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.kind == data.kind, Category.name == data.name).first():
        raise AppError("Bunday kategoriya mavjud", 409, "conflict")
    c = Category(kind=data.kind, name=data.name)
    db.add(c)
    db.commit()
    return {"id": c.id}


@router.post("/categories/{cid}/toggle", response_model=Msg)
def toggle_category(cid: int, me: User = Depends(admin_only), db: Session = Depends(get_db)):
    c = db.get(Category, cid)
    if not c:
        raise NotFound()
    c.is_active = not c.is_active
    db.commit()
    return Msg(message="Saqlandi")


# ---------- Audit log va hisobot ----------
@router.get("/audit-logs")
def audit_logs(action: str | None = None, actor_id: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
               user: User = Depends(admin_only), db: Session = Depends(get_db)):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action.ilike(f"{action}%"))
    if actor_id:
        q = q.filter(AuditLog.actor_id == actor_id)
    total = q.count()
    rows = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [{"id": a.id, "actor_id": a.actor_id, "action": a.action, "entity_type": a.entity_type, "entity_id": a.entity_id,
                       "details": a.details, "ip": a.ip, "created_at": a.created_at} for a in rows], "total": total}


@router.get("/reports/export.csv")
def export_csv(kind: str = Query("providers", pattern="^(providers|users|applications)$"), user: User = Depends(admin_only), db: Session = Depends(get_db)):
    buf = io.StringIO()
    w = csv.writer(buf)
    if kind == "providers":
        w.writerow(["id", "turi", "nomi", "holat", "reyting", "yaratilgan"])
        for p in db.query(Provider).filter(Provider.deleted_at.is_(None)):
            w.writerow([p.id, p.type, p.name, p.verification_status, p.rating_avg, p.created_at.isoformat()])
    elif kind == "users":
        w.writerow(["id", "email", "ism", "rol", "faol", "yaratilgan"])
        for u in db.query(User).filter(User.deleted_at.is_(None)):
            w.writerow([u.id, u.email, u.full_name, u.role, u.is_active, u.created_at.isoformat()])
    else:
        w.writerow(["raqam", "turi", "holat", "yaratilgan"])
        for a in db.query(Application):
            w.writerow([a.number, a.type, a.status, a.created_at.isoformat()])
    buf.seek(0)
    return StreamingResponse(iter(["﻿" + buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{kind}.csv"'})
