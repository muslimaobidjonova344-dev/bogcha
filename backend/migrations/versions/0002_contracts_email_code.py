"""Shartnomalar jadvali va email kodi urinishlari

Revision ID: 0002
Revises: 0001
"""
import sqlalchemy as sa
from alembic import op
from app.core.database import Base
import app.models  # noqa: F401

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)  # yangi jadvallar (contracts)
    cols = {c["name"] for c in sa.inspect(bind).get_columns("email_verification_tokens")}
    if "attempts" not in cols:
        op.add_column("email_verification_tokens", sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("email_verification_tokens", "attempts")
    op.drop_table("contracts")
