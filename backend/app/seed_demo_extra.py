"""Qo'shimcha namunaviy ma'lumotlar (idempotent): ko'proq ota-ona, bog'cha, repetitor, ariza, shartnoma, dars, sharh, suhbat,
bildirishnoma, shikoyat. Eski demo hisoblar (demo.parent@example.com, demo.kg1@..., demo.tutor1@...; parol Demo12345) o'zgarmaydi,
faqat ularga bog'langan yozuvlar ko'payadi. Ma'lumotlarda "[DEMO]" belgilari yo'q — real foydalanuvchilarga o'xshaydi."""
import random
import re
import urllib.parse
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (UploadedFile, Application, ApplicationHistory, Child, Contract, Conversation, ConversationMember, District, Favorite, KindergartenGroup,
                        KindergartenStaff, Lesson, LessonBooking, Message, Notification, ParentProfile, Provider, ProviderDocument, ProviderSchedule,
                        Region, Report, Review, ReviewResponse, Student, TutorService, TutorSubject, User)
from app.services import contracts as csvc
from app.services.applications import new_number
from app.services.reviews import recompute_rating

MARKER_EMAIL = "demo.parent3@example.com"
STREETS = ["Amir Temur ko'chasi", "Navoiy ko'chasi", "Mustaqillik ko'chasi", "Bobur ko'chasi", "Fidoyilar ko'chasi", "Do'stlik ko'chasi",
           "Gulobod ko'chasi", "Sayilgoh ko'chasi", "Beruniy ko'chasi", "Oybek ko'chasi", "Muqimiy ko'chasi", "Cho'lpon ko'chasi"]
KG_DESC = ("Bolalar uchun xavfsiz va qulay muhit: kuniga 4 mahal ovqat, tinch soat, rivojlantiruvchi mashg'ulotlar va tajribali tarbiyachilar. "
           "Ota-onalar bilan doimiy aloqa va har kuni bola holati haqida hisobot.")
TUTOR_DESC = ("Individual yondashuv, uy vazifalari nazorati, oylik sinov testlari va ota-onaga muntazam hisobot. "
              "Dars rejasi o'quvchining darajasiga qarab tuziladi.")
KG_REV = {5: ["Farzandimiz bog'chaga xursand boradi, tarbiyachilar juda e'tiborli.", "Toza, tartibli va ovqatlari mazali. Tavsiya qilaman!",
              "Logoped va psixolog xizmati juda foydali bo'ldi, o'g'limiz gapira boshladi.", "Guruhda bolalar kam, har bir bolaga alohida e'tibor beriladi.",
              "Hovlisi katta, bolalar ko'p vaqtini toza havoda o'ynab o'tkazadi."],
          4: ["Hammasi yaxshi, faqat ertalabki qabul vaqti biroz erta.", "Ovqatlari yaxshi, menyuni biroz xilma-xil qilsa bo'lardi.",
              "Tarbiyachilar mehribon, to'lov haqidagi xabarlar biroz kechikadi."], 3: ["O'rtacha. Xonalar toza, lekin guruhlar to'la."]}
TU_REV = {5: ["Bir oyda natija ko'rindi, farzandim darsni yaxshi ko'rib qoldi.", "Juda sabrli va tushunarli tushuntiradi. Tavsiya qilaman!",
              "Uy vazifalarini nazorat qiladi, har hafta hisobot beradi.", "Imtihonga tayyorgarlik sifatli bo'ldi, rahmat!"],
          4: ["Darslar foydali, jadvalni moslashtirish biroz qiyin bo'ldi.", "Yaxshi o'qituvchi, narxi hamyonbop."], 3: ["O'rtacha, natijani biroz kutish kerak."]}
RESP = ["Rahmat! Farzandingizning muvaffaqiyatlari uchun doim harakat qilamiz.", "Fikringiz uchun katta rahmat, takliflaringizni inobatga olamiz.",
        "Minnatdormiz! Sizni yana ko'rishdan xursand bo'lamiz."]
KG_CHAT = [(True, "Assalomu alaykum! Guruhda bo'sh o'rin bormi?"), (False, "Vaalaykum assalom! Ha, kichik guruhda bir nechta o'rin bor."),
           (True, "Narxi va ovqatlanish haqida ma'lumot bera olasizmi?"), (False, "Oyiga belgilangan narxda, kuniga 4 mahal ovqat. Menyuni yuboramiz."),
           (True, "Rahmat, ariza yuboraman.")]
TU_CHAT = [(True, "Assalomu alaykum! Farzandim uchun dars kerak edi."), (False, "Vaalaykum assalom! Sinov darsini shu hafta o'tkazishimiz mumkin."),
           (True, "Yaxshi, qaysi kuni qulay?"), (False, "Seshanba yoki payshanba, soat 17:00 da."), (True, "Payshanba mos. Rahmat!")]


def _rng(*parts) -> random.Random:
    return random.Random("|".join(str(p) for p in parts))


def _address(dn: str, key: str) -> str:
    r = _rng("addr", key)
    return f"{dn}, {r.choice(STREETS)}, {r.randint(3, 78)}-uy"


def _strip(s):
    return re.sub(r"\s*\[DEMO\]\s*", "", s).strip() if isinstance(s, str) else s


def _pdf_bytes(text: str) -> bytes:
    safe = text.encode("ascii", "replace").decode().replace("(", "[").replace(")", "]")
    content = f"BT /F1 20 Tf 60 780 Td ({safe}) Tj ET".encode()
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
            b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out, offs = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    x = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode() + b"".join(f"{o:010d} 00000 n \n".encode() for o in offs)
    return out + f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n".encode()


def _shared_doc(db: Session, cache: dict, kind: str, owner_id: str) -> str:
    """Hujjat fayli (kichik PDF nusxa) bir marta yaratiladi va barcha namunaviy muassasalar hujjatlari uni ko'rsatadi."""
    if kind in cache:
        return cache[kind]
    import os
    import uuid
    from app.core.config import settings
    from app.services import storage as st
    title = {"license": "Faoliyat litsenziyasi (nusxa)", "diploma": "Oliy malumot diplomi (nusxa)", "certificate": "Sertifikat (nusxa)"}[kind]
    data = _pdf_bytes(title)
    path = f"{owner_id}/{uuid.uuid4().hex}.pdf"
    bucket = settings.STORAGE_BUCKET_PRIVATE
    try:
        if st._use_supabase():
            import httpx
            httpx.post(f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}", content=data, headers=st._headers("application/pdf"), timeout=30)
        else:
            full = os.path.join(settings.LOCAL_UPLOAD_DIR, bucket, path)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "wb") as f:
                f.write(data)
    except Exception as e:  # saqlash ishlamasa ham seed davom etadi
        print("Hujjat faylini saqlab bo'lmadi:", e)
    rec = UploadedFile(owner_id=owner_id, bucket=bucket, path=path, filename=f"{kind}.pdf", content_type="application/pdf", size=len(data), is_private=True)
    db.add(rec)
    db.flush()
    cache[kind] = rec.id
    return rec.id


def normalize_demo_labels(db: Session) -> None:
    """Eski seeddagi "[DEMO]" belgilari, "DEMO manzil" va izohlarni real ko'rinishga keltiradi (hisob/email/parollar o'zgarmaydi)."""
    sharhlovchilar = ["Zilola Hamidova", "Sanjar Tursunov", "Nargiza Ismoilova", "Akmal Raxmonov", "Madina Azizova"]
    for u in db.query(User).filter(User.is_demo.is_(True)):
        u.full_name = _strip(u.full_name)
        m = re.fullmatch(r"demo\.reviewer(\d+)@example\.com", u.email or "")
        if m and int(m.group(1)) <= len(sharhlovchilar):
            u.full_name = sharhlovchilar[int(m.group(1)) - 1]
        m = re.fullmatch(r"demo\.kg(\d+)@example\.com", u.email or "")
        if m and u.full_name.startswith("Admin"):
            u.full_name = ["Mansur Hakimov", "Zulfiya Qodirova", "Olim Tojiyev", "Barno Ergasheva", "Shuhrat Mirzayev", "Kamola Rasulova"][(int(m.group(1)) - 1) % 6]
    for p in db.query(Provider).filter(Provider.is_demo.is_(True)):
        p.name = _strip(p.name)
        if p.short_description:
            p.short_description = p.short_description.replace(" (DEMO ma'lumot)", "").replace("(DEMO ma'lumot)", "").strip()
        if p.description and "DEMO" in p.description:
            p.description = KG_DESC if p.type == "kindergarten" else TUTOR_DESC
        if p.address and "DEMO" in p.address:
            dn = p.address.split(",")[0].strip() if p.address.split(",")[0].strip() != "DEMO manzil" else "Chilonzor"
            p.address = _address(dn, p.id)
    for pp in db.query(ParentProfile):
        if pp.address and "DEMO" in pp.address:
            pp.address = _address(pp.address.split(",")[0].strip(), pp.user_id)
    for c in db.query(Contract):
        c.parent_signed_name = _strip(c.parent_signed_name)
        c.provider_signed_name = _strip(c.provider_signed_name)
        if c.terms and "[DEMO]" in str(c.terms):
            c.terms = [{**t, "text": _strip(t.get("text")), "title": _strip(t.get("title"))} for t in c.terms]
    for n in db.query(Notification):
        if "[DEMO]" in (n.title or "") + (n.body or ""):
            n.title, n.body = _strip(n.title), _strip(n.body)
    db.flush()


def _gallery(key: str, kind: str) -> list[str]:
    r = _rng("gal", key)
    caps = (["Hovlimiz", "Rasm chizish mashg'uloti", "Tushlik vaqti", "Sayr va o'yinlar", "Kichik guruh xonasi", "Bayram tadbiri"] if kind == "kindergarten"
            else ["Dars xonasi", "Amaliy mashg'ulot", "Sinov testi", "Guruh darsi"])
    sky = [("#CFE8F7", "#FFF6DC"), ("#FFE1D0", "#FFF4D8"), ("#D6EEDC", "#F8F4DF"), ("#E6DDF6", "#FFEBDD"), ("#CBEBEA", "#F4F8E0")]
    cols = ["#E56B8A", "#F6C945", "#5B9BD5", "#7BC79A", "#B58AE0", "#F2A65A"]
    out = []
    for cap in r.sample(caps, 4):
        a, b = r.choice(sky)
        shapes = "".join(f'<rect x="{40 + i * 62}" y="{r.randint(110, 150)}" width="46" height="{r.randint(40, 70)}" rx="8" fill="{r.choice(cols)}"/>' for i in range(6))
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/>'
               f'<stop offset="1" stop-color="{b}"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><circle cx="{r.randint(50, 350)}" cy="48" r="22" fill="#F6C945"/>'
               f'<ellipse cx="200" cy="270" rx="260" ry="70" fill="#8FC79B"/>{shapes}<rect x="0" y="222" width="400" height="38" fill="#245C43" opacity=".82"/>'
               f'<text x="200" y="246" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">{cap}</text></svg>')
        out.append("data:image/svg+xml;utf8," + urllib.parse.quote(svg))
    return out


def seed_demo_more(db: Session) -> None:
    if db.query(User).filter(User.email == MARKER_EMAIL).first():
        print("Qo'shimcha namunaviy ma'lumotlar allaqachon mavjud")
        return
    rnd = _rng("kichkintoy", 2026)
    now = datetime.now(timezone.utc)
    today = date.today()
    pw = hash_password("Demo12345")
    regs = {r.name: r for r in db.query(Region)}
    dists = {(d.region_id, d.name): d.id for d in db.query(District)}

    def loc(rn, dn):
        r = regs.get(rn) or regs["Toshkent shahri"]
        return r.id, dists.get((r.id, dn))

    def user(email, role, name, phone=None):
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(email=email, password_hash=pw, role=role, full_name=name, email_verified=True, profile_completed=True, is_demo=True, phone=phone)
            db.add(u)
            db.flush()
        return u

    by_email = lambda e: db.query(User).filter(User.email == e).first()
    parent, parent2 = by_email("demo.parent@example.com"), by_email("demo.parent2@example.com")
    old_kgs = [db.query(Provider).filter(Provider.owner_user_id == by_email(f"demo.kg{i}@example.com").id).first() for i in range(1, 7) if by_email(f"demo.kg{i}@example.com")]
    old_tutors = [db.query(Provider).filter(Provider.owner_user_id == by_email(f"demo.tutor{i}@example.com").id).first() for i in range(1, 6) if by_email(f"demo.tutor{i}@example.com")]
    azizbek = db.query(Child).filter(Child.parent_user_id == parent.id, Child.first_name == "Azizbek").first()
    madina = db.query(Child).filter(Child.parent_user_id == parent.id, Child.first_name == "Madina").first()
    bekzod = db.query(Child).filter(Child.parent_user_id == parent2.id).first()

    # ---------- ota-onalar va bolalar ----------
    P = [("demo.parent3@example.com", "Gulnora Rashidova", "+998935556677", "Toshkent shahri", "Shayxontohur", [("Sevinch", "Rashidova", 5, "Maktabgacha", ["rasm", "qo'g'irchoq"]), ("Amir", "Rashidov", 9, "1–4-sinf", ["futbol", "robotlar"])]),
         ("demo.parent4@example.com", "Otabek Nazarov", "+998977778899", "Toshkent shahri", "Yakkasaroy", [("Zarina", "Nazarova", 4, "Maktabgacha", ["qo'shiq"])]),
         ("demo.parent5@example.com", "Malika Sobirova", "+998946543210", "Toshkent shahri", "Uchtepa", [("Javohir", "Sobirov", 6, "Maktabgacha", ["konstruktor"]), ("Dilorom", "Sobirova", 12, "5–9-sinf", ["biologiya", "kitob"])]),
         ("demo.parent6@example.com", "Bobur Xolmatov", "+998909876543", "Toshkent shahri", "Olmazor", [("Mubina", "Xolmatova", 3, "Maktabgacha", ["o'yinchoq"])]),
         ("demo.parent7@example.com", "Shahnoza Yuldasheva", "+998331234567", "Samarqand viloyati", "Samarqand shahri", [("Ibrohim", "Yuldashev", 5, "Maktabgacha", ["mashinalar"])]),
         ("demo.parent8@example.com", "Rustam Qosimov", "+998911239988", "Namangan viloyati", "Namangan shahri", [("Asilbek", "Qosimov", 7, "1–4-sinf", ["shaxmat"]), ("Lola", "Qosimova", 4, "Maktabgacha", ["raqs"])]),
         ("demo.parent9@example.com", "Feruza Mamatova", "+998883334455", "Farg'ona viloyati", "Farg'ona shahri", [("Samir", "Mamatov", 13, "5–9-sinf", ["dasturlash"])])]
    parents, kids = [parent, parent2], {parent.id: [azizbek, madina], parent2.id: [bekzod]}
    for email, name, phone, rn, dn, children in P:
        u = user(email, "parent", name, phone)
        rid, did = loc(rn, dn)
        db.add(ParentProfile(user_id=u.id, region_id=rid, district_id=did, address=_address(dn, u.id)))
        kids[u.id] = []
        for fn, ln, age, lvl, intr in children:
            c = Child(parent_user_id=u.id, first_name=fn, last_name=ln, birth_date=date(today.year - age, rnd.randint(1, 12), rnd.randint(1, 28)), education_level=lvl, interests=intr)
            db.add(c)
            kids[u.id].append(c)
        parents.append(u)
    db.flush()

    # ---------- yangi bog'chalar ----------
    kg_new = [("Oltin Beshik bog'chasi", "Toshkent shahri", "Shayxontohur", 41.3263, 69.2287, 700000, "private", (2, 6), ["Ovqatlanish", "Uxlash xonasi", "Ingliz tili", "Psixolog", "Video kuzatuv"]),
              ("Kamalak davlat bog'chasi № 87", "Toshkent shahri", "Uchtepa", 41.2920, 69.1690, 150000, "state", (3, 6), ["Ovqatlanish", "Uxlash xonasi", "Hovli/o'yin maydoni"]),
              ("Bolajonlar dunyosi", "Toshkent shahri", "Olmazor", 41.3450, 69.2310, 580000, "private", (3, 6), ["Ovqatlanish", "Logoped", "Sport zali", "Transport"]),
              ("Sevimli Tolpinchak", "Samarqand viloyati", "Samarqand shahri", 39.6610, 66.9340, 520000, "private", (3, 7), ["Ovqatlanish", "Hovuz", "Ingliz tili"]),
              ("Chaqaloq oroli", "Namangan viloyati", "Namangan shahri", 40.9983, 71.6726, 480000, "private", (2, 6), ["Ovqatlanish", "Uxlash xonasi", "Psixolog"]),
              ("Yulduzcha bog'chasi", "Farg'ona viloyati", "Farg'ona shahri", 40.3864, 71.7864, 460000, "private", (3, 6), ["Ovqatlanish", "Hovli/o'yin maydoni", "Video kuzatuv"])]
    admins = ["Dilfuza Normatova", "Hamid Saidov", "Nodira Yusupova", "Jahongir Umarov", "Sabohat Karimova", "Elyor Abdullayev"]
    groups: dict[str, list] = {}
    kgs = list(old_kgs)
    for i, (name, rn, dn, lat, lng, price, own, (a1, a2), am) in enumerate(kg_new):
        u = user(f"demo.kg{7 + i}@example.com", "kindergarten_admin", admins[i], f"+99890{rnd.randint(1000000, 9999999)}")
        rid, did = loc(rn, dn)
        p = Provider(type="kindergarten", owner_user_id=u.id, name=name, short_description="Qulay muhit, tajribali tarbiyachilar va sifatli ovqatlanish.", description=KG_DESC,
                     region_id=rid, district_id=did, address=_address(dn, name), lat=lat, lng=lng, phone=f"+99871{rnd.randint(1000000, 9999999)}", email=f"info{7 + i}@kichkintoy.uz",
                     ownership=own, meal_type="4 mahal", monthly_price=price, min_age=a1, max_age=a2, work_days=[1, 2, 3, 4, 5], work_open=time(7, 30), work_close=time(18, 30),
                     verification_status="approved", is_demo=True, amenities=am)
        db.add(p)
        db.flush()
        kgs.append(p)
    for p in kgs:
        existing = db.query(KindergartenGroup).filter(KindergartenGroup.provider_id == p.id).order_by(KindergartenGroup.min_age).all()
        if not existing:
            for gname, ga, gb, cap in (("Kichik guruh", 3, 4, 20), ("O'rta guruh", 4, 5, 20), ("Katta guruh", 5, 6, 15)):
                g = KindergartenGroup(provider_id=p.id, name=gname, min_age=ga, max_age=gb, capacity=cap, current_count=rnd.randint(7, cap - 2), monthly_price=p.monthly_price, meal_type="4 mahal")
                db.add(g)
                existing.append(g)
        groups[p.id] = existing
        if not db.query(KindergartenStaff).filter(KindergartenStaff.provider_id == p.id).first():
            for fn, pos in rnd.sample([("Nilufar Karimova", "Tarbiyachi"), ("Gulbahor Aliyeva", "Tarbiyachi"), ("Sevara Jo'rayeva", "Yordamchi tarbiyachi"), ("Dildora Ismoilova", "Logoped"),
                                       ("Mavluda Tosheva", "Psixolog"), ("Zebo Ergasheva", "Hamshira"), ("Ra'no Saidova", "Musiqa rahbari"), ("Ozoda Xakimova", "Tarbiyachi")], 4):
                db.add(KindergartenStaff(provider_id=p.id, full_name=fn, position=pos, phone=f"+99893{rnd.randint(1000000, 9999999)}", experience_years=rnd.randint(2, 18)))
        if not p.gallery:
            p.gallery = _gallery(p.id, "kindergarten")
    db.flush()

    # ---------- yangi repetitorlar ----------
    tu_new = [("Aziza Tursunova", "Biologiya", 110000, 8, "5–9-sinf", "Toshkent shahri", "Mirobod"), ("Bekzod Rahmonov", "Kimyo", 120000, 6, "10–11-sinf", "Toshkent shahri", "Yashnobod"),
              ("Gulchehra Saidova", "Rus tili", 85000, 12, "1–4-sinf", "Toshkent shahri", "Yakkasaroy"), ("Jamshid Xoliqov", "Ingliz tili (IELTS)", 160000, 10, "Abituriyent", "Toshkent shahri", "Mirzo Ulug'bek"),
              ("Ruxsora Abdullayeva", "Maktabga tayyorlov", 90000, 6, "Maktabgacha", "Toshkent shahri", "Sergeli"), ("Sherzod Normatov", "Matematika", 95000, 9, "5–9-sinf", "Samarqand viloyati", "Samarqand shahri")]
    tutors = list(old_tutors)
    for i, (name, subj, price, exp, lvl, rn, dn) in enumerate(tu_new):
        u = user(f"demo.tutor{6 + i}@example.com", "tutor", name, f"+99897{rnd.randint(1000000, 9999999)}")
        rid, did = loc(rn, dn)
        p = Provider(type="tutor", owner_user_id=u.id, name=name, short_description=f"{subj} bo'yicha tajribali repetitor.", specialty=subj, description=TUTOR_DESC,
                     teaching_style="Individual yondashuv, amaliy mashqlar, oylik test.", education_degree="Bakalavr", education_institution="Toshkent davlat pedagogika universiteti",
                     region_id=rid, district_id=did, address=_address(dn, name), lat=41.28 + i * 0.011, lng=69.20 + i * 0.012, phone=u.phone, email=f"tutor{6 + i}@kichkintoy.uz",
                     experience_years=exp, lesson_mode="both", hourly_price=price, languages=["uz", "ru"], verification_status="approved", is_demo=True)
        db.add(p)
        db.flush()
        db.add(TutorSubject(provider_id=p.id, subject=subj))
        db.add(TutorService(provider_id=p.id, subject=subj, education_level=lvl, grades=["1", "2", "3"], duration_minutes=60, format="individual", mode="offline", price=price))
        for wd in (2, 4, 6):
            db.add(ProviderSchedule(provider_id=p.id, weekday=wd, start_time=time(14, 0), end_time=time(19, 0)))
        tutors.append(p)
    db.flush()
    svc: dict[str, TutorService] = {}
    for p in tutors:
        s = db.query(TutorService).filter(TutorService.provider_id == p.id).order_by(TutorService.created_at).first()
        svc[p.id] = s
        if db.query(TutorService).filter(TutorService.provider_id == p.id).count() == 1:  # ikkinchi xizmat: guruh, online
            db.add(TutorService(provider_id=p.id, subject=s.subject, education_level=s.education_level, grades=s.grades, duration_minutes=90, format="group", mode="online", price=int(s.price * 0.6)))
        if not db.query(ProviderSchedule).filter(ProviderSchedule.provider_id == p.id).first():
            for wd in (1, 3, 5):
                db.add(ProviderSchedule(provider_id=p.id, weekday=wd, start_time=time(15, 0), end_time=time(19, 0)))
    doc_cache: dict = {}
    # ---------- tekshiruv navbati uchun yangi muassasalar ----------
    pend = [("kindergarten", "demo.kg13@example.com", "Zumrad bog'chasi", "Qobiljon Aliyev", "pending", None, "license", "Faoliyat litsenziyasi"),
            ("tutor", "demo.tutor12@example.com", "Laylo Karimova", "Laylo Karimova", "under_review", None, "diploma", "Oliy ma'lumot diplomi"),
            ("tutor", "demo.tutor13@example.com", "Odil Ravshanov", "Odil Ravshanov", "rejected", "Diplom nusxasi o'qilmaydi, aniqroq skaner yuklang.", "diploma", "Diplom")]
    for typ, email, name, owner, st, note, dt, dtitle in pend:
        u = user(email, "kindergarten_admin" if typ == "kindergarten" else "tutor", owner, f"+99899{rnd.randint(1000000, 9999999)}")
        rid, did = loc("Toshkent shahri", "Chilonzor")
        p = Provider(type=typ, owner_user_id=u.id, name=name, short_description="Yangi ro'yxatdan o'tgan muassasa.", description=KG_DESC if typ == "kindergarten" else TUTOR_DESC,
                     region_id=rid, district_id=did, address=_address("Chilonzor", name), lat=41.28, lng=69.21, phone=u.phone, email=email.replace("demo.", "").replace("@example.com", "@kichkintoy.uz"),
                     verification_status=st, verification_note=note, is_demo=True, monthly_price=500000 if typ == "kindergarten" else None, hourly_price=100000 if typ == "tutor" else None,
                     specialty=None if typ == "kindergarten" else "Geografiya", ownership="private" if typ == "kindergarten" else None)
        db.add(p)
        db.flush()
        db.add(ProviderDocument(provider_id=p.id, doc_type=dt, title=dtitle, file_id=_shared_doc(db, doc_cache, "license" if dt == "license" else "diploma", u.id), status="rejected" if st == "rejected" else "pending", review_note=note))
    for p in kgs + tutors:  # tasdiqlangan muassasalar hujjatlari
        if not db.query(ProviderDocument).filter(ProviderDocument.provider_id == p.id).first():
            for dt, title in ((("license", "Faoliyat litsenziyasi"), ("certificate", "Sanitariya xulosasi")) if p.type == "kindergarten" else (("diploma", "Oliy ma'lumot diplomi"), ("certificate", "Malaka sertifikati"))):
                db.add(ProviderDocument(provider_id=p.id, doc_type=dt, title=title, file_id=_shared_doc(db, doc_cache, "license" if dt == "license" else ("diploma" if dt == "diploma" else "certificate"), p.owner_user_id), status="approved", reviewed_at=now - timedelta(days=rnd.randint(30, 200))))
    db.flush()

    # ---------- arizalar, o'quvchilar, shartnomalar, darslar ----------
    seen: set[tuple[str, str]] = set(db.query(Application.child_id, Application.provider_id).all())
    pools = {"parent": {p.id: p for p in parents}}

    def mk_app(parent_u, child, prov, status, days_ago, note=None, provider_note=None, interview=None):
        if (child.id, prov.id) in seen:
            return None
        seen.add((child.id, prov.id))
        kg = prov.type == "kindergarten"
        age = today.year - child.birth_date.year
        g = None
        if kg:
            gl = groups.get(prov.id) or []
            g = next((x for x in gl if x.min_age <= age <= x.max_age), gl[0] if gl else None)
        sv = None if kg else svc.get(prov.id)
        a = Application(number=new_number(db), type=prov.type, parent_user_id=parent_u.id, child_id=child.id, provider_id=prov.id, group_id=g.id if g else None, service_id=sv.id if sv else None,
                        subject=None if kg else prov.specialty, grade=None if kg else str(max(1, min(age - 6, 11))), lesson_format=None if kg else "individual", lesson_mode=None if kg else "offline",
                        duration_minutes=None if kg else 60, desired_start_date=today - timedelta(days=days_ago) + timedelta(days=14), parent_note=note, status=status, provider_note=provider_note, interview_at=interview)
        a.created_at = now - timedelta(days=days_ago)
        a.updated_at = now - timedelta(days=max(days_ago - 2, 0))
        db.add(a)
        db.flush()
        chain = {"SUBMITTED": [], "UNDER_REVIEW": ["UNDER_REVIEW"], "MORE_INFO_REQUIRED": ["UNDER_REVIEW", "MORE_INFO_REQUIRED"], "INTERVIEW_SCHEDULED": ["UNDER_REVIEW", "INTERVIEW_SCHEDULED"],
                 "ACCEPTED": ["UNDER_REVIEW", "ACCEPTED"], "REJECTED": ["UNDER_REVIEW", "REJECTED"], "CANCELLED": ["CANCELLED"]}[status]
        prev = None
        for k, st in enumerate(["SUBMITTED"] + chain):
            actor = parent_u.id if (k == 0 or st == "CANCELLED") else prov.owner_user_id
            h = ApplicationHistory(application_id=a.id, from_status=prev, to_status=st, actor_id=actor, note=None)
            h.created_at = now - timedelta(days=max(days_ago - k, 0))
            db.add(h)
            prev = st
        if status == "ACCEPTED":
            db.add(Student(provider_id=prov.id, child_id=child.id, parent_user_id=parent_u.id, application_id=a.id, group_id=g.id if g else None, status="active"))
        return a

    by_p = {u.email: u for u in parents}
    P3, P4, P5, P6, P7, P8, P9 = (by_p[f"demo.parent{i}@example.com"] for i in range(3, 10))
    k3, k4, k5, k6, k7, k8, k9 = (kids[u.id] for u in (P3, P4, P5, P6, P7, P8, P9))
    K = {i + 1: p for i, p in enumerate(kgs)}      # 1..12
    T = {i + 1: p for i, p in enumerate(tutors)}   # 1..11
    plan = [  # (ota-ona, bola, muassasa, holat, necha kun oldin, izoh)
        (parent, madina, T[8], "ACCEPTED", 62, "Rus tilini maktab dasturi bo'yicha mustahkamlash kerak."), (parent, azizbek, K[7], "CANCELLED", 12, "Boshqa bog'cha tanladik."),
        (parent, azizbek, K[8], "SUBMITTED", 1, None), (parent2, bekzod, K[9], "ACCEPTED", 35, "Katta guruhga."), (parent2, bekzod, T[4], "ACCEPTED", 28, "Maktabga tayyorlov kerak."),
        (P3, k3[0], K[1], "ACCEPTED", 50, "Kichik guruhga joylashtirmoqchimiz."), (P3, k3[0], K[3], "REJECTED", 55, None), (P3, k3[1], T[2], "ACCEPTED", 45, "Ingliz tilini noldan boshlaymiz."),
        (P3, k3[1], T[1], "ACCEPTED", 40, "Matematikadan qiynalyapti."), (P4, k4[0], K[1], "UNDER_REVIEW", 2, None), (P4, k4[0], K[2], "INTERVIEW_SCHEDULED", 5, "Suhbat uchun qulay vaqt kelishamiz."),
        (P4, k4[0], K[7], "SUBMITTED", 1, None), (P5, k5[0], T[4], "ACCEPTED", 70, "Maktabga tayyorlash."), (P5, k5[1], T[6], "ACCEPTED", 33, "Biologiyani chuqur o'rganmoqchi."),
        (P5, k5[1], T[1], "UNDER_REVIEW", 3, None), (P6, k6[0], K[1], "ACCEPTED", 90, "Birinchi marta bog'chaga boryapti."), (P6, k6[0], K[8], "SUBMITTED", 2, None), (P6, k6[0], K[2], "REJECTED", 30, None),
        (P7, k7[0], K[6], "ACCEPTED", 80, None), (P7, k7[0], K[10], "INTERVIEW_SCHEDULED", 4, None), (P8, k8[0], T[2], "ACCEPTED", 120, "Maktabdagi ingliz tili darslariga yordam."), (P8, k8[1], K[11], "ACCEPTED", 100, None),
        (P8, k8[1], K[5], "CANCELLED", 110, None), (P9, k9[0], T[3], "ACCEPTED", 150, "Dasturlashni o'rganmoqchi."), (P9, k9[0], T[7], "MORE_INFO_REQUIRED", 6, None), (P9, k9[0], T[5], "SUBMITTED", 1, None)]
    notes = {"ACCEPTED": "Xush kelibsiz! Hujjatlar ro'yxatini yubordik.", "REJECTED": "Afsuski, hozircha bo'sh joy yo'q.", "MORE_INFO_REQUIRED": "Bolaning yoshi va sinfini aniqlashtirib bering.",
             "UNDER_REVIEW": None, "SUBMITTED": None, "CANCELLED": None, "INTERVIEW_SCHEDULED": "Suhbatga bola bilan birga keling."}
    accepted: list = []
    apps = []
    for pu, ch, pv, st, d, note in plan:
        a = mk_app(pu, ch, pv, st, d, note, notes[st], now + timedelta(days=rnd.randint(1, 5)) if st == "INTERVIEW_SCHEDULED" else None)
        if a:
            apps.append(a)
            if st == "ACCEPTED":
                accepted.append(a)
    # yillik dinamika uchun qo'shimcha arizalar (turli oylarda)
    approved_kg, approved_tu = [p for p in kgs], [p for p in tutors]
    weights = ["ACCEPTED"] * 5 + ["REJECTED"] * 2 + ["UNDER_REVIEW"] * 2 + ["SUBMITTED"] + ["CANCELLED"]
    for _ in range(70):
        pu = rnd.choice(parents)
        ch = rnd.choice(kids[pu.id])
        age = today.year - ch.birth_date.year
        pv = rnd.choice(approved_kg if age <= 6 else approved_tu)
        d = int(rnd.triangular(3, 335, 120))
        st = rnd.choice(weights) if d > 14 else rnd.choice(["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "INTERVIEW_SCHEDULED"])
        a = mk_app(pu, ch, pv, st, d, None, notes[st], now + timedelta(days=2) if st == "INTERVIEW_SCHEDULED" else None)
        if a:
            apps.append(a)
            if st == "ACCEPTED":
                accepted.append(a)
    db.flush()
    accepted += db.query(Application).join(User, User.id == Application.parent_user_id).filter(Application.status == "ACCEPTED", User.is_demo.is_(True)).all()  # eski namunalarni ham qamrab olamiz
    done_apps = {a.id: a for a in accepted}.values()

    ncon = 0
    for a in done_apps:
        prov, pu, ch = db.get(Provider, a.provider_id), db.get(User, a.parent_user_id), db.get(Child, a.child_id)
        age_days = (now - a.created_at).days
        if not db.query(Contract).filter(Contract.application_id == a.id).first() and rnd.random() < 0.85:
            unit = "month" if prov.type == "kindergarten" else "lesson"
            price = prov.monthly_price if unit == "month" else prov.hourly_price
            start = a.created_at.date() + timedelta(days=10)
            end = csvc.add_months(start, 12)
            status = "sent" if age_days < 8 else ("cancelled" if rnd.random() < 0.08 else "active")
            owner = db.get(User, prov.owner_user_id)
            c = Contract(number=csvc.new_number(lambda n: db.query(Contract).filter(Contract.number == n).first() is not None), application_id=a.id, provider_id=prov.id, parent_user_id=pu.id,
                         child_id=ch.id, kind=prov.type, price=price or 0, price_unit=unit, start_date=start, end_date=end, status=status,
                         terms=csvc.build_terms(prov.type, prov, pu, ch, price or 0, unit, start, end, a.subject), provider_signed_at=a.created_at + timedelta(days=2, hours=3), provider_signed_name=owner.full_name)
            if status != "sent":
                c.parent_signed_at = a.created_at + timedelta(days=3, hours=1)
                c.parent_signed_name = pu.full_name
            c.created_at = a.created_at + timedelta(days=2)
            db.add(c)
            ncon += 1
        if prov.type == "tutor":  # darslar: o'tgan (done), kelgusi (planned), bittasi bekor
            stu = db.query(Student).filter(Student.application_id == a.id).first()
            if stu and not db.query(Lesson).filter(Lesson.student_id == stu.id).first():
                sv = svc.get(prov.id)
                first = max(1, min(age_days // 7 - 1, 8))
                for w in range(-first, 3):
                    day = now + timedelta(weeks=w)
                    s = day.replace(hour=10, minute=0, second=0, microsecond=0)
                    st = "done" if w < 0 else "planned"
                    if w == -2 and rnd.random() < 0.5:
                        st = "cancelled"
                    bk = LessonBooking(provider_id=prov.id, application_id=a.id, student_id=stu.id, starts_at=s, ends_at=s + timedelta(hours=1), status="cancelled" if st == "cancelled" else "booked")
                    db.add(bk)
                    db.flush()
                    db.add(Lesson(provider_id=prov.id, student_id=stu.id, booking_id=bk.id, service_id=sv.id if sv else None, subject=prov.specialty, starts_at=s, ends_at=s + timedelta(hours=1), price=prov.hourly_price, status=st))
    db.flush()

    # ---------- sharhlar va javoblar ----------
    reviews = []
    for a in done_apps:
        prov = db.get(Provider, a.provider_id)
        if (now - a.created_at).days < 25 or rnd.random() > 0.65:
            continue
        if db.query(Review).filter(Review.parent_user_id == a.parent_user_id, Review.provider_id == prov.id).first():
            continue
        rating = rnd.choices([5, 4, 3], [6, 3, 1])[0]
        pool = (KG_REV if prov.type == "kindergarten" else TU_REV)[rating]
        r = Review(provider_id=prov.id, parent_user_id=a.parent_user_id, application_id=a.id, rating=rating, comment=rnd.choice(pool), status="published")
        r.created_at = a.created_at + timedelta(days=rnd.randint(15, 24))
        db.add(r)
        reviews.append(r)
    db.flush()
    for r in reviews:
        if rnd.random() < 0.55:
            rr = ReviewResponse(review_id=r.id, responder_user_id=db.get(Provider, r.provider_id).owner_user_id, text=rnd.choice(RESP))
            rr.created_at = r.created_at + timedelta(days=1)
            db.add(rr)
    for r in rnd.sample(reviews, min(2, len(reviews))):  # moderatsiya navbati uchun
        r.status, r.moderation_note = "flagged", "Shubhali: qisqa muddatda ko'p sharh yozilgan"
    db.flush()
    for p in kgs + tutors:
        recompute_rating(db, p.id)

    # ---------- saqlanganlar ----------
    for pu in parents:
        for p in rnd.sample(kgs + tutors, 3):
            if not db.query(Favorite).filter(Favorite.user_id == pu.id, Favorite.provider_id == p.id).first():
                db.add(Favorite(user_id=pu.id, provider_id=p.id))

    # ---------- suhbatlar ----------
    nconv = 0
    for a in rnd.sample(apps, min(24, len(apps))) + [x for x in apps if x.parent_user_id == parent.id][:6]:
        prov = db.get(Provider, a.provider_id)
        if db.query(Conversation).filter(Conversation.parent_user_id == a.parent_user_id, Conversation.provider_id == prov.id).first():
            continue
        texts = KG_CHAT if prov.type == "kindergarten" else TU_CHAT
        texts = texts[: rnd.randint(3, len(texts))]
        t0 = a.created_at + timedelta(hours=2)
        cv = Conversation(parent_user_id=a.parent_user_id, provider_id=prov.id, last_message_at=t0 + timedelta(minutes=len(texts) * 7))
        db.add(cv)
        db.flush()
        unread_for_parent = not texts[-1][0] and rnd.random() < 0.5
        db.add(ConversationMember(conversation_id=cv.id, user_id=a.parent_user_id, last_read_at=t0 - timedelta(hours=1) if unread_for_parent else t0 + timedelta(hours=2)))
        db.add(ConversationMember(conversation_id=cv.id, user_id=prov.owner_user_id, last_read_at=t0 + timedelta(hours=2)))
        for k, (mine, body) in enumerate(texts):
            m = Message(conversation_id=cv.id, sender_id=a.parent_user_id if mine else prov.owner_user_id, body=body)
            m.created_at = t0 + timedelta(minutes=k * 7)
            db.add(m)
        nconv += 1
    db.flush()

    # ---------- bildirishnomalar ----------
    def notify(uid, typ, title, body, link, days, read=True):
        n = Notification(user_id=uid, type=typ, title=title, body=body, link=link, read_at=now - timedelta(days=days) if read else None)
        n.created_at = now - timedelta(days=days, hours=rnd.randint(0, 6))
        db.add(n)
    for a in apps[-40:]:
        prov = db.get(Provider, a.provider_id)
        d = max((now - a.created_at).days, 0)
        base = "kindergarten" if prov.type == "kindergarten" else "tutor"
        if a.status in ("SUBMITTED", "UNDER_REVIEW"):
            notify(prov.owner_user_id, "application_new", "Yangi ariza", f"{a.number} raqamli ariza kelib tushdi", f"/{base}/applications/{a.id}", d, read=d > 3)
        if a.status == "ACCEPTED":
            notify(a.parent_user_id, "application_accepted", "Ariza qabul qilindi", f"{prov.name} — {a.number}", f"/parent/applications/{a.id}", max(d - 2, 0), read=d > 5)
        if a.status == "REJECTED":
            notify(a.parent_user_id, "application_rejected", "Ariza rad etildi", f"{prov.name}: boshqa variantlarni ko'rib chiqing", f"/parent/applications/{a.id}", max(d - 2, 0), read=True)
    for r in reviews[:8]:
        prov = db.get(Provider, r.provider_id)
        notify(prov.owner_user_id, "review_new", "Yangi sharh", f"{r.rating} ★ — yangi sharh qoldirildi", f"/{'kindergarten' if prov.type == 'kindergarten' else 'tutor'}/reviews", max((now - r.created_at).days, 0), read=False)
    db.flush()

    # ---------- shikoyatlar (admin uchun) ----------
    flagged = [r for r in reviews if r.status == "flagged"]
    owner_of = lambda p: db.get(User, p.owner_user_id)
    rep = [("review", flagged[0].id if flagged else None, "Haqoratli yoki noo'rin sharh", "Sharhda noto'g'ri ma'lumot bor.", "open", owner_of(db.get(Provider, flagged[0].provider_id)).id if flagged else None),
           ("provider", old_kgs[3].id, "Noto'g'ri ma'lumot", "Narxlar saytda ko'rsatilganidan farq qiladi.", "open", P4.id),
           ("provider", kgs[8].id, "Spam yoki reklama", "Profilda begona havolalar bor.", "resolved", P6.id),
           ("user", P9.id, "Shubhali hisob", "Bir necha marta bir xil xabar yubordi.", "dismissed", owner_of(tutors[2]).id)]
    for tt, tid, reason, details, st, rid_ in rep:
        if tid and rid_:
            rp = Report(reporter_id=rid_, target_type=tt, target_id=tid, reason=reason, details=details, status=st, resolution_note=None if st == "open" else "Ko'rib chiqildi")
            rp.created_at = now - timedelta(days=rnd.randint(1, 20))
            db.add(rp)

    # ---------- vaqt bo'yicha taqsimot (hisobot diagrammalari uchun) ----------
    for u in db.query(User).filter(User.is_demo.is_(True)):
        u.created_at = now - timedelta(days=rnd.randint(2, 175))
        if rnd.random() < 0.7:
            u.last_login_at = now - timedelta(days=rnd.randint(0, 9), hours=rnd.randint(0, 20))
    for p in db.query(Provider).filter(Provider.is_demo.is_(True)):
        p.created_at = min(p.created_at, now - timedelta(days=rnd.randint(30, 200)))
    db.commit()
    print(f"Qo'shimcha namunaviy ma'lumotlar yaratildi: {len(apps)} ta ariza, {ncon} ta shartnoma, {nconv} ta suhbat, {len(reviews)} ta sharh")


def run(db: Session) -> None:
    normalize_demo_labels(db)
    db.commit()
    seed_demo_more(db)
