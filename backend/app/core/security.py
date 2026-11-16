import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from app.core.config import settings

# Argon2id (OWASP tavsiyasi: 19 MiB, 2 iteratsiya) — bepul serverda xotira va CPU'ni tejaydi
_ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    try:
        return _ph.check_needs_rehash(hashed)
    except Exception:
        return False


def validate_password_strength(password: str) -> str | None:
    if len(password) < 8:
        return "Parol kamida 8 ta belgidan iborat bo'lishi kerak"
    if not any(c.isdigit() for c in password) or not any(c.isalpha() for c in password):
        return "Parolda harf va raqam bo'lishi kerak"
    return None


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: str, role: str, session_id: str) -> str:
    exp = now_utc() + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    return jwt.encode(
        {"sub": user_id, "role": role, "sid": session_id, "exp": exp, "typ": "access"},
        settings.JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    try:
        data = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return data if data.get("typ") == "access" else None
    except jwt.PyJWTError:
        return None


def otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"
