from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Kichkintoy"
    ENV: str = "development"  # development | production | test
    DATABASE_URL: str = "sqlite:///./dev.db"  # prod: Supabase postgres
    SECRET_KEY: str = "change-me"
    JWT_SECRET: str = "change-me-too"
    ACCESS_TOKEN_MINUTES: int = 30
    REFRESH_TOKEN_DAYS: int = 30
    APP_URL: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = ""  # vergul bilan; bo'sh bo'lsa FRONTEND_URL
    COOKIE_DOMAIN: str = ""
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"  # frontend va backend boshqa domenda bo'lsa: none
    # Email: Google Apps Script veb-ilova
    APPS_SCRIPT_URL: str = ""
    APPS_SCRIPT_SECRET: str = ""
    EMAIL_FROM_NAME: str = "Kichkintoy"
    EMAIL_TOKEN_MINUTES: int = 30
    EMAIL_DEV_ECHO: bool = False  # True bo'lsa (prod emas) register javobida dev_code qaytadi
    RESET_TOKEN_MINUTES: int = 30
    # Google orqali kirish (bepul): console.cloud.google.com -> OAuth Client ID (Web)
    GOOGLE_CLIENT_ID: str = ""
    # Supabase Storage
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    STORAGE_BUCKET_PRIVATE: str = "documents"
    STORAGE_BUCKET_PUBLIC: str = "media"
    LOCAL_UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 8
    # SMS (Eskiz.uz) - ixtiyoriy
    SMS_PROVIDER: str = ""
    ESKIZ_EMAIL: str = ""
    ESKIZ_PASSWORD: str = ""
    # Keep-alive (Render bepul tarifi uxlab qolmasligi uchun)
    SELF_PING_URL: str = ""
    SELF_PING_MINUTES: int = 10
    # Super admin bootstrap
    SUPERADMIN_EMAIL: str = ""
    SUPERADMIN_PASSWORD: str = ""
    RATE_LIMIT_PER_MINUTE: int = 120
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10

    @property
    def is_prod(self) -> bool:
        return self.ENV == "production"

    @property
    def cors_list(self) -> list[str]:
        raw = self.CORS_ORIGINS or self.FRONTEND_URL
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
