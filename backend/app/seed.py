"""Asosiy ma'lumotlar (idempotent): rollar, hududlar, kategoriyalar, Super Admin. Demo ma'lumot: SEED_DEMO=1."""
import os
import re
import sys
from datetime import date, time
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (Category, Child, District, KindergartenGroup, Provider, ParentProfile, ProviderDocument, ProviderSchedule, Region, Role,
                        TutorService, TutorSubject, UploadedFile, User)
from app.models.identity import ROLES
from app.seed_data import AMENITIES, LEVELS, REGIONS, SUBJECTS

ROLE_TITLES = {"parent": "Ota-ona", "kindergarten_admin": "Bog'cha administratori", "tutor": "Repetitor", "super_admin": "Super Admin"}


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("'", "")).strip("-")


def seed_base(db: Session):
    for code in ROLES:
        if not db.get(Role, code):
            db.add(Role(code=code, title=ROLE_TITLES[code]))
    for name, dists in REGIONS.items():
        r = db.query(Region).filter(Region.name == name).first()
        if not r:
            r = Region(name=name, slug=slugify(name))
            db.add(r)
            db.flush()
        have = {d.name for d in db.query(District).filter(District.region_id == r.id)}
        for d in dists:
            if d not in have:
                db.add(District(region_id=r.id, name=d))
    for kind, names in (("subject", SUBJECTS), ("amenity", AMENITIES), ("education_level", LEVELS)):
        for n in names:
            if not db.query(Category).filter(Category.kind == kind, Category.name == n).first():
                db.add(Category(kind=kind, name=n))
    if settings.SUPERADMIN_EMAIL and settings.SUPERADMIN_PASSWORD:
        email = settings.SUPERADMIN_EMAIL.lower()
        if not db.query(User).filter(User.email == email).first():
            db.add(User(email=email, password_hash=hash_password(settings.SUPERADMIN_PASSWORD), role="super_admin",
                        full_name="Super Admin", email_verified=True, profile_completed=True))
            print(f"Super Admin yaratildi: {email}")
    db.commit()


def seed_demo(db: Session):
    """DEMO ma'lumotlar aniq belgilangan: nomi '[DEMO]' bilan boshlanadi, is_demo=True. Ishlab chiqarishda ishlatmang."""
    if db.query(Provider).filter(Provider.is_demo.is_(True)).first():
        print("Demo ma'lumotlar allaqachon mavjud")
        return
    pw = hash_password("Demo12345")
    tash = db.query(Region).filter(Region.name == "Toshkent shahri").first()
    dists = {d.name: d.id for d in db.query(District).filter(District.region_id == tash.id)}
    parent = User(email="demo.parent@example.com", password_hash=pw, role="parent", full_name="[DEMO] Dilnoza Karimova", email_verified=True,
                  profile_completed=True, is_demo=True, phone="+998901112233")
    db.add(parent)
    db.flush()
    db.add(ParentProfile(user_id=parent.id, region_id=tash.id, district_id=dists["Chilonzor"]))
    db.add(Child(parent_user_id=parent.id, first_name="Azizbek", last_name="Karimov", birth_date=date(date.today().year - 4, 3, 10), education_level="Maktabgacha", interests=["rasm chizish", "konstruktor"]))
    kgs = [("[DEMO] Quyosh bog'chasi", "Yunusobod", 41.3646, 69.2870, 650000, "private"), ("[DEMO] Bahor bog'chasi", "Chilonzor", 41.2755, 69.2037, 450000, "state"),
           ("[DEMO] Nilufar bog'chasi", "Mirobod", 41.2995, 69.2750, 800000, "private")]
    for i, (name, dn, lat, lng, price, own) in enumerate(kgs):
        u = User(email=f"demo.kg{i+1}@example.com", password_hash=pw, role="kindergarten_admin", full_name=f"[DEMO] Admin {i+1}", email_verified=True, profile_completed=True, is_demo=True)
        db.add(u)
        db.flush()
        p = Provider(type="kindergarten", owner_user_id=u.id, name=name, short_description="DEMO ma'lumot — haqiqiy muassasa emas", region_id=tash.id,
                     district_id=dists[dn], address=f"{dn} tumani, DEMO manzil", lat=lat, lng=lng, phone="+998711234567", ownership=own, meal_type="4 mahal",
                     monthly_price=price, min_age=3, max_age=6, work_days=[1, 2, 3, 4, 5], work_open=time(7, 30), work_close=time(18, 30),
                     verification_status="approved", is_demo=True, amenities=["Ovqatlanish", "Uxlash xonasi"])
        db.add(p)
        db.flush()
        for gname, a, b, cap, cur in (("Kichik guruh", 3, 4, 20, 15), ("O'rta guruh", 4, 5, 20, 18), ("Katta guruh", 5, 6, 15, 10)):
            db.add(KindergartenGroup(provider_id=p.id, name=gname, min_age=a, max_age=b, capacity=cap, current_count=cur, monthly_price=price, meal_type="4 mahal"))
    tutors = [("[DEMO] Madina Rahimova", "Matematika", 250000, 5), ("[DEMO] Ilm Nur", "Ingliz tili", 180000, 8)]
    for i, (name, subj, price, exp) in enumerate(tutors):
        u = User(email=f"demo.tutor{i+1}@example.com", password_hash=pw, role="tutor", full_name=name, email_verified=True, profile_completed=True, is_demo=True)
        db.add(u)
        db.flush()
        p = Provider(type="tutor", owner_user_id=u.id, name=name, short_description="DEMO ma'lumot — haqiqiy repetitor emas", specialty=subj, region_id=tash.id,
                     district_id=dists["Yunusobod"], address="DEMO manzil", lat=41.36 + i * 0.01, lng=69.28, phone="+998901234567", experience_years=exp,
                     lesson_mode="both", hourly_price=price, languages=["uz", "ru"], verification_status="approved", is_demo=True)
        db.add(p)
        db.flush()
        db.add(TutorSubject(provider_id=p.id, subject=subj))
        db.add(TutorService(provider_id=p.id, subject=subj, education_level="5–9-sinf", grades=["5", "6", "7"], duration_minutes=60, format="individual", mode="offline", price=price))
        for wd in (1, 3, 5):
            db.add(ProviderSchedule(provider_id=p.id, weekday=wd, start_time=time(15, 0), end_time=time(19, 0)))
    db.commit()
    print("DEMO ma'lumotlar yaratildi. Kirish: demo.parent@example.com / Demo12345 (faqat sinov uchun)")


if __name__ == "__main__":
    with SessionLocal() as s:
        seed_base(s)
        if "--demo" in sys.argv or os.getenv("SEED_DEMO") == "1":
            if settings.is_prod and os.getenv("ALLOW_DEMO_IN_PROD") != "1":
                print("Production muhitida demo seed o'chirilgan (ALLOW_DEMO_IN_PROD=1 bilan yoqiladi)")
            else:
                seed_demo(s)
