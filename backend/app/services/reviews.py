from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Provider, Review


def recompute_rating(db: Session, provider_id: str):
    """Reyting faqat backendda hisoblanadi; faqat 'published' sharhlar hisobga olinadi."""
    avg, cnt = db.query(func.avg(Review.rating), func.count(Review.id)).filter(
        Review.provider_id == provider_id, Review.status == "published", Review.deleted_at.is_(None)).one()
    p = db.get(Provider, provider_id)
    p.rating_avg = round(float(avg or 0), 2)
    p.rating_count = int(cnt or 0)
