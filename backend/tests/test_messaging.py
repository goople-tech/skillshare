"""Multi-user messaging tests with a fresh SQLite file for every test.

Only FastAPI's verified-email dependency is replaced. Auth0 verification and
settings are unchanged; separate TestClients carry explicit verified identities.
"""
import os
import tempfile

import pytest
from fastapi import Header
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker

from app import auth, models
from app.database import get_db
from app.main import app
from app.messaging import models as chat


def verified_test_email(x_test_verified_email: str = Header(alias="X-Test-Verified-Email")):
    return x_test_verified_email


def test_actual_verified_identity_dependency_is_test_only():
    assert verified_test_email("a@student.ubc.ca") == "a@student.ubc.ca"


@pytest.fixture
def mailbox():
    engine = create_engine(
        "sqlite:///" + os.path.join(tempfile.mkdtemp(), "messages.db"),
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    models.Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    def database():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    old_email, old_db = app.dependency_overrides.get(auth.current_email), app.dependency_overrides.get(get_db)
    app.dependency_overrides[auth.current_email] = verified_test_email
    app.dependency_overrides[get_db] = database
    clients = {}
    for label in ("a", "b", "c", "d"):
        clients[label] = TestClient(app, headers={"X-Test-Verified-Email": f"message-{label}@student.ubc.ca"})
    with Session() as db:
        for label in "abcd":
            db.add(models.User(email=f"message-{label}@student.ubc.ca", name=f"{label.upper()} Example"))
        db.commit()
    # Release this temporary override before the autouse fixture restoration.
    app.dependency_overrides[auth.current_email] = verified_test_email
    yield clients, Session
    app.dependency_overrides.pop(get_db, None)
    if old_email:
        app.dependency_overrides[auth.current_email] = old_email
    if old_db:
        app.dependency_overrides[get_db] = old_db
    for client in clients.values():
        client.close()
    engine.dispose()


def user_id(Session, letter):
    with Session() as db:
        return db.query(models.User).filter_by(name=f"{letter.upper()} Example").one().id


def like(client, target, kind):
    response = client.post("/swipe", json={"target_id": target, "kind": kind, "direction": "like"})
    assert response.status_code == 200, response.text


def pair(clients, Session, first="a", second="b", kind="buddy"):
    target = user_id(Session, second)
    like(clients[first], target, kind)
    like(clients[second], user_id(Session, first), kind)


def ids(clients, kind="buddy"):
    response = clients["a"].get("/conversations", params={"kind": kind})
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store, private"
    return {row["participant"]["name"][0].lower(): row["id"] for row in response.json()}


def test_mutual_read_write_scope_privacy_and_durable_sessions(mailbox):
    clients, Session = mailbox
    a, b, c = clients["a"], clients["b"], clients["c"]
    assert ids(clients) == {}
    like(a, user_id(Session, "b"), "buddy")
    assert ids(clients) == {}, "A one-sided like is not a mailbox connection"

    pair(clients, Session, "a", "b", "buddy")
    pair(clients, Session, "a", "c", "buddy")
    conversations = ids(clients)
    ab, ac = conversations["b"], conversations["c"]
    assert ids(clients) == conversations, "Reconciling matches is idempotent"
    with Session() as db:
        assert db.query(chat.Conversation).count() == 2

    for outsider in (clients["b"], clients["d"]):
        assert outsider.get(f"/conversations/{ac}/messages").status_code == 404
        assert outsider.post(f"/conversations/{ac}/read").status_code == 404
    assert c.get(f"/conversations/{ab}/messages").status_code == 404
    assert c.post(f"/conversations/{ab}/messages", json={"body": "Not allowed"}).status_code == 404

    forged = {"body": "   Hello <b>B</b>  ", "sender_id": user_id(Session, "c"), "conversation_id": ac}
    rejected = a.post(f"/conversations/{ab}/messages", json=forged)
    assert rejected.status_code == 422, rejected.text
    sent = a.post(f"/conversations/{ab}/messages", json={"body": "   Hello <b>B</b>  "})
    assert sent.status_code == 201, sent.text
    message = sent.json()
    assert message["body"] == "Hello <b>B</b>" and message["mine"] is True
    assert message["sender"] == {"id": user_id(Session, "a"), "name": "A Example"}
    assert set(message["sender"]) == {"id", "name"}
    assert message["kind"] == "buddy" and message["conversation_id"] == ab
    assert {"email", "photo", "xp"} & message.keys() == set()

    # New sessions retrieve exactly the committed history, text verbatim.
    history = b.get(f"/conversations/{ab}/messages")
    assert [row for row in history.json()["messages"] if row["id"] == message["id"]] == [
        {**message, "mine": False, "sender": message["sender"]}
    ]
    assert history.headers["cache-control"] == "no-store, private"
    view = b.get("/conversations", params={"kind": "buddy"})
    assert [(row["unread_count"], row["latest_message_preview"]) for row in view.json()] == [(1, "Hello <b>B</b>")]
    assert list(view.json()[0]["participant"]) == ["id", "name"]
    assert a.get("/conversations", params={"kind": "buddy"}).json()[0]["unread_count"] == 0

    reply = b.post(f"/conversations/{ab}/messages", json={"body": "Back at you"}).json()
    assert reply["mine"] is True
    assert b.post(f"/conversations/{ab}/read").json()["unread_count"] == 0
    assert a.get("/conversations", params={"kind": "buddy"}).json()[0]["unread_count"] == 1
    read = a.post(f"/conversations/{ab}/read")
    assert read.status_code == 200 and read.json()["unread_count"] == 0
    # Current-reader only: no peer read receipt is present on either side.
    latest = a.get(f"/conversations/{ab}/messages").json()["messages"][-1]
    assert latest["id"] == reply["id"] and "read" not in latest and "delivered" not in latest
    assert b.get("/conversations", params={"kind": "buddy"}).json()[0]["unread_count"] == 0


def test_cross_kind_never_authorizes_history_and_loss_of_match_closes_mailbox(mailbox):
    clients, Session = mailbox
    a, b = clients["a"], clients["b"]
    pair(clients, Session, kind="buddy")
    pair(clients, Session, kind="skill")
    buddy, skill = (a.get("/conversations", params={"kind": kind}).json()[0]["id"] for kind in ("buddy", "skill"))
    assert buddy != skill
    a.post(f"/conversations/{buddy}/messages", json={"body": "buddy only"})
    assert a.get(f"/conversations/{skill}/messages").json()["messages"] == []
    assert a.get("/conversations", params={"kind": "skill"}).json()[0]["latest_message_preview"] is None
    # Authorize the resource URL by active mutual eligibility, not by trust in a UI kind.
    like(a, user_id(Session, "b"), "buddy")  # fixture helper idempotently likes, now pass explicitly
    a.post("/swipe", json={"target_id": user_id(Session, "b"), "kind": "buddy", "direction": "pass"})
    assert a.get("/conversations", params={"kind": "buddy"}).json() == []
    for method, endpoint in (("get", f"/conversations/{buddy}/messages"), ("post", f"/conversations/{buddy}/read"), ("post", f"/conversations/{buddy}/messages")):
        kwargs = {"json": {"body": "old mailbox cannot be used"}} if endpoint.endswith("messages") and method == "post" else {}
        assert getattr(a, method)(endpoint, **kwargs).status_code == 404
    assert a.get(f"/conversations/{skill}/messages").status_code == 200


def test_payload_bounds_cursor_pagination_and_aggregate_failure_does_not_read(mailbox):
    clients, Session = mailbox
    a, b = clients["a"], clients["b"]
    pair(clients, Session)
    conversation = ids(clients)["b"]
    for body in ("", "   "):
        assert a.post(f"/conversations/{conversation}/messages", json={"body": body}).status_code == 422
    assert a.post(f"/conversations/{conversation}/messages", json={"body": "x" * 2001}).status_code == 422
    assert a.get(f"/conversations/{conversation}/messages?limit=101").status_code == 422
    assert a.get(f"/conversations/{conversation}/messages?before=0").status_code == 422

    sent_ids = [a.post(f"/conversations/{conversation}/messages", json={"body": f"Message {index}"}).json()["id"] for index in range(5)]
    assert sent_ids == sorted(sent_ids) and len(set(sent_ids)) == 5
    # Insert concurrently after fetching the second page: its exclusive before
    # cursor cannot shift the third page or duplicate the first item.
    page = a.get(f"/conversations/{conversation}/messages", params={"limit": 2}).json()
    assert [row["id"] for row in page["messages"]] == sent_ids[-2:]
    older = a.get(f"/conversations/{conversation}/messages", params={"limit": 2, "before": page["next_before"]}).json()
    newest = a.post(f"/conversations/{conversation}/messages", json={"body": "Concurrent tail"}).json()["id"]
    assert [row["id"] for row in older["messages"]] == sent_ids[1:3]
    oldest = a.get(f"/conversations/{conversation}/messages", params={"limit": 2, "before": older["next_before"]}).json()
    assert [row["id"] for row in oldest["messages"]] == sent_ids[:1]
    assert not oldest["has_earlier"] and oldest["next_before"] is None
    assert len(set(sent_ids + [newest])) == 6

    # Getting a list/history does not receive or consume the sender's-sent
    # message read proof. Only this reader's explicit read cursor changes it.
    assert b.get("/conversations", params={"kind": "buddy"}).json()[0]["unread_count"] == 6
    b.get(f"/conversations/{conversation}/messages")
    assert b.get("/conversations", params={"kind": "buddy"}).json()[0]["unread_count"] == 6
    before = b.post(f"/conversations/{conversation}/read").json()
    assert before["last_read_message_id"] == newest and before["unread_count"] == 0

    # Revalidate after an append failure: no read/query side effect and no row.
    with Session() as db:
        count = db.query(chat.Message).count()
    before = b.get("/conversations", params={"kind": "buddy"}).json()[0]
    b.post(f"/conversations/{conversation}/messages", json={"body": " "})
    assert b.get(f"/conversations/{conversation}/messages", params={"limit": 0}).status_code == 422
    assert b.get("/conversations", params={"kind": "buddy"}).json()[0] == before
    with Session() as db:
        assert db.query(chat.Message).count() == count


def test_kind_scope_authentication_profile_and_pair_constraints(mailbox):
    clients, Session = mailbox
    a = clients["a"]
    assert a.get("/conversations").status_code == 422
    assert a.get("/conversations", params={"kind": "public"}).status_code == 422
    app.dependency_overrides.pop(auth.current_email)
    try:
        assert TestClient(app).get("/conversations?kind=buddy").status_code == 401
    finally:
        app.dependency_overrides[auth.current_email] = verified_test_email
    stranger = TestClient(app, headers={"X-Test-Verified-Email": "missing@student.ubc.ca"})
    assert stranger.get("/conversations", params={"kind": "buddy"}).status_code == 404
    with Session() as db:
        db.add(chat.Conversation(participant_low_id=user_id(Session, "a"), participant_high_id=user_id(Session, "a"), kind="buddy"))
        with pytest.raises(Exception):
            db.commit()
        db.rollback()


def test_both_participants_resolve_the_same_normalized_conversation(mailbox):
    clients, Session = mailbox
    pair(clients, Session, "a", "b", "skill")
    a = clients["a"].get("/conversations?kind=skill").json()
    b = clients["b"].get("/conversations?kind=skill").json()
    assert len(a) == len(b) == 1
    assert a[0]["id"] == b[0]["id"]
    assert a[0]["participant"]["id"] == user_id(Session, "b")
    assert b[0]["participant"]["id"] == user_id(Session, "a")


def test_additive_alembic_migration_creates_constraints_and_indexes(tmp_path, monkeypatch):
    from alembic import command
    from alembic.config import Config

    database = tmp_path / "migration.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database}")
    engine = create_engine(f"sqlite:///{database}")
    with engine.begin() as db:
        db.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR NOT NULL, name VARCHAR NOT NULL)"))
    config = Config(os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini"))
    command.upgrade(config, "head")
    inspector = inspect(engine)
    assert {"conversations", "messages"} <= set(inspector.get_table_names())
    with engine.begin() as db:
        db.execute(text("INSERT INTO users (id, email, name) VALUES (1, 'migration-a@student.ubc.ca', 'A'), (2, 'migration-b@student.ubc.ca', 'B')"))
        db.execute(text("INSERT INTO conversations (kind, participant_low_id, participant_high_id, created_at, updated_at) VALUES ('buddy', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"))
        with pytest.raises(Exception):
            db.execute(text("INSERT INTO conversations (kind, participant_low_id, participant_high_id, created_at, updated_at) VALUES ('buddy', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"))
    assert inspector.get_indexes("messages")
    assert len(inspector.get_foreign_keys("conversations")) == 4
