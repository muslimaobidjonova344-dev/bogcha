"""Hisobotlar uchun hisob-kitoblar (administrator va muassasalar). Hammasi Python tomonda yig'iladi — SQLite/Postgres uchun bir xil."""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (Application, ApplicationHistory, Contract, KindergartenGroup, Lesson, Message, Provider, Region, Report, Review, User)


def month_keys(months: int, now: datetime | None = None) -> list[tuple[int, int]]:
    now = now or datetime.now(timezone.utc)
    out = []
    for i in range(months - 1, -1, -1):
        y, m = now.year, now.month - i
        while m <= 0:
            m += 12
            y -= 1
        out.append((y, m))
    return out


def label(k: tuple[int, int]) -> str:
    return f"{k[1]:02d}.{k[0]}"


def start_of(k: tuple[int, int]) -> datetime:
    return datetime(k[0], k[1], 1, tzinfo=timezone.utc)


def _bucket(dt: datetime) -> tuple[int, int]:
    return (dt.year, dt.month)


def _response_hours(db: Session, app_filter) -> float | None:
    """Ariza yuborilgandan muassasa birinchi javob bergunicha o'rtacha soat (SUBMITTED dan boshqa birinchi holat)."""
    rows = (db.query(Application.created_at, func.min(ApplicationHistory.created_at))
            .join(ApplicationHistory, ApplicationHistory.application_id == Application.id)
            .filter(app_filter, ApplicationHistory.to_status != "SUBMITTED").group_by(Application.id, Application.created_at).all())
    hrs = [(b - a).total_seconds() / 3600 for a, b in rows if a and b and b >= a]
    return round(sum(hrs) / len(hrs), 1) if hrs else None


def admin_analytics(db: Session, months: int = 6) -> dict:
    now = datetime.now(timezone.utc)
    keys = month_keys(months, now)
    start = start_of(keys[0])
    labels = [label(k) for k in keys]

    users = db.query(User.created_at, User.role).filter(User.deleted_at.is_(None)).all()
    u_par, u_prov = Counter(), Counter()
    for c, role in users:
        if c and c >= start:
            (u_par if role == "parent" else u_prov)[_bucket(c)] += 1
    apps = db.query(Application.created_at, Application.type, Application.status, Application.provider_id).all()
    a_kg, a_tu, a_acc = Counter(), Counter(), Counter()
    status_all, prov_apps, prov_acc = Counter(), Counter(), Counter()
    for c, typ, st, pid in apps:
        status_all[st] += 1
        prov_apps[pid] += 1
        if st == "ACCEPTED":
            prov_acc[pid] += 1
        if c and c >= start:
            (a_kg if typ == "kindergarten" else a_tu)[_bucket(c)] += 1
            if st == "ACCEPTED":
                a_acc[_bucket(c)] += 1
    msgs = Counter(_bucket(c) for (c,) in db.query(Message.created_at).filter(Message.created_at >= start).all() if c)

    provs = {p.id: p for p in db.query(Provider).filter(Provider.deleted_at.is_(None)).all()}
    regions = {r.id: r.name for r in db.query(Region)}
    by_region = Counter()
    for pid, n in prov_apps.items():
        p = provs.get(pid)
        if p:
            by_region[regions.get(p.region_id, "Noma'lum")] += n
    top = sorted(prov_apps.items(), key=lambda x: -x[1])[:6]
    top_providers = [{"id": pid, "name": provs[pid].name, "type": provs[pid].type, "applications": n, "accepted": prov_acc.get(pid, 0),
                      "rating": provs[pid].rating_avg, "reviews": provs[pid].rating_count} for pid, n in top if pid in provs]

    dist = dict(db.query(Review.rating, func.count()).filter(Review.status == "published", Review.deleted_at.is_(None)).group_by(Review.rating).all())
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.status == "published", Review.deleted_at.is_(None)).scalar()
    contracts = Counter(s for (s,) in db.query(Contract.status).all())
    kg_month = sum(p for (p,) in db.query(Contract.price).filter(Contract.status == "active", Contract.kind == "kindergarten").all())
    lessons = Counter(s for (s,) in db.query(Lesson.status).all())
    pv = Counter(p.verification_status for p in provs.values())
    rep = Counter(s for (s,) in db.query(Report.status).all())

    period_apps = sum(a_kg.values()) + sum(a_tu.values())
    accepted_total, rejected_total = status_all.get("ACCEPTED", 0), status_all.get("REJECTED", 0)
    decided = accepted_total + rejected_total
    return {
        "months": labels,
        "kpi": {
            "users_total": len(users), "users_new": sum(u_par.values()) + sum(u_prov.values()),
            "providers_active": pv.get("approved", 0), "providers_pending": pv.get("pending", 0) + pv.get("under_review", 0),
            "applications_total": sum(status_all.values()), "applications_period": period_apps,
            "acceptance_rate": round(100 * accepted_total / decided) if decided else None,
            "avg_response_hours": _response_hours(db, Application.created_at >= start),
            "avg_rating": round(float(avg_rating), 2) if avg_rating else None, "reviews_total": sum(dist.values()),
            "contracts_active": contracts.get("active", 0), "contracts_pending": contracts.get("sent", 0), "kg_monthly_total": int(kg_month),
        },
        "users": {"parents": [u_par[k] for k in keys], "providers": [u_prov[k] for k in keys]},
        "applications": {"kindergarten": [a_kg[k] for k in keys], "tutor": [a_tu[k] for k in keys], "accepted": [a_acc[k] for k in keys]},
        "messages": [msgs[k] for k in keys],
        "status_counts": dict(status_all),
        "funnel": [{"k": "Yuborilgan", "v": sum(status_all.values())},
                   {"k": "Ko'rib chiqilgan", "v": sum(status_all.values()) - status_all.get("SUBMITTED", 0) - status_all.get("CANCELLED", 0)},
                   {"k": "Qabul qilingan", "v": accepted_total}, {"k": "Shartnoma imzolangan", "v": contracts.get("active", 0)}],
        "by_region": [{"k": k, "v": v} for k, v in by_region.most_common(8)],
        "top_providers": top_providers,
        "ratings": {str(i): dist.get(i, 0) for i in range(1, 6)},
        "contracts": dict(contracts), "lessons": dict(lessons),
        "providers_by_status": dict(pv), "reports": dict(rep),
        "type_split": {"kindergarten": sum(1 for p in provs.values() if p.type == "kindergarten"), "tutor": sum(1 for p in provs.values() if p.type == "tutor")},
    }


def provider_extra(db: Session, p: Provider, months: int = 12) -> dict:
    """Bog'cha/repetitor statistikasi uchun qo'shimcha ko'rsatkichlar (mavjud kalitlar o'zgarmaydi)."""
    now = datetime.now(timezone.utc)
    keys = month_keys(months, now)
    start = start_of(keys[0])
    rows = db.query(Application.created_at, Application.status).filter(Application.provider_id == p.id, Application.created_at >= start).all()
    acc, rej = Counter(), Counter()
    for c, st in rows:
        if st == "ACCEPTED":
            acc[_bucket(c)] += 1
        elif st == "REJECTED":
            rej[_bucket(c)] += 1
    sc = Counter(s for (s,) in db.query(Application.status).filter(Application.provider_id == p.id).all())
    decided = sc.get("ACCEPTED", 0) + sc.get("REJECTED", 0)
    contracts = Counter(s for (s,) in db.query(Contract.status).filter(Contract.provider_id == p.id).all())
    out = {
        "months": [label(k) for k in keys],
        "accepted_by_month": [acc[k] for k in keys], "rejected_by_month": [rej[k] for k in keys],
        "conversion_rate": round(100 * sc.get("ACCEPTED", 0) / decided) if decided else None,
        "avg_response_hours": _response_hours(db, Application.provider_id == p.id),
        "contracts": dict(contracts),
    }
    if p.type == "kindergarten":
        gl = db.query(KindergartenGroup).filter(KindergartenGroup.provider_id == p.id, KindergartenGroup.deleted_at.is_(None)).all()
        out["groups"] = [{"name": g.name, "capacity": g.capacity, "current": g.current_count} for g in gl]
        out["income_monthly"] = int(sum(x for (x,) in db.query(Contract.price).filter(Contract.provider_id == p.id, Contract.status == "active").all()))
    else:
        ls = db.query(Lesson.starts_at, Lesson.status, Lesson.price).filter(Lesson.provider_id == p.id).all()
        month_done = Counter(_bucket(s) for s, st, _ in ls if st == "done" and s >= start)
        out["lessons"] = dict(Counter(st for _, st, _ in ls))
        out["lessons_by_month"] = [month_done[k] for k in keys]
        month_ago = now - timedelta(days=30)
        out["income_monthly"] = int(sum((pr or 0) for s, st, pr in ls if st == "done" and s >= month_ago))
    return out
