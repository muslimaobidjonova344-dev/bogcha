from datetime import date, timedelta
from conftest import add_child
from app.models import EmailVerificationToken, User
from app.services import auth as auth_svc

API = "/api/v1"


def test_email_code_flow(client, db):
    r = client.post(f"{API}/auth/register", json={"email": "c@test.uz", "password": "Parol12345", "full_name": "Kod Sinovi", "role": "parent"})
    assert r.status_code == 201
    user = db.query(User).filter(User.email == "c@test.uz").first()
    code = auth_svc.create_email_code(db, user)
    db.commit()
    assert client.post(f"{API}/auth/verify-code", json={"email": "c@test.uz", "code": "000000" if code != "000000" else "111111"}).status_code == 400
    assert client.post(f"{API}/auth/verify-code", json={"email": "c@test.uz", "code": code}).status_code == 200
    db.refresh(user)
    assert user.email_verified
    assert client.post(f"{API}/auth/verify-code", json={"email": "c@test.uz", "code": code}).status_code == 400  # bir martalik


def test_code_attempts_limit(client, db):
    client.post(f"{API}/auth/register", json={"email": "d@test.uz", "password": "Parol12345", "full_name": "Kod Sinovi", "role": "parent"})
    user = db.query(User).filter(User.email == "d@test.uz").first()
    code = auth_svc.create_email_code(db, user)
    db.commit()
    wrong = "999999" if code != "999999" else "888888"
    for _ in range(5):
        assert client.post(f"{API}/auth/verify-code", json={"email": "d@test.uz", "code": wrong}).status_code == 400
    assert client.post(f"{API}/auth/verify-code", json={"email": "d@test.uz", "code": code}).status_code == 400  # 5 xatodan keyin to'g'ri kod ham yopiladi


def test_contract_flow(client, make_user, approved_kg):
    p = make_user("p@test.uz", name="Ota Onaev")
    cid = add_child(client, p)
    a = client.post(f"{API}/applications/kindergarten", headers=p["headers"], json={"child_id": cid, "provider_id": approved_kg["provider_id"], "group_id": approved_kg["group_id"]}).json()
    kh = approved_kg["user"]["headers"]
    body = {"start_date": (date.today() + timedelta(days=5)).isoformat(), "months": 6, "sign_name": "Admin Adminov"}
    assert client.post(f"{API}/me/provider/applications/{a['id']}/contract", headers=kh, json=body).status_code == 409  # hali qabul qilinmagan
    for st in ("UNDER_REVIEW", "ACCEPTED"):
        r = client.post(f"{API}/me/provider/applications/{a['id']}/status", headers=kh, json={"status": st})
        assert r.status_code == 200, r.text
    r = client.post(f"{API}/me/provider/applications/{a['id']}/contract", headers=kh, json=body)
    assert r.status_code == 201, r.text
    c = r.json()
    assert c["status"] == "sent" and c["price"] == 500000 and len(c["terms"]) >= 8
    assert client.post(f"{API}/me/provider/applications/{a['id']}/contract", headers=kh, json=body).status_code == 409
    other = make_user("o@test.uz")
    assert client.get(f"{API}/contracts/{c['id']}", headers=other["headers"]).status_code == 404
    assert client.post(f"{API}/contracts/{c['id']}/sign", headers=p["headers"], json={"full_name": "Boshqa Ism"}).status_code == 422
    r = client.post(f"{API}/contracts/{c['id']}/sign", headers=p["headers"], json={"full_name": "Ota Onaev"})
    assert r.status_code == 200 and r.json()["status"] == "active"
    assert len(client.get(f"{API}/contracts", headers=kh).json()["items"]) == 1
