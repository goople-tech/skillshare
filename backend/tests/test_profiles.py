"""Profile endpoint tests. Auth0 is replaced by a fake verified email; no network needed.

Run from backend/:  python -m pytest tests
"""
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from app import auth  # noqa: E402
from app.main import app  # noqa: E402

EMAIL = {"value": "alice@student.ubc.ca"}
app.dependency_overrides[auth.current_email] = lambda: EMAIL["value"]
client = TestClient(app)


def as_user(email):
    EMAIL["value"] = email
    app.dependency_overrides[auth.current_email] = lambda: EMAIL["value"]


def test_create_profile_with_buddy_fields():
    as_user("alice@student.ubc.ca")
    r = client.post("/users", json={"name": "Alice", "interests": "hiking, chess", "mode": "online", "energy": "high"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "alice@student.ubc.ca"
    assert (body["interests"], body["mode"], body["energy"]) == ("hiking, chess", "online", "high")


def test_defaults_when_fields_omitted():
    as_user("bob@student.ubc.ca")
    body = client.post("/users", json={"name": "Bob"}).json()
    assert (body["interests"], body["mode"], body["energy"]) == ("", "either", "medium")


def test_photo_is_optional_and_saved():
    as_user("cara@student.ubc.ca")
    created = client.post("/users", json={"name": "Cara"}).json()
    assert created["photo"] == ""
    saved = client.put("/me", json={"photo": "data:image/jpeg;base64,abc"}).json()
    assert saved["photo"] == "data:image/jpeg;base64,abc"
    assert saved["name"] == "Cara"
    assert client.put("/me", json={"photo": "x" * 400_001}).status_code == 422


def test_partial_update_changes_only_sent_fields():
    as_user("alice@student.ubc.ca")
    r = client.put("/me", json={"energy": "low", "courses": "CPSC 213"})
    assert r.status_code == 200
    body = r.json()
    assert body["energy"] == "low" and body["courses"] == "CPSC 213"
    assert body["mode"] == "online" and body["name"] == "Alice"  # unchanged
    assert client.get("/me").json()["energy"] == "low"  # persisted


def test_invalid_values_rejected():
    as_user("alice@student.ubc.ca")
    assert client.put("/me", json={"mode": "telepathy"}).status_code == 422
    assert client.put("/me", json={"energy": "extreme"}).status_code == 422
    assert client.put("/me", json={"name": ""}).status_code == 422
    assert client.put("/me", json={"name": None}).status_code == 422


def test_email_and_xp_cannot_be_edited():
    as_user("alice@student.ubc.ca")
    body = client.put("/me", json={"email": "evil@student.ubc.ca", "xp": 9999}).json()
    assert body["email"] == "alice@student.ubc.ca" and body["xp"] == 0


def test_update_requires_existing_profile():
    as_user("nobody@student.ubc.ca")
    assert client.put("/me", json={"energy": "high"}).status_code == 404


def test_old_database_gets_new_columns():
    """A users table created before this change gains the columns on startup."""
    import sqlalchemy as sa
    from app import main

    path = os.path.join(tempfile.mkdtemp(), "old.db")
    old = sa.create_engine(f"sqlite:///{path}")
    with old.begin() as c:
        c.execute(sa.text("CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR, name VARCHAR)"))
        c.execute(sa.text("INSERT INTO users (email, name) VALUES ('x@student.ubc.ca', 'X')"))
    original = main.engine
    main.engine = old
    try:
        main._add_missing_profile_columns()
        main._add_missing_profile_columns()  # running twice is safe
    finally:
        main.engine = original
    with old.connect() as c:
        row = c.execute(sa.text("SELECT interests, mode, energy, photo FROM users")).one()
    assert tuple(row) == ("", "either", "medium", "")
