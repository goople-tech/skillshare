"""Alembic migrations for the FastAPI/SQLAlchemy service.

This first messaging migration intentionally includes only its new tables.
Configure DATABASE_URL through the production owner's existing secret runtime;
no credentials or message data belong in this migration directory.
"""
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.database import Base
from app import models  # noqa: F401 - register the application's shared metadata
from app.messaging import models as messaging_models  # noqa: F401

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def run_migrations() -> None:
    url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    if not url:
        raise RuntimeError("Set DATABASE_URL before running migrations")
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+psycopg2://" + url[len(prefix):]
            break
    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
        connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations()
