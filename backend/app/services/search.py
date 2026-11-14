"""Bog'cha va repetitor qidiruvi: barcha filtrlar bir vaqtda ishlaydi, faqat tasdiqlanganlar ochiq ko'rinadi."""
from datetime import time
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session
from app.models import (District, KindergartenGroup, Provider, ProviderSchedule, Region, TutorService, TutorSubject)
from app.services.geo import haversine_km


def provider_card(db: Session, p: Provider, lat: float | None = None, lng: float | None = None, full: bool = False) -> dict:
    region = db.get(Region, p.region_id) if p.region_id else None
    district = db.get(District, p.district_id) if p.district_id else None
    d = {
        "id": p.id, "type": p.type, "name": p.name, "logo_url": p.logo_url, "cover_url": p.cover_url,
        "short_description": p.short_description, "region": region.name if region else None,
        "district": district.name if district else None, "address": p.address, "lat": p.lat, "lng": p.lng,
        "rating_avg": round(p.rating_avg, 2), "rating_count": p.rating_count,
        "verified": p.verification_status == "approved",  # faqat haqiqiy tasdiq
        "phone": p.phone if full else None,
        "distance_km": haversine_km(lat, lng, p.lat, p.lng) if lat is not None and lng is not None and p.lat is not None and p.lng is not None else None,
    }
    if p.type == "kindergarten":
        groups = db.query(KindergartenGroup).filter(KindergartenGroup.provider_id == p.id, KindergartenGroup.deleted_at.is_(None)).all()
        d.update(ownership=p.ownership, meal_type=p.meal_type, monthly_price=p.monthly_price or (min([g.monthly_price for g in groups if g.monthly_price] or [0]) or None),
                 min_age=p.min_age, max_age=p.max_age, free_places=sum(g.free_places for g in groups),
                 work_open=p.work_open.strftime("%H:%M") if p.work_open else None,
                 work_close=p.work_close.strftime("%H:%M") if p.work_close else None, work_days=p.work_days)
        if full:
            d["groups"] = [{"id": g.id, "name": g.name, "min_age": g.min_age, "max_age": g.max_age, "capacity": g.capacity,
                            "free_places": g.free_places, "meal_type": g.meal_type, "monthly_price": g.monthly_price,
                            "extra_services": g.extra_services} for g in groups]
    else:
        subs = [s.subject for s in db.query(TutorSubject).filter(TutorSubject.provider_id == p.id).all()]
        d.update(specialty=p.specialty, subjects=subs, experience_years=p.experience_years, lesson_mode=p.lesson_mode,
                 hourly_price=p.hourly_price, languages=p.languages)
        if full:
            sv = db.query(TutorService).filter(TutorService.provider_id == p.id, TutorService.deleted_at.is_(None)).all()
            d["services"] = [{"id": s.id, "subject": s.subject, "education_level": s.education_level, "grades": s.grades,
                              "duration_minutes": s.duration_minutes, "format": s.format, "mode": s.mode, "price": s.price,
                              "language": s.language, "description": s.description} for s in sv]
    if full:
        d.update(description=p.description, email=p.email, amenities=p.amenities, gallery=p.gallery,
                 education_degree=p.education_degree, education_institution=p.education_institution,
                 teaching_style=p.teaching_style, intro_video_url=p.intro_video_url, service_area=p.service_area)
    return d


def search_providers(db: Session, ptype: str, f: dict, page: int, page_size: int):
    q = select(Provider).where(Provider.type == ptype, Provider.deleted_at.is_(None),
                               Provider.verification_status == "approved")
    if f.get("q"):
        like = f"%{f['q'].strip()}%"
        q = q.where(or_(Provider.name.ilike(like), Provider.short_description.ilike(like), Provider.specialty.ilike(like)))
    if f.get("region_id"):
        q = q.where(Provider.region_id == f["region_id"])
    if f.get("district_id"):
        q = q.where(Provider.district_id == f["district_id"])
    if f.get("min_rating"):
        q = q.where(Provider.rating_avg >= f["min_rating"])
    if f.get("verified_only"):
        pass  # ro'yxatda faqat tasdiqlanganlar chiqadi
    if ptype == "kindergarten":
        if f.get("ownership"):
            q = q.where(Provider.ownership == f["ownership"])
        if f.get("meal"):
            q = q.where(Provider.meal_type.ilike(f"%{f['meal']}%"))
        if f.get("age") is not None:
            a = f["age"]
            q = q.where(or_(Provider.min_age.is_(None), Provider.min_age <= a), or_(Provider.max_age.is_(None), Provider.max_age >= a))
        if f.get("min_price") is not None:
            q = q.where(Provider.monthly_price >= f["min_price"])
        if f.get("max_price") is not None:
            q = q.where(Provider.monthly_price <= f["max_price"])
        if f.get("has_places"):
            sub = select(KindergartenGroup.provider_id).where(KindergartenGroup.deleted_at.is_(None),
                                                              KindergartenGroup.current_count < KindergartenGroup.capacity)
            q = q.where(Provider.id.in_(sub))
        if f.get("open_at"):
            h, m = map(int, f["open_at"].split(":"))
            t = time(h, m)
            q = q.where(Provider.work_open <= t, Provider.work_close >= t)
    else:
        if f.get("subject"):
            q = q.where(Provider.id.in_(select(TutorSubject.provider_id).where(TutorSubject.subject.ilike(f"%{f['subject']}%"))))
        svc_conds = []
        if f.get("grade"):
            svc_conds.append(cast(TutorService.grades, String).like(f'%"{f["grade"]}"%'))
        if f.get("education_level"):
            svc_conds.append(TutorService.education_level == f["education_level"])
        if f.get("language"):
            svc_conds.append(TutorService.language == f["language"])
        if f.get("min_price") is not None:
            svc_conds.append(TutorService.price >= f["min_price"])
        if f.get("max_price") is not None:
            svc_conds.append(TutorService.price <= f["max_price"])
        if f.get("mode") in ("online", "offline"):
            svc_conds.append(TutorService.mode == f["mode"])
        if svc_conds:
            q = q.where(Provider.id.in_(select(TutorService.provider_id).where(TutorService.deleted_at.is_(None), *svc_conds)))
        if f.get("min_experience") is not None:
            q = q.where(Provider.experience_years >= f["min_experience"])
        if f.get("weekday"):
            q = q.where(Provider.id.in_(select(ProviderSchedule.provider_id).where(ProviderSchedule.weekday == f["weekday"])))
    sort = f.get("sort") or "rating"
    lat, lng = f.get("lat"), f.get("lng")
    need_dist = lat is not None and lng is not None and (f.get("max_distance_km") or sort == "distance")
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    if need_dist:
        rows = db.scalars(q.where(Provider.lat.is_not(None)).limit(3000)).all()
        cards = [(haversine_km(lat, lng, p.lat, p.lng), p) for p in rows]
        if f.get("max_distance_km"):
            cards = [c for c in cards if c[0] <= f["max_distance_km"]]
        cards.sort(key=lambda c: c[0])
        total = len(cards)
        rows = [p for _, p in cards[(page - 1) * page_size: page * page_size]]
    else:
        order = {"price_asc": (Provider.monthly_price if ptype == "kindergarten" else Provider.hourly_price).asc(),
                 "price_desc": (Provider.monthly_price if ptype == "kindergarten" else Provider.hourly_price).desc(),
                 "newest": Provider.created_at.desc()}.get(sort, Provider.rating_avg.desc())
        rows = db.scalars(q.order_by(order, Provider.rating_count.desc(), Provider.id).offset((page - 1) * page_size).limit(page_size)).all()
    return [provider_card(db, p, lat, lng) for p in rows], total
