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


def _user(db, email, role, name, pw, phone=None):
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, password_hash=pw, role=role, full_name=name, email_verified=True, profile_completed=True, is_demo=True, phone=phone)
        db.add(u)
        db.flush()
    return u


def _seed_demo_base(db: Session):
    """DEMO ma'lumotlar (is_demo=True, nomi '[DEMO]'): ota-onalar, bog'chalar, repetitorlar, arizalar (barcha holatlar),
    sharhlar, suhbatlar, bildirishnomalar, shartnomalar. Ishlab chiqarishda ishlatmang. Qayta ishga tushirsa — qo'shmaydi."""
    from datetime import datetime, timedelta, timezone
    from app.models import (Application, ApplicationHistory, Contract, Conversation, ConversationMember, Favorite, Message, Notification, Review, Student)
    from app.services import contracts as csvc
    from app.services.applications import new_number
    from app.services.reviews import recompute_rating
    if db.query(Application).join(User, User.id == Application.parent_user_id).filter(User.is_demo.is_(True)).first():
        print("Demo ma'lumotlar allaqachon mavjud")
        return
    now = datetime.now(timezone.utc)
    pw = hash_password("Demo12345")
    regs = {r.name: r for r in db.query(Region)}
    dist = {(d.region_id, d.name): d.id for d in db.query(District)}

    def loc(rn, dn):
        r = regs[rn]
        return r.id, dist.get((r.id, dn))

    parent = _user(db, "demo.parent@example.com", "parent", "[DEMO] Dilnoza Karimova", pw, "+998901112233")
    parent2 = _user(db, "demo.parent2@example.com", "parent", "[DEMO] Jasur Aliyev", pw, "+998901112244")
    for u, dn in ((parent, "Chilonzor"), (parent2, "Yunusobod")):
        if not db.query(ParentProfile).filter(ParentProfile.user_id == u.id).first():
            rid, did = loc("Toshkent shahri", dn)
            db.add(ParentProfile(user_id=u.id, region_id=rid, district_id=did, address=f"{dn} tumani, DEMO manzil"))
    y = date.today().year
    kids = [Child(parent_user_id=parent.id, first_name="Azizbek", last_name="Karimov", birth_date=date(y - 4, 3, 10), education_level="Maktabgacha", interests=["rasm chizish", "konstruktor"]),
            Child(parent_user_id=parent.id, first_name="Madina", last_name="Karimova", birth_date=date(y - 8, 9, 2), education_level="1–4-sinf", interests=["o'qish", "musiqa"]),
            Child(parent_user_id=parent2.id, first_name="Bekzod", last_name="Aliyev", birth_date=date(y - 5, 6, 21), education_level="Maktabgacha", interests=["futbol"])]
    db.add_all(kids)
    db.flush()
    azizbek, madina, bekzod = kids

    kg_data = [  # nom, viloyat, tuman, lat, lng, narx, turi, yosh, qo'shimcha
        ("Yorqin Bolajon bog'chasi", "Toshkent shahri", "Yunusobod", 41.3646, 69.2870, 600000, "private", (3, 6), ["Ovqatlanish", "Uxlash xonasi", "Ingliz tili", "Video kuzatuv"]),
        ("Mehrli Bog'cha", "Toshkent shahri", "Chilonzor", 41.2755, 69.2037, 550000, "private", (3, 6), ["Ovqatlanish", "Hovli/o'yin maydoni", "Logoped"]),
        ("Ilm Nuri bog'chasi", "Toshkent shahri", "Mirobod", 41.2995, 69.2750, 650000, "private", (3, 7), ["Ovqatlanish", "Psixolog", "Sport zali", "Hovuz"]),
        ("Bahor davlat bog'chasi № 214", "Toshkent shahri", "Sergeli", 41.2250, 69.2180, 150000, "state", (3, 6), ["Ovqatlanish", "Uxlash xonasi"]),
        ("Nihol bog'chasi", "Namangan viloyati", "Chortoq", 41.0690, 71.8220, 450000, "private", (3, 6), ["Ovqatlanish", "Hovli/o'yin maydoni", "Transport"]),
        ("Quyosh bolalar uyi", "Samarqand viloyati", "Samarqand shahri", 39.6542, 66.9597, 500000, "private", (2, 6), ["Ovqatlanish", "Uxlash xonasi", "Logoped"])]
    kgs = []
    for i, (name, rn, dn, lat, lng, price, own, (a1, a2), am) in enumerate(kg_data):
        u = _user(db, f"demo.kg{i+1}@example.com", "kindergarten_admin", f"[DEMO] Admin {i+1}", pw)
        rid, did = loc(rn, dn)
        p = Provider(type="kindergarten", owner_user_id=u.id, name=f"[DEMO] {name}", short_description="Qulay muhit, tajribali tarbiyachilar va sifatli ovqatlanish. (DEMO ma'lumot)",
                     description="Bu — sinov uchun yaratilgan DEMO profil. Haqiqiy muassasa emas. Bolalar uchun xavfsiz muhit, rivojlantiruvchi mashg'ulotlar, kuniga 4 mahal ovqat va tinch soat.",
                     region_id=rid, district_id=did, address=f"{dn}, DEMO manzil", lat=lat, lng=lng, phone="+998711234567", email=f"info{i+1}@demo.kichkintoy.uz", ownership=own, meal_type="4 mahal",
                     monthly_price=price, min_age=a1, max_age=a2, work_days=[1, 2, 3, 4, 5], work_open=time(7, 30), work_close=time(18, 30),
                     verification_status="approved", is_demo=True, amenities=am)
        db.add(p)
        db.flush()
        groups = []
        for gname, ga, gb, cap, cur in (("Kichik guruh", 3, 4, 20, 14 + i % 4), ("O'rta guruh", 4, 5, 20, 17), ("Katta guruh", 5, 6, 15, 9 + i % 5)):
            g = KindergartenGroup(provider_id=p.id, name=gname, min_age=ga, max_age=gb, capacity=cap, current_count=cur, monthly_price=price, meal_type="4 mahal")
            db.add(g)
            groups.append(g)
        db.flush()
        p._groups = groups
        kgs.append(p)

    tutor_data = [("Madina Rahimova", "Matematika", 120000, 7, "5–9-sinf", "Yunusobod"), ("Ilm Nur o'quv markazi", "Ingliz tili", 90000, 9, "1–4-sinf", "Mirobod"),
                  ("Sardor Qodirov", "Dasturlash", 150000, 5, "10–11-sinf", "Chilonzor"), ("Nigora Yusupova", "Maktabga tayyorlov", 80000, 11, "Maktabgacha", "Olmazor"),
                  ("Dilshod Ergashev", "Fizika", 130000, 6, "10–11-sinf", "Mirzo Ulug'bek")]
    tutors = []
    for i, (name, subj, price, exp, lvl, dn) in enumerate(tutor_data):
        u = _user(db, f"demo.tutor{i+1}@example.com", "tutor", f"[DEMO] {name}", pw)
        rid, did = loc("Toshkent shahri", dn)
        p = Provider(type="tutor", owner_user_id=u.id, name=f"[DEMO] {name}", short_description=f"{subj} bo'yicha tajribali repetitor. (DEMO ma'lumot)", specialty=subj,
                     description="Sinov uchun yaratilgan DEMO profil. Individual yondashuv, uy vazifalari nazorati va muntazam hisobot.", teaching_style="Individual yondashuv, amaliy mashqlar, oylik test.",
                     education_degree="Magistr", education_institution="O'zbekiston Milliy universiteti", region_id=rid, district_id=did, address="DEMO manzil", lat=41.30 + i * 0.012, lng=69.24 + i * 0.01,
                     phone="+998901234567", email=f"tutor{i+1}@demo.kichkintoy.uz", experience_years=exp, lesson_mode="both", hourly_price=price, languages=["uz", "ru"],
                     verification_status="approved", is_demo=True)
        db.add(p)
        db.flush()
        db.add(TutorSubject(provider_id=p.id, subject=subj))
        sv = TutorService(provider_id=p.id, subject=subj, education_level=lvl, grades=["1", "2", "3"], duration_minutes=60, format="individual", mode="offline", price=price)
        db.add(sv)
        db.flush()
        p._service = sv
        for wd in (1, 3, 5):
            db.add(ProviderSchedule(provider_id=p.id, weekday=wd, start_time=time(15, 0), end_time=time(19, 0)))
        tutors.append(p)

    def mk_app(parent_u, child, prov, status, days_ago, note=None, group=None, svc=None, provider_note=None, interview=None):
        a = Application(number=new_number(db), type=prov.type, parent_user_id=parent_u.id, child_id=child.id, provider_id=prov.id,
                        group_id=group.id if group else None, service_id=svc.id if svc else None, subject=prov.specialty if svc else None,
                        grade="1" if svc else None, lesson_format="individual" if svc else None, lesson_mode="offline" if svc else None, duration_minutes=60 if svc else None,
                        desired_start_date=date.today() + timedelta(days=14), parent_note=note, status=status, provider_note=provider_note, interview_at=interview)
        a.created_at = now - timedelta(days=days_ago)
        a.updated_at = now - timedelta(days=max(days_ago - 1, 0))
        db.add(a)
        db.flush()
        chain = ["SUBMITTED"] + {"SUBMITTED": [], "UNDER_REVIEW": ["UNDER_REVIEW"], "MORE_INFO_REQUIRED": ["UNDER_REVIEW", "MORE_INFO_REQUIRED"],
                                  "INTERVIEW_SCHEDULED": ["UNDER_REVIEW", "INTERVIEW_SCHEDULED"], "ACCEPTED": ["UNDER_REVIEW", "ACCEPTED"], "REJECTED": ["UNDER_REVIEW", "REJECTED"]}[status]
        prev = None
        for k, st in enumerate(chain):
            h = ApplicationHistory(application_id=a.id, from_status=prev, to_status=st, actor_id=parent_u.id if k == 0 else prov.owner_user_id, note=None)
            h.created_at = now - timedelta(days=max(days_ago - k, 0))
            db.add(h)
            prev = st
        if status == "ACCEPTED":
            db.add(Student(provider_id=prov.id, child_id=child.id, parent_user_id=parent_u.id, application_id=a.id, group_id=group.id if group else None, status="active"))
        return a

    a1 = mk_app(parent, azizbek, kgs[0], "ACCEPTED", 20, "Iltimos, kichik guruhga.", kgs[0]._groups[0], provider_note="Xush kelibsiz! Hujjatlarni olib keling.")
    a2 = mk_app(parent, azizbek, kgs[1], "INTERVIEW_SCHEDULED", 6, "Suhbat vaqtini kelishamiz.", kgs[1]._groups[0], interview=now + timedelta(days=3))
    a3 = mk_app(parent, azizbek, kgs[2], "UNDER_REVIEW", 3, None, kgs[2]._groups[0])
    a4 = mk_app(parent, azizbek, kgs[3], "REJECTED", 25, None, kgs[3]._groups[0], provider_note="Afsuski, guruhda bo'sh joy qolmadi.")
    a5 = mk_app(parent, madina, tutors[1], "ACCEPTED", 15, "Ingliz tilini noldan boshlaymiz.", None, tutors[1]._service)
    a6 = mk_app(parent, madina, tutors[0], "MORE_INFO_REQUIRED", 4, None, None, tutors[0]._service, provider_note="Qaysi sinfda o'qiydi va qaysi mavzular qiyin?")
    a7 = mk_app(parent, azizbek, kgs[4], "SUBMITTED", 1, None, kgs[4]._groups[1])
    a8 = mk_app(parent2, bekzod, kgs[0], "UNDER_REVIEW", 2, None, kgs[0]._groups[2])
    a9 = mk_app(parent2, bekzod, kgs[1], "SUBMITTED", 1, None, kgs[1]._groups[2])

    # shartnomalar: bittasi to'liq imzolangan, bittasi ota-ona imzosini kutmoqda
    for k, (a, prov, signed) in enumerate(((a1, kgs[0], True), (a5, tutors[1], False))):
        child = db.get(Child, a.child_id)
        price = prov.monthly_price if prov.type == "kindergarten" else prov.hourly_price
        start = date.today() + timedelta(days=7)
        end = csvc.add_months(start, 12)
        c = Contract(number=csvc.new_number(lambda n: False), application_id=a.id, provider_id=prov.id, parent_user_id=parent.id, child_id=child.id, kind=prov.type, price=price,
                     price_unit="month" if prov.type == "kindergarten" else "lesson", start_date=start, end_date=end, status="active" if signed else "sent",
                     terms=csvc.build_terms(prov.type, prov, parent, child, price, "month" if prov.type == "kindergarten" else "lesson", start, end, a.subject),
                     provider_signed_at=now - timedelta(days=9), provider_signed_name=db.get(User, prov.owner_user_id).full_name.replace("[DEMO] ", ""))
        if signed:
            c.parent_signed_at = now - timedelta(days=8)
            c.parent_signed_name = parent.full_name
        db.add(c)

    # sharhlar
    for prov, app_, parent_u, rating, text in ((kgs[0], a1, parent, 5, "Juda mehrli tarbiyachilar, toza va tartibli. Farzandimiz bog'chaga xursand boradi!"),
                                                (tutors[1], a5, parent, 5, "Darslar qiziqarli, qizim ingliz tilini yaxshi ko'rib qoldi. Tavsiya qilaman.")):
        r = Review(provider_id=prov.id, parent_user_id=parent_u.id, application_id=app_.id, rating=rating, comment=text, status="published")
        db.add(r)
    db.flush()
    extra = [(kgs[0], 4, "Ovqatlari mazali, faqat to'lov ko'rsatmalari kechikdi."), (kgs[1], 5, "Hovlisi katta, bolalar ko'p vaqt tashqarida o'ynaydi."), (kgs[2], 5, "Ingliz tili va logoped bor — katta plyus."),
             (tutors[0], 5, "Matematikadan natija 1 oyda ko'rindi."), (tutors[2], 4, "Dasturlash asoslarini yaxshi tushuntiradi.")]
    for k, (prov, rating, text) in enumerate(extra):
        other = _user(db, f"demo.reviewer{k+1}@example.com", "parent", f"[DEMO] Sharhlovchi {k+1}", pw)
        oc = Child(parent_user_id=other.id, first_name="Bola", last_name=f"{k+1}", birth_date=date(y - 5, 1, 1))
        db.add(oc)
        db.flush()
        oa = mk_app(other, oc, prov, "ACCEPTED", 40 + k)
        db.add(Review(provider_id=prov.id, parent_user_id=other.id, application_id=oa.id, rating=rating, comment=text, status="published"))
    db.flush()
    for prov in kgs + tutors:
        recompute_rating(db, prov.id)

    # saqlanganlar
    for prov in (kgs[0], kgs[2], tutors[0]):
        db.add(Favorite(user_id=parent.id, provider_id=prov.id))

    # suhbatlar
    def convo(parent_u, prov, texts):
        cv = Conversation(parent_user_id=parent_u.id, provider_id=prov.id, last_message_at=now)
        db.add(cv)
        db.flush()
        db.add(ConversationMember(conversation_id=cv.id, user_id=parent_u.id, last_read_at=now - timedelta(hours=5)))
        db.add(ConversationMember(conversation_id=cv.id, user_id=prov.owner_user_id, last_read_at=now))
        for k, (mine, body) in enumerate(texts):
            m = Message(conversation_id=cv.id, sender_id=parent_u.id if mine else prov.owner_user_id, body=body)
            m.created_at = now - timedelta(hours=len(texts) - k)
            db.add(m)
    convo(parent, kgs[0], [(True, "Assalomu alaykum! Arizamiz bo'yicha suhbat qachon bo'ladi?"), (False, "Vaalaykum assalom! Ertaga soat 15:00 da taklif qilamiz."), (True, "Rahmat, kelamiz.")])
    convo(parent, tutors[1], [(False, "Salom! Birinchi dars shanba kuni 16:00 da."), (True, "Yaxshi, qizimni olib kelaman.")])
    convo(parent, kgs[1], [(False, "Suhbat uchun hujjatlar: tug'ilganlik guvohnomasi va tibbiy ma'lumotnoma.")])

    # bildirishnomalar
    for k, (t, title, body, link) in enumerate((("application_accepted", "Ariza qabul qilindi", f"{kgs[0].name} — {a1.number}", f"/parent/applications/{a1.id}"),
                                                ("contract_sent", "Shartnoma imzolashga tayyor", f"{tutors[1].name}: shartnomani ko'rib imzolang", "/parent/contracts"),
                                                ("interview", "Suhbat belgilandi", f"{kgs[1].name}: 3 kundan keyin", f"/parent/applications/{a2.id}"),
                                                ("more_info", "Qo'shimcha ma'lumot so'raldi", f"{tutors[0].name} savol yubordi", f"/parent/applications/{a6.id}"),
                                                ("new_message", "Yangi xabar", "Yorqin Bolajon bog'chasi sizga xabar yubordi", "/parent/messages"))):
        n = Notification(user_id=parent.id, type=t, title=title, body=body, link=link, read_at=None if k < 3 else now)
        n.created_at = now - timedelta(hours=k * 7 + 1)
        db.add(n)
    db.commit()
    print("DEMO ma'lumotlar yaratildi. Kirish (parol Demo12345): demo.parent@example.com, demo.kg1@example.com, demo.tutor1@example.com")


def seed_demo(db: Session):
    """Asosiy namunaviy ma'lumotlar + qo'shimcha (ko'proq jarayon). Ikkalasi ham idempotent."""
    _seed_demo_base(db)
    try:
        from app.seed_demo_extra import run
        run(db)
    except Exception as e:  # server ishga tushishi to'xtamasin
        import traceback
        db.rollback()
        print("Qo'shimcha namunaviy ma'lumotlar yaratilmadi:", e)
        traceback.print_exc()


if __name__ == "__main__":
    with SessionLocal() as s:
        seed_base(s)
        if "--demo" in sys.argv or os.getenv("SEED_DEMO") == "1":
            if settings.is_prod and os.getenv("ALLOW_DEMO_IN_PROD") != "1":
                print("Production muhitida demo seed o'chirilgan (ALLOW_DEMO_IN_PROD=1 bilan yoqiladi)")
            else:
                seed_demo(s)
