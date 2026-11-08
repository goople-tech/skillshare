"""Disposable-backend policy for the older singleton and isolated API tests.

The original suites all use the application's singleton engine. Once each one
starts, recreate only that engine's disposable database and recreate normal
startup tables; do not let its records become another suite's fixture.
"""
import os
import tempfile
from pathlib import Path

import pytest
from fastapi import Header

TEST_DATABASE_PATH = Path(tempfile.mkdtemp()) / "legacy-api-tests.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DATABASE_PATH}"
LEGACY_MODULES = {"test_profiles", "test_presence", "test_swipe", "test_skillshare", "test_search_and_privacy"}


def reset_legacy_engine():
    from app import database
    from app.main import Base, _add_missing_profile_columns

    database.engine.dispose()
    database.engine = database.create_engine(
        f"sqlite:///{TEST_DATABASE_PATH}", connect_args={"check_same_thread": False},
    )
    Base.metadata.drop_all(bind=database.engine)
    Base.metadata.create_all(bind=database.engine)
    _add_missing_profile_columns()
    from sqlalchemy.orm import sessionmaker
    database.SessionLocal = sessionmaker(bind=database.engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def isolate_test_identity(request):
    from app import auth
    from app.main import app
    previous = app.dependency_overrides.get(auth.current_email)

    def current_email(x_test_verified_email: str = Header(default="test@student.ubc.ca", alias="X-Test-Verified-Email")):
        return x_test_verified_email

    if request.node.module.__name__ in LEGACY_MODULES:
        reset_legacy_engine()
    app.dependency_overrides[auth.current_email] = current_email
    yield
    if previous is None:
        app.dependency_overrides.pop(auth.current_email, None)
    else:
        app.dependency_overrides[auth.current_email] = previous
