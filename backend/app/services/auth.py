from datetime import timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.errors import AppError, Unauthorized
from app.core.security import (create_access_token, hash_token, new_token, now_utc, verify_password)
from app.models import (EmailVerificationToken, PasswordResetToken, User, UserSession)

MAX_FAILED = 5
LOCK_MINUTES = 15


def issue_session(db: Session, user: User, ip: str | None, ua: str | None) -> tuple[str, str]:
    refresh = new_token()
    sess = UserSession(user_id=user.id, refresh_hash=hash_token(refresh), ip=ip, user_agent=(ua or "")[:300],
                       expires_at=now_utc() + timedelta(days=settings.REFRESH_TOKEN_DAYS))
    db.add(sess)
    db.flush()
    return create_access_token(user.id, user.role, sess.id), refresh


def rotate_refresh(db: Session, refresh: str) -> tuple[User, str, str]:
    sess = db.query(UserSession).filter(UserSession.refresh_hash == hash_token(refresh)).first()
    if not sess or sess.expires_at < now_utc():
        raise Unauthorized("Sessiya tugagan, qayta kiring")
    if sess.revoked_at:
        # qayta ishlatilgan token -> barcha sessiyalarni bekor qilamiz (o'g'irlanishdan himoya)
        db.query(UserSession).filter(UserSession.user_id == sess.user_id, UserSession.revoked_at.is_(None)) \
            .update({"revoked_at": now_utc()})
        db.commit()
        raise Unauthorized("Sessiya bekor qilingan")
    user = db.get(User, sess.user_id)
    if not user or not user.is_active or user.deleted_at:
        raise Unauthorized("Hisob faol emas")
    sess.revoked_at = now_utc()
    access, new_refresh = issue_session(db, user, sess.ip, sess.user_agent)
    return user, access, new_refresh


def _find_login_user(db: Session, ident: str) -> User | None:
    ident = (ident or "").strip()
    if "@" in ident:
        return db.query(User).filter(User.email == ident.lower(), User.deleted_at.is_(None)).first()
    from app.schemas.auth import norm_phone
    try:
        phone = norm_phone(ident)
    except ValueError:
        return None
    return db.query(User).filter(User.phone == phone, User.deleted_at.is_(None)).first()


def check_login(db: Session, email: str, password: str) -> User:
    user = _find_login_user(db, email)
    generic = AppError("Email/telefon yoki parol noto'g'ri", 401, "invalid_credentials")
    if not user or not user.password_hash:
        raise generic
    if user.locked_until and user.locked_until > now_utc():
        raise AppError("Hisob vaqtincha bloklangan. Birozdan so'ng urinib ko'ring", 429, "locked")
    if not verify_password(password, user.password_hash):
        user.failed_logins += 1
        if user.failed_logins >= MAX_FAILED:
            user.locked_until = now_utc() + timedelta(minutes=LOCK_MINUTES)
            user.failed_logins = 0
        db.commit()
        raise generic
    if not user.is_active:
        raise AppError(user.blocked_reason or "Hisobingiz bloklangan", 403, "blocked")
    user.failed_logins = 0
    user.locked_until = None
    user.last_login_at = now_utc()
    return user


def create_email_token(db: Session, user: User) -> str:
    token = new_token()
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id,
                                            EmailVerificationToken.used_at.is_(None)).update({"used_at": now_utc()})
    db.add(EmailVerificationToken(user_id=user.id, token_hash=hash_token(token),
                                  expires_at=now_utc() + timedelta(minutes=settings.EMAIL_TOKEN_MINUTES)))
    return token


CODE_MAX_ATTEMPTS = 5


def _code_hash(user_id: str, code: str) -> str:
    return hash_token(f"{user_id}:{code}")


def create_email_code(db: Session, user: User) -> str:
    """6 xonali tasdiqlash kodi. Eski kodlar bekor qilinadi; noto'g'ri urinishlar soni cheklanadi."""
    import secrets
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id,
                                            EmailVerificationToken.used_at.is_(None)).update({"used_at": now_utc()})
    db.add(EmailVerificationToken(user_id=user.id, token_hash=_code_hash(user.id, code),
                                  expires_at=now_utc() + timedelta(minutes=settings.EMAIL_TOKEN_MINUTES)))
    return code


def check_email_code(db: Session, user: User, code: str) -> bool:
    t = db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id, EmailVerificationToken.used_at.is_(None)) \
        .order_by(EmailVerificationToken.created_at.desc()).first()
    if not t or t.expires_at < now_utc() or t.attempts >= CODE_MAX_ATTEMPTS:
        return False
    if t.token_hash != _code_hash(user.id, code.strip()):
        t.attempts += 1
        db.commit()
        return False
    t.used_at = now_utc()
    return True


def create_reset_token(db: Session, user: User) -> str:
    token = new_token()
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id,
                                        PasswordResetToken.used_at.is_(None)).update({"used_at": now_utc()})
    db.add(PasswordResetToken(user_id=user.id, token_hash=hash_token(token),
                              expires_at=now_utc() + timedelta(minutes=settings.RESET_TOKEN_MINUTES)))
    return token
