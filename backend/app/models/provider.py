from datetime import date, datetime, time
from app.core.types import UTCDateTime
from sqlalchemy import (JSON, Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String,
                        Text, Time, UniqueConstraint, CheckConstraint)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.mixins import IdMixin, SoftDeleteMixin, TimestampMixin, utcnow

VERIFICATION = ("pending", "under_review", "approved", "rejected", "suspended")


class Provider(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "providers"
    __table_args__ = (Index("ix_providers_search", "type", "verification_status", "region_id", "district_id"),)
    type: Mapped[str] = mapped_column(String(20), index=True)  # kindergarten | tutor
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    short_description: Mapped[str] = mapped_column(String(300), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    region_id: Mapped[int | None] = mapped_column(ForeignKey("regions.id"), nullable=True)
    district_id: Mapped[int | None] = mapped_column(ForeignKey("districts.id"), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    work_days: Mapped[list] = mapped_column(JSON, default=list)  # [1..7]
    work_open: Mapped[time | None] = mapped_column(Time, nullable=True)
    work_close: Mapped[time | None] = mapped_column(Time, nullable=True)
    # bog'cha
    ownership: Mapped[str | None] = mapped_column(String(10), nullable=True)  # state | private
    meal_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    monthly_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # UZS
    min_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amenities: Mapped[list] = mapped_column(JSON, default=list)
    gallery: Mapped[list] = mapped_column(JSON, default=list)
    # repetitor
    specialty: Mapped[str | None] = mapped_column(String(200), nullable=True)
    education_degree: Mapped[str | None] = mapped_column(String(100), nullable=True)
    education_institution: Mapped[str | None] = mapped_column(String(200), nullable=True)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    teaching_style: Mapped[str | None] = mapped_column(Text, nullable=True)
    intro_video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lesson_mode: Mapped[str | None] = mapped_column(String(10), nullable=True)  # online|offline|both
    service_area: Mapped[str | None] = mapped_column(String(300), nullable=True)
    languages: Mapped[list] = mapped_column(JSON, default=list)
    hourly_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # tasdiqlash va reyting (reyting faqat backendda hisoblanadi)
    verification_status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    verification_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)


class ProviderDocument(Base, IdMixin):
    __tablename__ = "provider_documents"
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    doc_type: Mapped[str] = mapped_column(String(50))  # license | diploma | certificate | id | other
    title: Mapped[str] = mapped_column(String(200), default="")
    file_id: Mapped[str] = mapped_column(ForeignKey("uploaded_files.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    review_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class KindergartenGroup(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "kindergarten_groups"
    __table_args__ = (CheckConstraint("current_count >= 0 AND current_count <= capacity", name="ck_group_capacity"),)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    min_age: Mapped[int] = mapped_column(Integer, default=3)
    max_age: Mapped[int] = mapped_column(Integer, default=6)
    capacity: Mapped[int] = mapped_column(Integer, default=20)
    current_count: Mapped[int] = mapped_column(Integer, default=0)
    teacher_id: Mapped[str | None] = mapped_column(ForeignKey("kindergarten_staff.id"), nullable=True)
    schedule_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    meal_type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    extra_services: Mapped[list] = mapped_column(JSON, default=list)
    monthly_price: Mapped[int | None] = mapped_column(Integer, nullable=True)

    @property
    def free_places(self) -> int:  # bo'sh joy = sig'im - hozirgi bolalar
        return max(self.capacity - self.current_count, 0)


class KindergartenStaff(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "kindergarten_staff"
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    position: Mapped[str] = mapped_column(String(100), default="Tarbiyachi")
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class TutorSubject(Base, IdMixin):
    __tablename__ = "tutor_subjects"
    __table_args__ = (UniqueConstraint("provider_id", "subject"),)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    subject: Mapped[str] = mapped_column(String(100), index=True)


class TutorService(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tutor_services"
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    subject: Mapped[str] = mapped_column(String(100), index=True)
    education_level: Mapped[str] = mapped_column(String(60))  # maktabgacha, 1-4, 5-9, 10-11, abituriyent
    grades: Mapped[list] = mapped_column(JSON, default=list)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    format: Mapped[str] = mapped_column(String(10), default="individual")  # individual | group
    mode: Mapped[str] = mapped_column(String(10), default="offline")  # online | offline
    price: Mapped[int] = mapped_column(Integer)  # UZS
    language: Mapped[str] = mapped_column(String(10), default="uz")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class ProviderSchedule(Base, IdMixin):
    """Haftalik bo'sh vaqt oynalari (Asia/Tashkent mahalliy vaqt)."""
    __tablename__ = "provider_schedules"
    __table_args__ = (CheckConstraint("start_time < end_time", name="ck_sched_range"),)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)  # 1=Dushanba .. 7=Yakshanba
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
