import pytest
from fastapi import Header


@pytest.fixture(autouse=True)
def isolate_test_identity():
    from app import auth
    from app.main import app
    previous = app.dependency_overrides.get(auth.current_email)
    def current_email(x_test_verified_email: str = Header(default='test@student.ubc.ca', alias='X-Test-Verified-Email')):
        return x_test_verified_email
    app.dependency_overrides[auth.current_email] = current_email
    yield
    if previous is None:
        app.dependency_overrides.pop(auth.current_email, None)
    else:
        app.dependency_overrides[auth.current_email] = previous
