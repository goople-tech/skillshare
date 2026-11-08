import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

# SQLite by default (zero setup). Set DATABASE_URL to switch to Postgres — no code changes needed.
DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./ubchub.db"
# Hosted Postgres providers (Tiger Data, Heroku, ...) hand out "postgres://" or "postgresql://" URLs.
# Name the driver we install (psycopg2) so SQLAlchemy doesn't look for a different one.
for _prefix in ("postgres://", "postgresql://"):
    if DATABASE_URL.startswith(_prefix):
        DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len(_prefix):]
        break

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
