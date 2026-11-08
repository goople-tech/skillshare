"""Messaging tests: only matched students can message. No network needed."""
import os
import tempfile

os.environ.setdefault("DATABASE_URL", "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db"))

from fastapi.testclient import TestClient  # noqa: E402

from app import auth  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)
CURRENT = {"email": ""}
IDS: dict[str, int] = {}


def login(who):
    CURRENT["email"] = f"msg-{who}@student.ubc.ca"
    app.dependency_overrides[auth.current_email] = lambda: CURRENT["email"]


def setup_module():
    for who in ("amy", "bo", "cy"):
        login(who)
        IDS[who] = client.post("/users", json={"name": who.title()}).json()["id"]
    login("amy")
    client.post("/swipe", json={"target_id": IDS["bo"], "kind": "buddy", "direction": "like"})
    login("bo")
    client.post("/swipe", json={"target_id": IDS["amy"], "kind": "buddy", "direction": "like"})  # Amy & Bo match
    login("cy")
    client.post("/swipe", json={"target_id": IDS["amy"], "kind": "buddy", "direction": "like"})  # one-way only


def teardown_module():
    app.dependency_overrides.pop(auth.current_email, None)


def test_matched_students_can_message_and_poll():
    login("amy")
    sent = client.post(f"/messages/{IDS['bo']}", json={"body": "  Study at IKB tomorrow?  "})
    assert sent.status_code == 200 and sent.json()["body"] == "Study at IKB tomorrow?" and sent.json()["mine"] is True
    login("bo")
    convo = client.get(f"/messages/{IDS['amy']}").json()
    assert [(m["body"], m["mine"]) for m in convo] == [("Study at IKB tomorrow?", False)]
    reply = client.post(f"/messages/{IDS['amy']}", json={"body": "Yes! 2pm?"}).json()
    login("amy")
    newer = client.get(f"/messages/{IDS['bo']}?after_id={convo[-1]['id']}").json()
    assert [(m["id"], m["body"], m["mine"]) for m in newer] == [(reply["id"], "Yes! 2pm?", False)]


def test_unmatched_or_unknown_people_cannot_be_messaged():
    login("cy")
    assert client.post(f"/messages/{IDS['amy']}", json={"body": "hi"}).status_code == 403  # Amy never liked back
    assert client.get(f"/messages/{IDS['amy']}").status_code == 403
    assert client.post("/messages/999999", json={"body": "hi"}).status_code == 403  # same answer as unmatched
    login("amy")
    assert client.post(f"/messages/{IDS['amy']}", json={"body": "me"}).status_code == 400


def test_third_party_cannot_read_a_conversation():
    login("cy")
    assert client.get(f"/messages/{IDS['bo']}").status_code == 403


def test_message_validation():
    login("amy")
    assert client.post(f"/messages/{IDS['bo']}", json={"body": ""}).status_code == 422
    assert client.post(f"/messages/{IDS['bo']}", json={"body": "   "}).status_code == 422
    assert client.post(f"/messages/{IDS['bo']}", json={"body": "x" * 1001}).status_code == 422


def test_unmatching_stops_messaging():
    login("bo")
    client.post("/swipe", json={"target_id": IDS["amy"], "kind": "buddy", "direction": "pass"})
    assert client.post(f"/messages/{IDS['amy']}", json={"body": "still there?"}).status_code == 403


def test_requires_login():
    app.dependency_overrides.pop(auth.current_email, None)
    try:
        assert client.get(f"/messages/{IDS['amy']}").status_code == 401
    finally:
        login("amy")
