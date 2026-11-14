import time
import uuid
import logging
from collections import defaultdict, deque
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.core.config import settings

log = logging.getLogger("http")
UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Xotirada sliding-window. Bir nechta instansiya bo'lsa Redis bilan almashtiring."""
    def __init__(self, app):
        super().__init__(app)
        self.hits: dict[str, deque] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/health", "/ready") or request.scope["type"] != "http":
            return await call_next(request)
        fwd = request.headers.get("x-forwarded-for")
        ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "x")
        strict = request.url.path.startswith("/api/v1/auth") and request.method == "POST"
        limit = settings.AUTH_RATE_LIMIT_PER_MINUTE if strict else settings.RATE_LIMIT_PER_MINUTE
        key = f"{ip}:{'a' if strict else 'g'}"
        now = time.time()
        q = self.hits[key]
        while q and q[0] < now - 60:
            q.popleft()
        if len(q) >= limit:
            return JSONResponse({"error": {"code": "rate_limited", "message": "So'rovlar juda ko'p. Birozdan so'ng urinib ko'ring"}},
                                status_code=429, headers={"Retry-After": "60"})
        q.append(now)
        if len(self.hits) > 20000:  # xotirani tozalash
            for k in [k for k, v in self.hits.items() if not v or v[-1] < now - 60]:
                self.hits.pop(k, None)
        return await call_next(request)


class CSRFMiddleware(BaseHTTPMiddleware):
    """Cookie bilan autentifikatsiyada o'zgartiruvchi so'rovlar maxsus sarlavhani talab qiladi.
    Brauzer boshqa saytdan bu sarlavhani CORS ruxsatisiz yubora olmaydi."""
    async def dispatch(self, request: Request, call_next):
        if (request.method in UNSAFE and request.url.path.startswith("/api/")
                and "authorization" not in request.headers
                and (request.cookies.get("access_token") or request.cookies.get("refresh_token"))
                and request.headers.get("x-requested-with") != "bogcha"):
            return JSONResponse({"error": {"code": "csrf", "message": "CSRF tekshiruvi muvaffaqiyatsiz"}}, status_code=403)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        start = time.time()
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        log.info("%s %s %s %dms rid=%s uid=%s", request.method, request.url.path, response.status_code,
                 (time.time() - start) * 1000, rid, getattr(request.state, "user_id", "-"))
        return response
