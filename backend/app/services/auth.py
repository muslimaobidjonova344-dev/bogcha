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


def check_login(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.lower(), User.deleted_at.is_(None)).first()
    generic = AppError("Email yoki parol noto'g'ri", 401, "invalid_credentials")
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


def create_reset_token(db: Session, user: User) -> str:
    token = new_token()
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id,
                                        PasswordResetToken.used_at.is_(None)).update({"used_at": now_utc()})
    db.add(PasswordResetToken(user_id=user.id, token_hash=hash_token(token),
                              expires_at=now_utc() + timedelta(minutes=settings.RESET_TOKEN_MINUTES)))
    return token
