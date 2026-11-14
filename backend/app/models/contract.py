from datetime import date, datetime
from app.core.types import UTCDateTime
from sqlalchemy import JSON, Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.mixins import IdMixin, TimestampMixin

CONTRACT_STATUSES = ("sent", "active", "cancelled")


class Contract(Base, IdMixin, TimestampMixin):
    """Ota-ona va muassasa (bog'cha/repetitor) o'rtasidagi shartnoma. Ariza ACCEPTED bo'lgach yaratiladi.
    sent — muassasa imzolagan, ota-ona imzosi kutilmoqda; active — ikkala tomon imzolagan."""
    __tablename__ = "contracts"
    number: Mapped[str] = mapped_column(String(24), unique=True)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), unique=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    parent_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("children.id"))
    kind: Mapped[str] = mapped_column(String(20))
    price: Mapped[int] = mapped_column(Integer)
    price_unit: Mapped[str] = mapped_column(String(10), default="month")  # month | lesson
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    terms: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(15), default="sent", index=True)
    provider_signed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    provider_signed_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    parent_signed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    parent_signed_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
