from app.core.security import hash_token, new_token, now_utc
from app.models import EmailVerificationToken, PasswordResetToken, User
from datetime import timedelta


def test_register_login_me(client, make_user):
    u = make_user("a@test.uz", verify=False)
    r = client.get("/api/v1/auth/me", headers=u["headers"])
    assert r.status_code == 200 and r.json()["email"] == "a@test.uz" and r.json()["email_verified"] is False
    r = client.post("/api/v1/auth/login", json={"email": "a@test.uz", "password": "Parol12345"})
    assert r.status_code == 200 and "access_token" in r.json()


def test_duplicate_and_weak_password(client, make_user):
    make_user("a@test.uz")
    r = client.post("/api/v1/auth/register", json={"email": "a@test.uz", "password": "Parol12345", "full_name": "X Y", "role": "parent"})
    assert r.status_code == 409
    r = client.post("/api/v1/auth/register", json={"email": "b@test.uz", "password": "abcdefgh", "full_name": "X Y", "role": "parent"})
    assert r.status_code == 422


def test_cannot_register_super_admin(client):
    r = client.post("/api/v1/auth/register", json={"email": "s@test.uz", "password": "Parol12345", "full_name": "X Y", "role": "super_admin"})
    assert r.status_code == 422


def test_password_hashed_argon2(client, make_user, db):
    make_user("a@test.uz")
    assert db.query(User).filter(User.email == "a@test.uz").first().password_hash.startswith("$argon2id$")


def test_email_verification_flow(client, make_user, db):
    u = make_user("a@test.uz", verify=False)
    user = db.query(User).filter(User.email == "a@test.uz").first()
    tok = new_token()
    db.add(EmailVerificationToken(user_id=user.id, token_hash=hash_token(tok), expires_at=now_utc() + timedelta(minutes=30)))
    db.commit()
    assert client.post("/api/v1/auth/verify-email", json={"token": "wrong"}).status_code == 400
    assert client.post("/api/v1/auth/verify-email", json={"token": tok}).status_code == 200
    db.refresh(user)
    assert user.email_verified is True
    assert client.post("/api/v1/auth/verify-email", json={"token": tok}).status_code == 400  # bir martalik


def test_expired_verification_token(client, make_user, db):
    make_user("a@test.uz", verify=False)
    user = db.query(User).filter(User.email == "a@test.uz").first()
    tok = new_token()
    db.add(EmailVerificationToken(user_id=user.id, token_hash=hash_token(tok), expires_at=now_utc() - timedelta(minutes=1)))
    db.commit()
    assert client.post("/api/v1/auth/verify-email", json={"token": tok}).status_code == 400


def test_password_reset_flow(client, make_user, db):
    make_user("a@test.uz")
    user = db.query(User).filter(User.email == "a@test.uz").first()
    assert client.post("/api/v1/auth/forgot-password", json={"email": "a@test.uz"}).status_code == 200
    assert client.post("/api/v1/auth/forgot-password", json={"email": "yoq@test.uz"}).status_code == 200  # oshkor qilmaydi
    tok = new_token()
    db.add(PasswordResetToken(user_id=user.id, token_hash=hash_token(tok), expires_at=now_utc() + timedelta(minutes=30)))
    db.commit()
    r = client.post("/api/v1/auth/reset-password", json={"token": tok, "password": "Yangi12345", "password_confirm": "Boshqa12345"})
    assert r.status_code == 422
    r = client.post("/api/v1/auth/reset-password", json={"token": tok, "password": "Yangi12345", "password_confirm": "Yangi12345"})
    assert r.status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": "a@test.uz", "password": "Parol12345"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "a@test.uz", "password": "Yangi12345"}).status_code == 200
    assert client.post("/api/v1/auth/reset-password", json={"token": tok, "password": "Yangi12345", "password_confirm": "Yangi12345"}).status_code == 400


def test_lockout_after_failed_logins(client, make_user):
    make_user("a@test.uz")
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json={"email": "a@test.uz", "password": "xxxxxxxx1"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "a@test.uz", "password": "Parol12345"}).status_code == 429


def test_refresh_rotation_and_reuse_detection(client):
    r = client.post("/api/v1/auth/register", json={"email": "a@test.uz", "password": "Parol12345", "full_name": "X Y", "role": "parent"})
    old = r.json()["refresh_token"]
    client.cookies.clear()
    r2 = client.post("/api/v1/auth/refresh", headers={"X-Refresh-Token": old})
    assert r2.status_code == 200
    client.cookies.clear()
    assert client.post("/api/v1/auth/refresh", headers={"X-Refresh-Token": old}).status_code == 401  # qayta ishlatish
    client.cookies.clear()
    assert client.post("/api/v1/auth/refresh", headers={"X-Refresh-Token": r2.json()["refresh_token"]}).status_code == 401  # hammasi bekor


def test_unauthenticated_blocked(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/children").status_code == 401


def test_csrf_header_required_with_cookie(client):
    client.post("/api/v1/auth/register", json={"email": "a@test.uz", "password": "Parol12345", "full_name": "X Y", "role": "parent"})
    assert client.cookies.get("access_token")
    r = client.post("/api/v1/children", json={"first_name": "A", "last_name": "B", "birth_date": "2022-01-01"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "csrf"
    r = client.post("/api/v1/children", json={"first_name": "A", "last_name": "B", "birth_date": "2022-01-01"}, headers={"X-Requested-With": "bogcha"})
    assert r.status_code == 201


def test_login_by_phone_and_remember_cookie(client, make_user, db):
    make_user("ph@test.uz")
    u = db.query(User).filter(User.email == "ph@test.uz").first()
    u.phone = "+998901234567"
    db.commit()
    client.cookies.clear()
    r = client.post("/api/v1/auth/login", json={"identifier": "90 123 45 67", "password": "Parol12345", "remember": False})
    assert r.status_code == 200
    sc = r.headers.get_list("set-cookie")
    rt = [c for c in sc if c.startswith("refresh_token=")][0]
    assert "Max-Age" not in rt and "max-age" not in rt.lower()  # sessiya cookie'si
    client.cookies.clear()
    r = client.post("/api/v1/auth/login", json={"identifier": "ph@test.uz", "password": "Parol12345", "remember": True})
    assert r.status_code == 200
    assert any("remember=1" in c for c in r.headers.get_list("set-cookie"))
    client.cookies.clear()
    r = client.post("/api/v1/auth/login", json={"identifier": "+998909999999", "password": "Parol12345"})
    assert r.status_code == 401
