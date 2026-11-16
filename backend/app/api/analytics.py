"""Administrator hisobotlari (diagramma ma'lumotlari)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models import User
from app.services.analytics import admin_analytics

router = APIRouter(prefix="/admin", tags=["admin-analytics"])
admin_only = require_roles("super_admin")


@router.get("/analytics")
def analytics(months: int = Query(6, ge=3, le=12), user: User = Depends(admin_only), db: Session = Depends(get_db)):
    return admin_analytics(db, months)
