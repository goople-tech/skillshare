"""Projects teammate finder. Auth0 is replaced by a fake verified email.

Run from backend/:  python -m pytest tests/test_projects.py
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


def setup_module():
    make("pj-owner@student.ubc.ca", "Owner", teach="pj-figma")
    make("pj-ana@student.ubc.ca", "Ana", teach="pj-react, pj-figma")
    make("pj-ben@student.ubc.ca", "Ben", teach="pj-fastapi", learn="pj-react")
    make("pj-cy@student.ubc.ca", "Cy", teach="pj-reactnative")


def teardown_module():
    app.dependency_overrides.pop(auth.current_email, None)


def get(*skills, **params):
    login("pj-owner@student.ubc.ca")
    return client.get("/projects/teammates", params={"skills": list(skills), **params})


def names(group):
    return [s["name"] for s in group["students"]]


def test_teammates_grouped_by_skill_in_request_order():
    r = get("pj-react", "pj-fastapi")
    assert r.status_code == 200
    body = r.json()
    assert [g["skill"] for g in body] == ["pj-react", "pj-fastapi"]
    assert names(body[0]) == ["Ana"]  # Ben only wants to learn it; Cy's entry is a different skill
    assert names(body[1]) == ["Ben"]


def test_excludes_caller_and_matches_case_and_spaces():
    body = get(" PJ-Figma ").json()
    assert names(body[0]) == ["Ana"]


def test_blank_and_duplicate_skills_are_skipped():
    body = get("", "pj-react", "PJ-REACT").json()
    assert [g["skill"] for g in body] == ["pj-react"]


def test_only_public_fields_returned():
    student = get("pj-react").json()[0]["students"][0]
    assert "email" not in student and "photo" not in student


def test_unknown_skill_returns_empty_group():
    assert get("pj-nobody-teaches-this").json() == [{"skill": "pj-nobody-teaches-this", "students": []}]


def test_too_many_skills_rejected():
    assert get(*[f"pj-s{i}" for i in range(7)]).status_code == 422


def test_requires_login():
    app.dependency_overrides.pop(auth.current_email, None)
    try:
        assert client.get("/projects/teammates", params={"skills": ["pj-react"]}).status_code in (401, 403)
    finally:
        login("pj-owner@student.ubc.ca")
