from fastapi import Response
from app.core.config import settings


def set_auth_cookies(resp: Response, access: str, refresh: str, remember: bool = True):
    """remember=False -> refresh cookie sessiya cookie'si (brauzer yopilganda o'chadi)."""
    common = dict(httponly=True, secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                  domain=settings.COOKIE_DOMAIN or None)
    resp.set_cookie("access_token", access, max_age=settings.ACCESS_TOKEN_MINUTES * 60, path="/", **common)
    resp.set_cookie("refresh_token", refresh, max_age=settings.REFRESH_TOKEN_DAYS * 86400 if remember else None,
                    path="/api/v1/auth", **common)
    # "eslab qolish" belgisi: refresh rotatsiyasida ham saqlanishi uchun
    if remember:
        resp.set_cookie("remember", "1", max_age=settings.REFRESH_TOKEN_DAYS * 86400, path="/api/v1/auth", **common)
    else:
        resp.delete_cookie("remember", path="/api/v1/auth", domain=settings.COOKIE_DOMAIN or None)


def clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/", domain=settings.COOKIE_DOMAIN or None)
    resp.delete_cookie("refresh_token", path="/api/v1/auth", domain=settings.COOKIE_DOMAIN or None)
    resp.delete_cookie("remember", path="/api/v1/auth", domain=settings.COOKIE_DOMAIN or None)
