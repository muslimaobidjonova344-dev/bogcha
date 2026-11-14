import re
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from app.schemas.common import ORM

PHONE_RE = re.compile(r"^\+998\d{9}$")


def norm_phone(v: str) -> str:
    v = re.sub(r"[\s\-()]", "", v)
    if re.fullmatch(r"\d{9}", v):
        v = "+998" + v
    elif re.fullmatch(r"998\d{9}", v):
        v = "+" + v
    if not PHONE_RE.match(v):
        raise ValueError("Telefon +998XXXXXXXXX formatida bo'lishi kerak")
    return v


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    role: str = Field(pattern="^(parent|kindergarten_admin|tutor)$")
    phone: str | None = None
    provider_name: str | None = Field(default=None, max_length=200)

    @field_validator("phone")
    @classmethod
    def _p(cls, v):
        return norm_phone(v) if v else v


class LoginIn(BaseModel):
    """identifier — email YOKI telefon (+998...). `email` maydoni eski mijozlar uchun saqlangan."""
    identifier: str | None = Field(default=None, max_length=150)
    email: str | None = Field(default=None, max_length=150)
    password: str
    totp_code: str | None = None
    remember: bool = True

    @property
    def login_id(self) -> str:
        return (self.identifier or self.email or "").strip()


class TokenIn(BaseModel):
    token: str


class CodeIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class EmailIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)
    password_confirm: str

    @model_validator(mode="after")
    def _same(self):
        if self.password != self.password_confirm:
            raise ValueError("Parollar bir xil emas")
        return self


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


class PhoneIn(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _p(cls, v):
        return norm_phone(v)


class PhoneVerifyIn(PhoneIn):
    code: str = Field(min_length=6, max_length=6)


class UserOut(ORM):
    id: str
    email: str | None
    phone: str | None
    role: str
    full_name: str
    avatar_url: str | None
    language: str
    email_verified: bool
    phone_verified: bool
    profile_completed: bool
    totp_enabled: bool
    notification_prefs: dict


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    avatar_url: str | None = None
    language: str | None = Field(default=None, pattern="^(uz|ru|en)$")
    notification_prefs: dict | None = None

    @field_validator("phone")
    @classmethod
    def _p(cls, v):
        return norm_phone(v) if v else v


class TotpEnableIn(BaseModel):
    code: str


class GoogleIn(BaseModel):
    credential: str = Field(min_length=20, max_length=4000)  # Google ID token (JWT)
    role: str | None = Field(default=None, pattern="^(parent|kindergarten_admin|tutor)$")
    provider_name: str | None = Field(default=None, max_length=200)
    remember: bool = True
