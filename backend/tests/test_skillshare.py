"""Skillshare matching tests. Auth0 is replaced by a fake verified email; no network needed.

Run from backend/:  python -m pytest tests
"""
import os
import tempfile

os.environ.setdefault("DATABASE_URL", "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db"))

from fastapi.testclient import TestClient  # noqa: E402

from app import auth  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)
CURRENT = {"email": ""}


def login(email):
    CURRENT["email"] = email
    app.dependency_overrides[auth.current_email] = lambda: CURRENT["email"]


def make(email, name, teach="", learn=""):
    login(email)
    r = client.post("/users", json={"name": name, "skills_teach": teach, "skills_learn": learn})
    assert r.status_code == 200
    return r.json()


def teardown_module():
    app.dependency_overrides.pop(auth.current_email, None)


def setup_module():
    make("ss-alice@student.ubc.ca", "Alice", teach="Python, piano", learn="guitar, Spanish")
    make("ss-bob@student.ubc.ca", "Bob", teach="guitar", learn="python")            # mutual with Alice
    make("ss-cara@student.ubc.ca", "Cara", teach="Spanish, guitar", learn="cooking")  # one-way, 2 skills
    make("ss-dan@student.ubc.ca", "Dan", teach="chess", learn="piano")              # can't teach Alice anything
    make("ss-eve@student.ubc.ca", "Eve", teach="", learn="")


def test_matches_ranked_mutual_first():
    login("ss-alice@student.ubc.ca")
    r = client.get("/skillshare/matches")
    assert r.status_code == 200
    names = [m["user"]["name"] for m in r.json()]
    assert names == ["Bob", "Cara"]  # Dan can't teach Alice anything, so he's excluded
    bob, cara = r.json()
    assert bob["mutual"] is True and bob["they_teach_me"] == ["guitar"] and bob["i_teach_them"] == ["python"]
    assert cara["mutual"] is False and cara["they_teach_me"] == ["guitar", "spanish"] and cara["i_teach_them"] == []


def test_matching_ignores_case_and_spaces():
    login("ss-bob@student.ubc.ca")
    names = [m["user"]["name"] for m in client.get("/skillshare/matches").json()]
    assert "Alice" in names  # Bob wants "python", Alice teaches " Python"


def test_never_matches_yourself_and_empty_profile_gets_nothing():
    login("ss-eve@student.ubc.ca")
    assert client.get("/skillshare/matches").json() == []
    login("ss-alice@student.ubc.ca")
    matches = client.get("/skillshare/matches").json()
    assert all(m["user"]["name"] != "Alice" for m in matches)
    assert all("email" not in m["user"] for m in matches)  # public match fields only


def test_requires_login():
    app.dependency_overrides.pop(auth.current_email, None)
    try:
        assert client.get("/skillshare/matches").status_code == 401
    finally:
        login("ss-alice@student.ubc.ca")


def test_requires_profile():
    login("ss-nobody@student.ubc.ca")
    assert client.get("/skillshare/matches").status_code == 404


def test_old_user_id_route_is_gone():
    login("ss-alice@student.ubc.ca")
    assert client.get("/skillshare/matches/1").status_code == 404
