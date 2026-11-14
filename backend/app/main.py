import asyncio
import logging
import os
from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import admin, applications, auth, catalog, chat, files, notifications, parents, provider_manage, provider_ops, reviews
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.errors import install_error_handlers
from app.middleware.security import CSRFMiddleware, RateLimitMiddleware, SecurityHeadersMiddleware
from app.workers.tasks import start_background

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    tasks: list[asyncio.Task] = []
    start_background(tasks)
    yield
    for t in tasks:
        t.cancel()


app = FastAPI(title="Kichkintoy API", version="1.0.0", lifespan=lifespan,
              docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")
install_error_handlers(app)

# Middleware tartibi: oxirida qo'shilgani birinchi ishlaydi
app.add_middleware(CSRFMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                   allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Refresh-Token", "X-Request-ID"])

api = APIRouter(prefix="/api/v1")
for r in (auth.router, catalog.router, parents.router, provider_manage.router, provider_ops.router, applications.router,
          chat.router, notifications.router, reviews.router, files.router, admin.router):
    api.include_router(r)
app.include_router(api)

# Lokal rejimda ochiq rasmlar (faqat 'media' bucket; hujjatlar hech qachon static berilmaydi)
_media = os.path.join(settings.LOCAL_UPLOAD_DIR, settings.STORAGE_BUCKET_PUBLIC)
if not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY):
    os.makedirs(_media, exist_ok=True)
    app.mount(f"/media/{settings.STORAGE_BUCKET_PUBLIC}", StaticFiles(directory=_media), name="media")


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def root():
    return {"name": "Kichkintoy API", "docs": "/api/docs"}


@app.get("/ready", include_in_schema=False)
def ready():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ready"}
