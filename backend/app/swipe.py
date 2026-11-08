"""Buddies / SkillShare swipe decks.

Cards are ordered by compatibility only (shared courses, interests, skills and
meeting preferences). There is no popularity or "desirability" rating, and no
numeric score leaves the server: cards carry plain-language reasons instead.
A mutual like in the same deck is a match.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import current_user
from .database import get_db

router = APIRouter(prefix="/swipe", tags=["swipe"])

_ENERGY_ORDER = {"low": 0, "medium": 1, "high": 2}


def _items(value: str) -> dict[str, str]:
    """'CPSC 213, Hiking' -> {'cpsc 213': 'CPSC 213', 'hiking': 'Hiking'} (lowercase key, original label)."""
    out: dict[str, str] = {}
    for raw in (value or "").split(","):
        label = raw.strip()
        if label:
            out.setdefault(label.lower(), label)
    return out


def _shared(mine: str, theirs: str) -> list[str]:
    """Overlap, labelled the way the viewer wrote it."""
    a, b = _items(mine), _items(theirs)
    return sorted(a[key] for key in a.keys() & b.keys())


def _modes_compatible(a: str, b: str) -> bool:
    return a == b or "either" in (a, b)


def compatibility(me: models.User, other: models.User, kind: str) -> tuple[int, list[str]]:
    """Internal ranking points plus human-readable reasons. Points are never returned to clients."""
    points, reasons = 0, []
    if kind == "buddy":
        courses = _shared(me.courses, other.courses)
        interests = _shared(me.interests, other.interests)
        points += 3 * len(courses) + 2 * len(interests)
        if courses:
            reasons.append("Also in " + ", ".join(courses[:3]))
        if interests:
            reasons.append("Into " + ", ".join(interests[:3]))
    else:
        they_teach = _shared(me.skills_learn, other.skills_teach)
        i_teach = _shared(me.skills_teach, other.skills_learn)
        points += 3 * len(they_teach) + 3 * len(i_teach)
        if they_teach and i_teach:
            points += 2  # a two-way swap is the best SkillShare outcome
            reasons.append("Skill swap: you both have something to teach")
        if they_teach:
            reasons.append("Can teach you " + ", ".join(they_teach[:3]))
        if i_teach:
            reasons.append("Wants to learn " + ", ".join(i_teach[:3]))
    if _modes_compatible(me.mode, other.mode):
        points += 1
        if me.mode == other.mode and me.mode != "either":
            reasons.append("Also prefers " + ("in person" if me.mode == "in_person" else "online"))
    if abs(_ENERGY_ORDER.get(me.energy, 1) - _ENERGY_ORDER.get(other.energy, 1)) == 0:
        points += 1
        reasons.append({"low": "Also likes quiet sessions", "medium": "Similar pace", "high": "Also high energy"}.get(other.energy, "Similar pace"))
    return points, reasons


@router.get("/{kind}/deck", response_model=list[schemas.SwipeCard])
def deck(kind: schemas.SwipeKind, limit: int = Query(20, ge=1, le=50),
         me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Next people to swipe on in this deck, most compatible first. Already-swiped people are skipped."""
    seen = {row.target_id for row in db.query(models.Swipe.target_id).filter_by(swiper_id=me.id, kind=kind)}
    ranked = []
    for other in db.query(models.User).filter(models.User.id != me.id).all():
        if other.id in seen:
            continue
        points, reasons = compatibility(me, other, kind)
        if kind == "skill" and points <= 1:
            continue  # nothing to teach or learn from each other
        ranked.append((points, other.id, other, reasons))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [schemas.SwipeCard(profile=schemas.StudentMatchOut.model_validate(other), reasons=reasons)
            for _, _, other, reasons in ranked[:limit]]


@router.post("", response_model=schemas.SwipeResult)
def swipe(data: schemas.SwipeIn, me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Record a like/pass. A like that is returned by the other person in the same deck is a match."""
    if data.target_id == me.id:
        raise HTTPException(400, "You can't swipe on yourself")
    target = db.get(models.User, data.target_id)
    if not target:
        raise HTTPException(404, "That student is no longer available")
    row = db.query(models.Swipe).filter_by(swiper_id=me.id, target_id=target.id, kind=data.kind).first()
    if row:
        row.direction = data.direction
    else:
        db.add(models.Swipe(swiper_id=me.id, target_id=target.id, kind=data.kind, direction=data.direction))
    db.commit()
    if data.direction != "like":
        return schemas.SwipeResult(matched=False)
    liked_back = db.query(models.Swipe).filter_by(
        swiper_id=target.id, target_id=me.id, kind=data.kind, direction="like").first()
    if not liked_back:
        return schemas.SwipeResult(matched=False)
    return schemas.SwipeResult(matched=True, profile=schemas.StudentMatchOut.model_validate(target))


@router.get("/matches", response_model=list[schemas.SwipeMatch])
def matches(kind: schemas.SwipeKind | None = None,
            me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Everyone the caller and the other person both liked, newest first."""
    mine = db.query(models.Swipe).filter_by(swiper_id=me.id, direction="like")
    if kind:
        mine = mine.filter_by(kind=kind)
    out = []
    for row in mine.order_by(models.Swipe.created_at.desc()).all():
        back = db.query(models.Swipe).filter_by(
            swiper_id=row.target_id, target_id=me.id, kind=row.kind, direction="like").first()
        if back:
            other = db.get(models.User, row.target_id)
            if other:
                out.append(schemas.SwipeMatch(kind=row.kind, profile=schemas.StudentMatchOut.model_validate(other)))
    return out
