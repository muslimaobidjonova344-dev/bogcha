import logging
from datetime import timedelta
import pyotp
from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.database import get_db
from app.core.deps import client_ip, get_current_user
from app.core.errors import AppError, Conflict, Unauthorized
from app.core.security import (hash_password, hash_token, now_utc, otp_code, validate_password_strength,
                               verify_password)
from app.models import (EmailVerificationToken, OtpCode, ParentProfile, PasswordResetToken, Provider, User,
                        UserSession)
from app.schemas.auth import *  # noqa
from app.schemas.common import Msg
from app.core.config import settings
from app.services import auth as auth_svc, email as email_svc, google_auth as google_svc, sms as sms_svc
from app.services.audit import audit

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger("auth")


def _login_response(db: Session, user: User, request: Request, resp: Response, remember: bool = True) -> dict:
    access, refresh = auth_svc.issue_session(db, user, client_ip(request), request.headers.get("user-agent"))
    db.commit()
    set_auth_cookies(resp, access, refresh, remember)
    # access/refresh ham qaytariladi: mobil ilovalar (Bearer) uchun
    return {"user": UserOut.model_validate(user), "access_token": access, "refresh_token": refresh}


def _send_verification(user_id: str, name: str, email: str, token: str):
    try:
        email_svc.send_verification_email(email, name, token)
    except Exception:
        log.exception("Tasdiqlash emaili yuborilmadi")


@router.post("/register", status_code=201)
def register(data: RegisterIn, request: Request, resp: Response, bg: BackgroundTasks, db: Session = Depends(get_db)):
    err = validate_password_strength(data.password)
    if err:
        raise AppError(err, 422, "weak_password")
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise Conflict("Bu email allaqachon ro'yxatdan o'tgan")
    if data.phone and db.query(User).filter(User.phone == data.phone).first():
        raise Conflict("Bu telefon raqami band")
    user = User(email=email, phone=data.phone, password_hash=hash_password(data.password),
                role=data.role, full_name=data.full_name.strip())
    db.add(user)
    db.flush()
    if data.role == "parent":
        db.add(ParentProfile(user_id=user.id))
        user.profile_completed = True
    else:
        ptype = "kindergarten" if data.role == "kindergarten_admin" else "tutor"
        db.add(Provider(type=ptype, owner_user_id=user.id, name=data.provider_name or data.full_name,
                        phone=data.phone, email=email, verification_status="pending"))
    token = auth_svc.create_email_token(db, user)
    audit(db, user.id, "auth.register", "user", user.id, {"role": data.role}, client_ip(request))
    out = _login_response(db, user, request, resp)
    bg.add_task(_send_verification, user.id, user.full_name, email, token)
    return out


@router.get("/providers")
def auth_providers():
    """Frontend qaysi kirish usullari yoqilganini shu yerdan biladi (qayta build shart emas)."""
    return {"google_client_id": settings.GOOGLE_CLIENT_ID or None}


@router.post("/google")
def google_login(data: GoogleIn, request: Request, resp: Response, db: Session = Depends(get_db)):
    info = google_svc.verify_id_token(data.credential)
    user = db.query(User).filter(User.email == info["email"], User.deleted_at.is_(None)).first()
    if user:
        if not user.is_active:
            raise AppError(user.blocked_reason or "Hisobingiz bloklangan", 403, "blocked")
        if user.totp_enabled:
            raise AppError("Bu hisobda 2FA yoqilgan. Email va parol bilan kiring", 403, "use_password")
        if not user.email_verified:
            user.email_verified = True  # Google emailni allaqachon tasdiqlagan
    else:
        if not data.role:
            # yangi foydalanuvchi: frontend rol tanlatib, qayta yuboradi
            raise AppError("Hisob turini tanlang", 409, "role_required")
        if data.role == "kindergarten_admin" and not (data.provider_name and data.provider_name.strip()):
            raise AppError("Bog'cha nomini kiriting", 422, "provider_name_required")
        user = User(email=info["email"], password_hash=None, role=data.role, full_name=info["name"][:150],
                    email_verified=True, avatar_url=info.get("picture"))
        db.add(user)
        db.flush()
        if data.role == "parent":
            db.add(ParentProfile(user_id=user.id))
            user.profile_completed = True
        else:
            ptype = "kindergarten" if data.role == "kindergarten_admin" else "tutor"
            db.add(Provider(type=ptype, owner_user_id=user.id, name=(data.provider_name or info["name"]).strip(),
                            email=info["email"], verification_status="pending"))
        audit(db, user.id, "auth.register_google", "user", user.id, {"role": data.role}, client_ip(request))
    user.last_login_at = now_utc()
    audit(db, user.id, "auth.login_google", "user", user.id, ip=client_ip(request))
    return _login_response(db, user, request, resp, data.remember)


@router.post("/verify-email", response_model=Msg)
def verify_email(data: TokenIn, db: Session = Depends(get_db)):
    t = db.query(EmailVerificationToken).filter(EmailVerificationToken.token_hash == hash_token(data.token)).first()
    if not t or t.used_at or t.expires_at < now_utc():
        raise AppError("Havola yaroqsiz yoki muddati tugagan. Qayta yuborishni so'rang", 400, "invalid_token")
    t.used_at = now_utc()
    user = db.get(User, t.user_id)
    user.email_verified = True
    audit(db, user.id, "auth.email_verified", "user", user.id)
    db.commit()
    return Msg(message="Email tasdiqlandi")


@router.post("/resend-verification", response_model=Msg)
def resend_verification(data: EmailIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if user and not user.email_verified:
        last = db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id) \
            .order_by(EmailVerificationToken.created_at.desc()).first()
        if last and last.created_at > now_utc() - timedelta(seconds=60):
            raise AppError("Iltimos, 1 daqiqadan so'ng qayta urinib ko'ring", 429, "too_soon")
        token = auth_svc.create_email_token(db, user)
        db.commit()
        bg.add_task(_send_verification, user.id, user.full_name, user.email, token)
    return Msg(message="Agar email ro'yxatdan o'tgan bo'lsa, tasdiqlash xati yuborildi")


@router.post("/login")
def login(data: LoginIn, request: Request, resp: Response, db: Session = Depends(get_db)):
    user = auth_svc.check_login(db, data.login_id, data.password)
    if user.totp_enabled:
        if not data.totp_code:
            db.commit()
            raise AppError("2FA kodi kerak", 401, "totp_required")
        if not pyotp.TOTP(user.totp_secret).verify(data.totp_code, valid_window=1):
            db.commit()
            raise AppError("2FA kodi noto'g'ri", 401, "totp_invalid")
    audit(db, user.id, "auth.login", "user", user.id, ip=client_ip(request))
    return _login_response(db, user, request, resp, data.remember)


@router.post("/refresh")
def refresh(request: Request, resp: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        auth = request.headers.get("x-refresh-token")
        token = auth
    if not token:
        raise Unauthorized("Sessiya topilmadi")
    user, access, new_refresh = auth_svc.rotate_refresh(db, token)
    db.commit()
    set_auth_cookies(resp, access, new_refresh, request.cookies.get("remember") == "1")
    return {"user": UserOut.model_validate(user), "access_token": access, "refresh_token": new_refresh}


@router.post("/logout", response_model=Msg)
def logout(request: Request, resp: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token") or request.headers.get("x-refresh-token")
    if token:
        s = db.query(UserSession).filter(UserSession.refresh_hash == hash_token(token)).first()
        if s and not s.revoked_at:
            s.revoked_at = now_utc()
            db.commit()
    clear_auth_cookies(resp)
    return Msg(message="Chiqildi")


@router.get("/ws-token")
def ws_token(request: Request, user: User = Depends(get_current_user)):
    """WebSocket to'g'ridan-to'g'ri backendga ulanganda (boshqa domen) cookie yuborilmaydi: shu token ishlatiladi."""
    from app.core.deps import _extract_token
    return {"token": _extract_token(request)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.phone and data.phone != user.phone:
        if db.query(User).filter(User.phone == data.phone, User.id != user.id).first():
            raise Conflict("Bu telefon raqami band")
        user.phone, user.phone_verified = data.phone, False
    for f in ("full_name", "avatar_url", "language"):
        v = getattr(data, f)
        if v is not None:
            setattr(user, f, v)
    if data.notification_prefs is not None:
        user.notification_prefs = data.notification_prefs
    db.commit()
    return user


@router.post("/forgot-password", response_model=Msg)
def forgot_password(data: EmailIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower(), User.deleted_at.is_(None)).first()
    if user and user.is_active:
        token = auth_svc.create_reset_token(db, user)
        db.commit()
        bg.add_task(email_svc.send_password_reset_email, user.email, user.full_name, token)
    # emailning mavjudligini oshkor qilmaymiz
    return Msg(message="Agar email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi")


@router.post("/reset-password", response_model=Msg)
def reset_password(data: ResetIn, db: Session = Depends(get_db)):
    err = validate_password_strength(data.password)
    if err:
        raise AppError(err, 422, "weak_password")
    t = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == hash_token(data.token)).first()
    if not t or t.used_at or t.expires_at < now_utc():
        raise AppError("Havola yaroqsiz yoki muddati tugagan", 400, "invalid_token")
    user = db.get(User, t.user_id)
    user.password_hash = hash_password(data.password)
    t.used_at = now_utc()
    db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.revoked_at.is_(None)) \
        .update({"revoked_at": now_utc()})
    audit(db, user.id, "auth.password_reset", "user", user.id)
    db.commit()
    return Msg(message="Parol yangilandi. Endi tizimga kirishingiz mumkin")


@router.post("/change-password", response_model=Msg)
def change_password(data: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.password_hash or not verify_password(data.old_password, user.password_hash):
        raise AppError("Eski parol noto'g'ri", 400, "bad_password")
    err = validate_password_strength(data.new_password)
    if err:
        raise AppError(err, 422, "weak_password")
    user.password_hash = hash_password(data.new_password)
    audit(db, user.id, "auth.password_changed", "user", user.id)
    db.commit()
    return Msg(message="Parol o'zgartirildi")


# ---------- Telefon OTP ----------
@router.post("/phone/request-otp", response_model=Msg)
def request_otp(data: PhoneIn, db: Session = Depends(get_db)):
    last = db.query(OtpCode).filter(OtpCode.phone == data.phone).order_by(OtpCode.created_at.desc()).first()
    if last and last.created_at > now_utc() - timedelta(seconds=60):
        raise AppError("Kodni 1 daqiqadan so'ng qayta so'rang", 429, "too_soon")
    code = otp_code()
    db.add(OtpCode(phone=data.phone, code_hash=hash_token(code + data.phone),
                   expires_at=now_utc() + timedelta(minutes=5)))
    db.commit()
    if not sms_svc.send_sms(data.phone, f"Kichkintoy tasdiqlash kodi: {code}"):
        raise AppError("SMS xizmati sozlanmagan. Administrator SMS_PROVIDER ni sozlashi kerak", 503, "sms_unavailable")
    return Msg(message="Tasdiqlash kodi yuborildi")


@router.post("/phone/verify-otp")
def verify_otp(data: PhoneVerifyIn, request: Request, resp: Response, db: Session = Depends(get_db)):
    otp = db.query(OtpCode).filter(OtpCode.phone == data.phone, OtpCode.used_at.is_(None)) \
        .order_by(OtpCode.created_at.desc()).first()
    if not otp or otp.expires_at < now_utc() or otp.attempts >= 5:
        raise AppError("Kod yaroqsiz yoki muddati tugagan", 400, "invalid_otp")
    otp.attempts += 1
    if otp.code_hash != hash_token(data.code + data.phone):
        db.commit()
        raise AppError("Kod noto'g'ri", 400, "invalid_otp")
    otp.used_at = now_utc()
    user = db.query(User).filter(User.phone == data.phone, User.deleted_at.is_(None)).first()
    if not user:
        db.commit()
        raise AppError("Bu telefon raqami ro'yxatdan o'tmagan. Avval email bilan ro'yxatdan o'ting", 404, "not_found")
    if not user.is_active:
        raise AppError(user.blocked_reason or "Hisobingiz bloklangan", 403, "blocked")
    user.phone_verified = True
    user.last_login_at = now_utc()
    return _login_response(db, user, request, resp)


# ---------- 2FA (TOTP) ----------
@router.post("/2fa/setup")
def totp_setup(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = pyotp.random_base32()
    user.totp_secret = secret
    user.totp_enabled = False
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email or user.id, issuer_name="Kichkintoy")
    return {"secret": secret, "otpauth_uri": uri}


@router.post("/2fa/enable", response_model=Msg)
def totp_enable(data: TotpEnableIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.totp_secret or not pyotp.TOTP(user.totp_secret).verify(data.code, valid_window=1):
        raise AppError("Kod noto'g'ri", 400, "totp_invalid")
    user.totp_enabled = True
    audit(db, user.id, "auth.2fa_enabled", "user", user.id)
    db.commit()
    return Msg(message="2FA yoqildi")


@router.post("/2fa/disable", response_model=Msg)
def totp_disable(data: TotpEnableIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "super_admin":
        raise AppError("Super Admin uchun 2FA o'chirib bo'lmaydi", 403, "forbidden")
    if not user.totp_enabled or not pyotp.TOTP(user.totp_secret).verify(data.code, valid_window=1):
        raise AppError("Kod noto'g'ri", 400, "totp_invalid")
    user.totp_enabled, user.totp_secret = False, None
    audit(db, user.id, "auth.2fa_disabled", "user", user.id)
    db.commit()
    return Msg(message="2FA o'chirildi")


@router.get("/sessions")
def sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.revoked_at.is_(None),
                                        UserSession.expires_at > now_utc()).all()
    return [{"id": s.id, "ip": s.ip, "user_agent": s.user_agent, "created_at": s.created_at} for s in rows]


@router.delete("/sessions/{sid}", response_model=Msg)
def revoke_session(sid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(UserSession, sid)
    if s and s.user_id == user.id:
        s.revoked_at = now_utc()
        db.commit()
    return Msg(message="Sessiya yopildi")
