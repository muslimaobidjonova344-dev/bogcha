from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_my_provider, get_current_user, require_roles, require_verified
from app.core.errors import AppError, Conflict, NotFound
from app.core.security import now_utc
from app.models import Application, Provider, Report, Review, ReviewResponse, Student, User
from app.schemas.common import Msg
from app.services.notify import notify
from app.services.reviews import recompute_rating

router = APIRouter(tags=["reviews"])


class ReviewIn(BaseModel):
    provider_id: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ResponseIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ReportIn(BaseModel):
    target_type: str = Field(pattern="^(provider|review|message|user)$")
    target_id: str
    reason: str = Field(min_length=2, max_length=60)
    details: str | None = Field(default=None, max_length=2000)


def _review_out(db: Session, r: Review) -> dict:
    resp = db.query(ReviewResponse).filter(ReviewResponse.review_id == r.id).first()
    prov = db.get(Provider, r.provider_id)
    return {"id": r.id, "provider_id": r.provider_id, "provider_name": prov.name, "rating": r.rating, "comment": r.comment,
            "status": r.status, "created_at": r.created_at, "response": resp.text if resp else None}


@router.post("/reviews", status_code=201)
def create_review(data: ReviewIn, user: User = Depends(require_roles("parent")), _v=Depends(require_verified), db: Session = Depends(get_db)):
    prov = db.get(Provider, data.provider_id)
    if not prov or prov.deleted_at or prov.verification_status != "approved":
        raise NotFound("Muassasa topilmadi")
    # faqat haqiqiy xizmat jarayoniga bog'langan ota-ona
    acc = db.query(Application).filter(Application.parent_user_id == user.id, Application.provider_id == prov.id,
                                       Application.status == "ACCEPTED").order_by(Application.created_at.desc()).first()
    if not acc:
        raise AppError("Sharh qoldirish uchun avval muassasa arizangizni qabul qilgan bo'lishi kerak", 403, "not_eligible")
    if db.query(Review).filter(Review.parent_user_id == user.id, Review.provider_id == prov.id, Review.deleted_at.is_(None)).first():
        raise Conflict("Siz bu muassasaga allaqachon sharh qoldirgansiz")
    r = Review(provider_id=prov.id, parent_user_id=user.id, application_id=acc.id, rating=data.rating, comment=(data.comment or "").strip() or None)
    db.add(r)
    db.flush()
    recompute_rating(db, prov.id)
    notify(db, prov.owner_user_id, "review_new", "Yangi sharh", f"{data.rating} yulduz", "/provider/reviews")
    db.commit()
    return _review_out(db, r)


@router.put("/reviews/{rid}")
def update_review(rid: str, data: ReviewUpdate, user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    r = db.get(Review, rid)
    if not r or r.deleted_at or r.parent_user_id != user.id:
        raise NotFound()
    r.rating, r.comment = data.rating, (data.comment or "").strip() or None
    recompute_rating(db, r.provider_id)
    db.commit()
    return _review_out(db, r)


@router.delete("/reviews/{rid}", response_model=Msg)
def delete_review(rid: str, user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    r = db.get(Review, rid)
    if not r or r.deleted_at or r.parent_user_id != user.id:
        raise NotFound()
    r.deleted_at = now_utc()
    recompute_rating(db, r.provider_id)
    db.commit()
    return Msg(message="Sharh o'chirildi")


@router.get("/reviews/mine")
def my_reviews(user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    rows = db.query(Review).filter(Review.parent_user_id == user.id, Review.deleted_at.is_(None)).order_by(Review.created_at.desc()).all()
    return [_review_out(db, r) for r in rows]


@router.get("/reviews/eligible")
def eligible(user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    """Sharh qoldirish mumkin bo'lgan muassasalar (qabul qilingan, hali sharh yozilmagan)."""
    ids = {a.provider_id for a in db.query(Application).filter(Application.parent_user_id == user.id, Application.status == "ACCEPTED")}
    done = {r.provider_id for r in db.query(Review).filter(Review.parent_user_id == user.id, Review.deleted_at.is_(None))}
    return [{"provider_id": p.id, "name": p.name, "type": p.type} for p in db.query(Provider).filter(Provider.id.in_(list(ids - done) or [""]))]


# ---------- Provider javobi ----------
@router.get("/me/provider/reviews")
def provider_reviews(p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("kindergarten_admin", "tutor")),
                     page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50), db: Session = Depends(get_db)):
    q = db.query(Review).filter(Review.provider_id == p.id, Review.deleted_at.is_(None), Review.status != "hidden")
    total = q.count()
    rows = q.order_by(Review.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    out = []
    for r in rows:
        u = db.get(User, r.parent_user_id)
        out.append({**_review_out(db, r), "author": u.full_name.split()[0] if u else "Foydalanuvchi"})
    return {"items": out, "total": total, "rating_avg": p.rating_avg, "rating_count": p.rating_count}


@router.put("/me/provider/reviews/{rid}/response", response_model=Msg)
def respond(rid: str, data: ResponseIn, p: Provider = Depends(get_my_provider), user: User = Depends(require_roles("kindergarten_admin", "tutor")),
            db: Session = Depends(get_db)):
    r = db.get(Review, rid)
    if not r or r.deleted_at or r.provider_id != p.id:
        raise NotFound()
    resp = db.query(ReviewResponse).filter(ReviewResponse.review_id == rid).first()
    if resp:
        resp.text = data.text
    else:
        db.add(ReviewResponse(review_id=rid, responder_user_id=user.id, text=data.text))
    db.commit()
    return Msg(message="Javob saqlandi")


# ---------- Shikoyat ----------
@router.post("/reports", status_code=201)
def create_report(data: ReportIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    model = {"provider": Provider, "review": Review, "user": User}.get(data.target_type)
    if model and not db.get(model, data.target_id):
        raise NotFound("Shikoyat obyekti topilmadi")
    if db.query(Report).filter(Report.reporter_id == user.id, Report.target_type == data.target_type, Report.target_id == data.target_id,
                               Report.status == "open").first():
        raise Conflict("Bu obyekt bo'yicha shikoyatingiz allaqachon ko'rib chiqilmoqda")
    r = Report(reporter_id=user.id, target_type=data.target_type, target_id=data.target_id, reason=data.reason, details=data.details)
    db.add(r)
    db.commit()
    return {"id": r.id}
