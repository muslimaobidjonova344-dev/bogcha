from typing import Callable
from fastapi import Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.errors import Forbidden, Unauthorized
from app.core.security import decode_access_token, now_utc
from app.models import User, UserSession, Provider


def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get("access_token")


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = _extract_token(request)
    if not token:
        return None
    data = decode_access_token(token)
    if not data:
        return None
    sess = db.get(UserSession, data["sid"])
    if not sess or sess.revoked_at or sess.expires_at < now_utc():
        return None
    user = db.get(User, data["sub"])
    if not user or user.deleted_at or not user.is_active:
        return None
    request.state.user_id = user.id
    return user


def get_current_user(user: User | None = Depends(get_current_user_optional)) -> User:
    if not user:
        raise Unauthorized()
    return user


def require_roles(*roles: str) -> Callable:
    """RBAC: backendda majburiy tekshiruv."""
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise Forbidden("Bu amal sizning rolingiz uchun mavjud emas")
        return user
    return dep


def require_verified(user: User = Depends(get_current_user)) -> User:
    if not user.email_verified and not user.phone_verified:
        raise Forbidden("Avval emailingizni tasdiqlang")
    return user


def get_my_provider(user: User = Depends(require_roles("kindergarten_admin", "tutor")),
                    db: Session = Depends(get_db)) -> Provider:
    p = db.query(Provider).filter(Provider.owner_user_id == user.id, Provider.deleted_at.is_(None)).first()
    if not p:
        raise Forbidden("Muassasa profili topilmadi")
    return p


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")
