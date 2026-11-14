import os
os.environ.update(ENV="test", DATABASE_URL="sqlite:///./test.db", AUTH_RATE_LIMIT_PER_MINUTE="10000", RATE_LIMIT_PER_MINUTE="100000",
                  APPS_SCRIPT_URL="", LOCAL_UPLOAD_DIR="./test_uploads")
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password, hash_token
from app.main import app
from app.models import EmailVerificationToken, Provider, ProviderDocument, UploadedFile, User
from app.seed import seed_base

H = {"Authorization": ""}


@pytest.fixture()
def db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    s = SessionLocal()
    seed_base(s)
    yield s
    s.close()


@pytest.fixture()
def client(db):
    return TestClient(app)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def make_user(client, db):
    """Ro'yxatdan o'tadi, emailni tasdiqlaydi va Bearer sarlavhali foydalanuvchi qaytaradi."""
    def _make(email, role="parent", verify=True, name="Test Foydalanuvchi", password="Parol12345"):
        r = client.post("/api/v1/auth/register", json={"email": email, "password": password, "full_name": name, "role": role})
        assert r.status_code == 201, r.text
        d = r.json()
        client.cookies.clear()  # testlarda faqat Bearer ishlatiladi
        if verify:
            u = db.query(User).filter(User.email == email).first()
            u.email_verified = True
            db.commit()
        return {"id": d["user"]["id"], "headers": _auth(d["access_token"]), "email": email, "password": password}
    return _make


@pytest.fixture()
def admin(client, db):
    db.add(User(email="admin@test.uz", password_hash=hash_password("Admin12345"), role="super_admin", full_name="Admin", email_verified=True, profile_completed=True))
    db.commit()
    r = client.post("/api/v1/auth/login", json={"email": "admin@test.uz", "password": "Admin12345"})
    client.cookies.clear()
    return {"headers": _auth(r.json()["access_token"])}


@pytest.fixture()
def approved_kg(client, db, make_user, admin):
    """Tasdiqlangan bog'cha (1 ta guruh, sig'im 2)."""
    u = make_user("kg@test.uz", "kindergarten_admin")
    p = db.query(Provider).filter(Provider.owner_user_id == u["id"]).first()
    from app.models import Region, District
    reg = db.query(Region).first()
    dist = db.query(District).filter(District.region_id == reg.id).first()
    r = client.put("/api/v1/me/provider", headers=u["headers"], json={"name": "Test bog'cha", "region_id": reg.id, "district_id": dist.id,
        "address": "Manzil 1", "phone": "+998901234567", "ownership": "private", "monthly_price": 500000, "min_age": 3, "max_age": 6, "lat": 41.3, "lng": 69.2})
    assert r.status_code == 200, r.text
    g = client.post("/api/v1/me/provider/groups", headers=u["headers"], json={"name": "Kichik", "min_age": 3, "max_age": 6, "capacity": 2})
    assert g.status_code == 201, g.text
    f = UploadedFile(owner_id=u["id"], bucket="documents", path="x/y.pdf", filename="lit.pdf", content_type="application/pdf", size=10)
    db.add(f); db.flush()
    doc = ProviderDocument(provider_id=p.id, doc_type="license", file_id=f.id)
    db.add(doc); db.commit()
    assert client.post(f"/api/v1/admin/documents/{doc.id}/review", headers=admin["headers"], json={"status": "approved"}).status_code == 200
    assert client.post(f"/api/v1/admin/providers/{p.id}/verification", headers=admin["headers"], json={"status": "approved"}).status_code == 200
    return {"user": u, "provider_id": p.id, "group_id": g.json()["id"]}


def add_child(client, parent, name="Ali", years=4):
    from datetime import date
    r = client.post("/api/v1/children", headers=parent["headers"], json={"first_name": name, "last_name": "Valiyev",
        "birth_date": date(date.today().year - years, 1, 1).isoformat()})
    assert r.status_code == 201, r.text
    return r.json()["id"]
