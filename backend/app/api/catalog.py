"""Ochiq (mehmon) API: qidiruv, profil, xarita, taqqoslash, hududlar."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.errors import AppError, NotFound
from app.models import Category, District, Provider, ProviderSchedule, Region, Review, ReviewResponse, User
from app.services.search import provider_card, search_providers

router = APIRouter(tags=["catalog"])


@router.get("/regions")
def regions(include_inactive: bool = False, db: Session = Depends(get_db)):
    q = db.query(Region)
    if not include_inactive:
        q = q.filter(Region.is_active)
    return [{"id": r.id, "name": r.name, "is_active": r.is_active} for r in q.order_by(Region.name)]


@router.get("/regions/{rid}/districts")
def districts(rid: int, db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name} for d in db.query(District).filter(District.region_id == rid, District.is_active).order_by(District.name)]


@router.get("/categories")
def categories(kind: str | None = None, include_inactive: bool = False, db: Session = Depends(get_db)):
    q = db.query(Category)
    if not include_inactive:
        q = q.filter(Category.is_active)
    if kind:
        q = q.filter(Category.kind == kind)
    return [{"id": c.id, "kind": c.kind, "name": c.name, "is_active": c.is_active} for c in q.order_by(Category.name)]


def _list(ptype: str, db, page, page_size, **f):
    items, total = search_providers(db, ptype, f, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/kindergartens")
def kindergartens(q: str | None = None, region_id: int | None = None, district_id: int | None = None,
                  age: int | None = Query(None, ge=0, le=18), min_price: int | None = None, max_price: int | None = None,
                  min_rating: float | None = Query(None, ge=0, le=5), has_places: bool = False,
                  open_at: str | None = Query(None, pattern=r"^\d{2}:\d{2}$"),
                  ownership: str | None = Query(None, pattern="^(state|private)$"), meal: str | None = None,
                  lat: float | None = None, lng: float | None = None, max_distance_km: float | None = None,
                  sort: str = "rating", page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=50),
                  db: Session = Depends(get_db)):
    return _list("kindergarten", db, page, page_size, q=q, region_id=region_id, district_id=district_id, age=age,
                 min_price=min_price, max_price=max_price, min_rating=min_rating, has_places=has_places, open_at=open_at,
                 ownership=ownership, meal=meal, lat=lat, lng=lng, max_distance_km=max_distance_km, sort=sort)


@router.get("/tutors")
def tutors(q: str | None = None, subject: str | None = None, grade: str | None = None, education_level: str | None = None,
           min_price: int | None = None, max_price: int | None = None, min_rating: float | None = Query(None, ge=0, le=5),
           min_experience: int | None = Query(None, ge=0), mode: str | None = None, language: str | None = None,
           weekday: int | None = Query(None, ge=1, le=7), region_id: int | None = None, district_id: int | None = None,
           lat: float | None = None, lng: float | None = None, max_distance_km: float | None = None,
           sort: str = "rating", page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=50),
           db: Session = Depends(get_db)):
    return _list("tutor", db, page, page_size, q=q, subject=subject, grade=grade, education_level=education_level,
                 min_price=min_price, max_price=max_price, min_rating=min_rating, min_experience=min_experience, mode=mode,
                 language=language, weekday=weekday, region_id=region_id, district_id=district_id, lat=lat, lng=lng,
                 max_distance_km=max_distance_km, sort=sort)


def _public_provider(db: Session, pid: str, ptype: str) -> Provider:
    p = db.get(Provider, pid)
    if not p or p.deleted_at or p.type != ptype or p.verification_status != "approved":
        raise NotFound("Muassasa topilmadi yoki tasdiqlanmagan")
    return p


@router.get("/kindergartens/{pid}")
def kindergarten_detail(pid: str, db: Session = Depends(get_db)):
    return provider_card(db, _public_provider(db, pid, "kindergarten"), full=True)


@router.get("/tutors/{pid}")
def tutor_detail(pid: str, db: Session = Depends(get_db)):
    d = provider_card(db, _public_provider(db, pid, "tutor"), full=True)
    d["schedule"] = [{"weekday": s.weekday, "start": s.start_time.strftime("%H:%M"), "end": s.end_time.strftime("%H:%M")}
                     for s in db.query(ProviderSchedule).filter(ProviderSchedule.provider_id == pid).order_by(ProviderSchedule.weekday, ProviderSchedule.start_time)]
    return d


@router.get("/providers/{pid}/reviews")
def provider_reviews(pid: str, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    q = db.query(Review).filter(Review.provider_id == pid, Review.status == "published", Review.deleted_at.is_(None))
    total = q.count()
    rows = q.order_by(Review.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for r in rows:
        u = db.get(User, r.parent_user_id)
        resp = db.query(ReviewResponse).filter(ReviewResponse.review_id == r.id).first()
        name = (u.full_name.split()[0] + " " + (u.full_name.split()[-1][:1] + ".")) if u and len(u.full_name.split()) > 1 else (u.full_name if u else "Foydalanuvchi")
        items.append({"id": r.id, "rating": r.rating, "comment": r.comment, "author": name, "created_at": r.created_at,
                      "response": resp.text if resp else None})
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/map/providers")
def map_providers(type: str = Query("kindergarten", pattern="^(kindergarten|tutor)$"),
                  min_lat: float | None = None, max_lat: float | None = None, min_lng: float | None = None, max_lng: float | None = None,
                  limit: int = Query(300, le=500), db: Session = Depends(get_db)):
    q = db.query(Provider).filter(Provider.type == type, Provider.deleted_at.is_(None), Provider.verification_status == "approved",
                                  Provider.lat.is_not(None), Provider.lng.is_not(None))
    if None not in (min_lat, max_lat, min_lng, max_lng):
        q = q.filter(Provider.lat.between(min_lat, max_lat), Provider.lng.between(min_lng, max_lng))
    return [provider_card(db, p) for p in q.limit(limit).all()]


@router.get("/compare")
def compare(ids: str, lat: float | None = None, lng: float | None = None, db: Session = Depends(get_db)):
    id_list = [i for i in ids.split(",") if i][:4]
    if not 2 <= len(id_list) <= 4:
        raise AppError("Taqqoslash uchun 2 tadan 4 tagacha muassasa tanlang", 422, "validation")
    out = []
    for i in id_list:
        p = db.get(Provider, i)
        if not p or p.deleted_at or p.verification_status != "approved":
            raise NotFound("Muassasalardan biri topilmadi")
        out.append(provider_card(db, p, lat, lng, full=True))
    if len({c["type"] for c in out}) > 1:
        raise AppError("Faqat bir xil turdagi muassasalarni taqqoslash mumkin", 422, "validation")
    return out
