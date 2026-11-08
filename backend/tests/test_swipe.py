"""Swipe deck tests. Auth0 is replaced by a fake verified email; no network needed.

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
IDS: dict[str, int] = {}


def login(who):
    CURRENT["email"] = f"sw-{who}@student.ubc.ca"
    app.dependency_overrides[auth.current_email] = lambda: CURRENT["email"]


def make(who, **fields):
    login(who)
    r = client.post("/users", json={"name": who.title(), **fields})
    assert r.status_code == 200, r.text
    IDS[who] = r.json()["id"]


def setup_module():
    make("ana", courses="CPSC 213, MATH 200", interests="hiking, chess", skills_teach="sw-python", skills_learn="sw-guitar",
         mode="in_person", energy="low")
    make("ben", courses="cpsc 213", interests="Hiking", skills_teach="sw-guitar", skills_learn="SW-Python",
         mode="in_person", energy="low")                     # strong overlap with Ana in both decks
    make("cai", courses="MATH 200", interests="anime", skills_teach="sw-guitar", mode="online", energy="high")
    make("dev", courses="BIOL 112", interests="cooking", skills_teach="sw-chess", skills_learn="sw-piano",
         mode="online", energy="high")                       # nothing in common with Ana


def teardown_module():
    app.dependency_overrides.pop(auth.current_email, None)


def names(cards):
    return [c["profile"]["name"] for c in cards]


def test_buddy_deck_ranked_by_compatibility_with_reasons():
    login("ana")
    cards = client.get("/swipe/buddy/deck").json()
    mine = [n for n in names(cards) if n in {"Ben", "Cai", "Dev"}]
    assert mine == ["Ben", "Cai", "Dev"]  # compatible first; unrelated people still appear, last
    ben = next(c for c in cards if c["profile"]["name"] == "Ben")
    assert "Also in CPSC 213" in ben["reasons"] and "Into hiking" in ben["reasons"]


def test_cards_hide_private_fields():
    login("ana")
    card = client.get("/swipe/buddy/deck").json()[0]
    assert set(card) == {"profile", "reasons"}
    assert "email" not in card["profile"] and "xp" not in card["profile"] and "photo" not in card["profile"]
    assert "score" not in card and "points" not in card


def test_skill_deck_only_shows_people_with_something_to_swap():
    login("ana")
    cards = client.get("/swipe/skill/deck").json()
    mine = [n for n in names(cards) if n in {"Ben", "Cai", "Dev"}]
    assert mine == ["Ben", "Cai"]  # Ben is a two-way swap, Cai can teach guitar, Dev has nothing for Ana
    assert "Skill swap: you both have something to teach" in cards[names(cards).index("Ben")]["reasons"]


def test_swiped_people_leave_the_deck_only_for_that_deck():
    login("ana")
    assert client.post("/swipe", json={"target_id": IDS["dev"], "kind": "buddy", "direction": "pass"}).json() == {"matched": False, "profile": None}
    assert "Dev" not in names(client.get("/swipe/buddy/deck").json())
    login("dev")
    assert "Ana" in names(client.get("/swipe/buddy/deck").json())  # a pass is private to the swiper


def test_mutual_like_is_a_match_in_the_same_deck_only():
    login("ana")
    first = client.post("/swipe", json={"target_id": IDS["ben"], "kind": "buddy", "direction": "like"}).json()
    assert first["matched"] is False
    login("ben")
    other_deck = client.post("/swipe", json={"target_id": IDS["ana"], "kind": "skill", "direction": "like"}).json()
    assert other_deck["matched"] is False  # a SkillShare like doesn't complete a Buddies like
    back = client.post("/swipe", json={"target_id": IDS["ana"], "kind": "buddy", "direction": "like"}).json()
    assert back["matched"] is True and back["profile"]["name"] == "Ana" and "email" not in back["profile"]
    assert [m["profile"]["name"] for m in client.get("/swipe/matches?kind=buddy").json()] == ["Ana"]
    login("ana")
    assert [(m["kind"], m["profile"]["name"]) for m in client.get("/swipe/matches").json()] == [("buddy", "Ben")]


def test_changing_a_like_to_pass_removes_the_match():
    login("ana")
    client.post("/swipe", json={"target_id": IDS["ben"], "kind": "buddy", "direction": "pass"})
    assert client.get("/swipe/matches").json() == []


def test_invalid_swipes_rejected():
    login("ana")
    assert client.post("/swipe", json={"target_id": IDS["ana"], "kind": "buddy", "direction": "like"}).status_code == 400
    assert client.post("/swipe", json={"target_id": 999999, "kind": "buddy", "direction": "like"}).status_code == 404
    assert client.post("/swipe", json={"target_id": IDS["ben"], "kind": "dating", "direction": "like"}).status_code == 422
    assert client.post("/swipe", json={"target_id": IDS["ben"], "kind": "buddy", "direction": "superlike"}).status_code == 422
    assert client.get("/swipe/rides/deck").status_code == 422


def test_requires_login_and_profile():
    login("nobody")
    assert client.get("/swipe/buddy/deck").status_code == 404
    app.dependency_overrides.pop(auth.current_email, None)
    try:
        assert client.get("/swipe/buddy/deck").status_code == 401
        assert client.post("/swipe", json={"target_id": 1, "kind": "buddy", "direction": "like"}).status_code == 401
    finally:
        login("ana")
