from datetime import date, datetime
from app.core.types import UTCDateTime
from sqlalchemy import (JSON, Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String,
                        Text, UniqueConstraint, CheckConstraint)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.mixins import IdMixin, TimestampMixin, SoftDeleteMixin, utcnow

APP_STATUSES = ("SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED", "INTERVIEW_SCHEDULED",
                "ACCEPTED", "REJECTED", "CANCELLED")


class Application(Base, IdMixin, TimestampMixin):
    __tablename__ = "applications"
    __table_args__ = (Index("ix_app_provider_status", "provider_id", "status"),)
    number: Mapped[str] = mapped_column(String(20), unique=True)
    type: Mapped[str] = mapped_column(String(20))  # kindergarten | tutor
    parent_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("children.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    group_id: Mapped[str | None] = mapped_column(ForeignKey("kindergarten_groups.id"), nullable=True)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("tutor_services.id"), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(30), nullable=True)
    lesson_format: Mapped[str | None] = mapped_column(String(10), nullable=True)
    lesson_mode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    desired_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    desired_slot_start: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    parent_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(25), default="SUBMITTED", index=True)
    provider_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    interview_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class ApplicationHistory(Base, IdMixin):
    __tablename__ = "application_history"
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(25), nullable=True)
    to_status: Mapped[str] = mapped_column(String(25))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class Student(Base, IdMixin, TimestampMixin):
    """Provider qabul qilgan bola/o'quvchi."""
    __tablename__ = "students"
    __table_args__ = (UniqueConstraint("provider_id", "child_id"),)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    child_id: Mapped[str] = mapped_column(ForeignKey("children.id"), index=True)
    parent_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    application_id: Mapped[str | None] = mapped_column(ForeignKey("applications.id"), nullable=True)
    group_id: Mapped[str | None] = mapped_column(ForeignKey("kindergarten_groups.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(15), default="active")  # active | left


class LessonBooking(Base, IdMixin, TimestampMixin):
    """Repetitor vaqtini band qilish. Ustma-ust tushish servisda tekshiriladi, (provider_id, starts_at) esa unique."""
    __tablename__ = "lesson_bookings"
    __table_args__ = (UniqueConstraint("provider_id", "starts_at", name="uq_booking_slot"),
                      CheckConstraint("starts_at < ends_at", name="ck_booking_range"))
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    application_id: Mapped[str | None] = mapped_column(ForeignKey("applications.id"), nullable=True)
    student_id: Mapped[str | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    ends_at: Mapped[datetime] = mapped_column(UTCDateTime())
    status: Mapped[str] = mapped_column(String(15), default="booked")  # booked | cancelled


class Lesson(Base, IdMixin, TimestampMixin):
    __tablename__ = "lessons"
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    booking_id: Mapped[str | None] = mapped_column(ForeignKey("lesson_bookings.id"), nullable=True)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("tutor_services.id"), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    ends_at: Mapped[datetime] = mapped_column(UTCDateTime())
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(15), default="planned")  # planned | done | cancelled
    reminded: Mapped[bool] = mapped_column(Boolean, default=False)


class Review(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("parent_user_id", "provider_id", name="uq_review_once"),
                      CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating"))
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    parent_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(15), default="published")  # published | hidden | flagged
    moderation_note: Mapped[str | None] = mapped_column(String(300), nullable=True)


class ReviewResponse(Base, IdMixin, TimestampMixin):
    __tablename__ = "review_responses"
    review_id: Mapped[str] = mapped_column(ForeignKey("reviews.id"), unique=True)
    responder_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text)


class Favorite(Base, IdMixin):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "provider_id"),)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class Conversation(Base, IdMixin):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("parent_user_id", "provider_id", name="uq_conv_pair"),)
    parent_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    last_message_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class ConversationMember(Base, IdMixin):
    __tablename__ = "conversation_members"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id"),)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    last_read_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class Message(Base, IdMixin):
    __tablename__ = "messages"
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(10), default="text")  # text | image | document
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_id: Mapped[str | None] = mapped_column(ForeignKey("uploaded_files.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, index=True)
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # moderatsiya


class Notification(Base, IdMixin):
    __tablename__ = "notifications"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(String(500), default="")
    link: Mapped[str | None] = mapped_column(String(300), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, index=True)


class PushSubscription(Base, IdMixin):
    __tablename__ = "push_subscriptions"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    endpoint: Mapped[str] = mapped_column(String(600), unique=True)
    keys: Mapped[dict] = mapped_column(JSON, default=dict)


class Report(Base, IdMixin, TimestampMixin):
    __tablename__ = "reports"
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String(20))  # provider | review | message | user
    target_id: Mapped[str] = mapped_column(String(36))
    reason: Mapped[str] = mapped_column(String(60))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(15), default="open", index=True)  # open | resolved | dismissed
    resolved_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)  # subject | amenity | education_level
    name: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint("kind", "name"),)
