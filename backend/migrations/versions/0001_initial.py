"""Boshlang'ich sxema (barcha jadvallar)

Revision ID: 0001
Revises:
"""
from alembic import op
from app.core.database import Base
import app.models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Boshlang'ich sxema modellardan quriladi (checkfirst: mavjud jadvallarga tegmaydi).
    # Keyingi o'zgarishlar: `alembic revision --autogenerate -m "..."`
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
