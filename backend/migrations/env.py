from logging.config import fileConfig
from alembic import context
from sqlalchemy import create_engine, pool
from app.core.config import settings
from app.core.database import Base
import app.models  # noqa: F401  (barcha jadvallar metadata'ga yuklansin)

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(url=settings.sqlalchemy_url, target_metadata=target_metadata, literal_binds=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    kwargs = {"poolclass": pool.NullPool}
    if not settings.sqlalchemy_url.startswith("sqlite"):
        kwargs["connect_args"] = {"prepare_threshold": None}
    engine = create_engine(settings.sqlalchemy_url, **kwargs)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
