"""SkillShare discovery, single-lesson completion and participant ratings.

Every operation requires ``current_user``. A lesson belongs to a mutually liked
SkillShare pair; both participants must acknowledge it before either can review
that specific lesson. Public results contain only ``StudentMatchOut`` plus
anonymous, completed-review aggregates. No notes, emails, photos, XP or schedules
are exposed in discovery results.

The MVP intentionally permits one lesson per matched pair. Extending it to
bundles requires a separate lesson model and migration, not extra acknowledgements
on this row. ``create_all`` only adds these new tables; production rollout should
use an owner-reviewed Alembic migration and a rehearsal against the real database.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, func, literal, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from . import models, schemas
from .auth import current_user
from .database import get_db
from .swipe import _items, _shared, compatibility

router = APIRouter(prefix="/skillshare", tags=["skillshare"])

# Exact whole-term vocabulary for the current comma-separated profile prototype.
# This is data mapping, not invented user credentials or inferred popularity.
CATEGORY_TERMS = {
    "technical": ("python", "javascript", "typescript", "java", "c++", "coding", "programming", "react", "sql", "software", "web development", "data", "algorithm"),
    "academic": ("math", "calculus", "statistics", "physics", "chemistry", "biology", "economics", "cpsc", "course", "exam", "tutoring", "writing"),
    "creative": ("art", "drawing", "painting", "writing", "photography", "film", "craft", "ceramics", "poetry", "knitting"),
    "design": ("design", "ui design", "ux design", "figma", "illustrator", "photoshop", "typography", "prototyping"),
    "music": ("music", "guitar", "piano", "violin", "singing", "drums", "ukulele", "bass", "songwriting"),
    "languages": ("language", "spanish", "french", "mandarin", "cantonese", "japanese", "korean", "german", "italian", "english", "portuguese", "arabic", "hindi"),
}


def _csv_column_contains(column, term: str):
    """Match a complete, trimmed CSV entry in SQL on PostgreSQL or SQLite."""
    normalized = func.lower(literal(",") + func.replace(column, " ", "") + literal(","))
    needle = term.strip().lower().replace(" ", "")
    # Literal delimiter tokens prevent prefix/substring matches. autoescape neutralises % and _.
    # LIKE with an explicit ESCAPE works on PostgreSQL (instr() does not exist there) and on SQLite.
    return normalized.contains("," + needle + ",", autoescape=True)


def _category_condition(category: schemas.SkillCategory):
    if category == "other":
        known = [or_(_csv_column_contains(models.User.skills_teach, term), _csv_column_contains(models.User.skills_learn, term))
                 for terms in CATEGORY_TERMS.values() for term in terms]
        return and_(models.User.skills_teach != "", ~or_(*known))
    return or_(*(_csv_column_contains(models.User.skills_teach, term) for term in CATEGORY_TERMS[category]))


def _rating_rows(db: Session, viewer_id: int | None):
    """Only valid, mutually completed participant reviews contribute publicly.

    Inner identities are used for ownership validation and are projected out of
    the aggregate. Demo accounts are excluded from the ordinary discovery feed.
    """
    reviewer = aliased(models.User)
    reviewee = aliased(models.User)
    q = db.query(models.SkillReview, reviewee).join(
        reviewee, models.SkillReview.reviewee_id == reviewee.id,
    ).join(reviewer, models.SkillReview.reviewer_id == reviewer.id).join(
        models.SkillExchange, models.SkillReview.exchange_id == models.SkillExchange.id,
    ).filter(
        models.SkillExchange.low_completed_at.is_not(None),
        models.SkillExchange.high_completed_at.is_not(None),
        or_(models.SkillExchange.participant_low_id == models.SkillReview.reviewer_id,
            models.SkillExchange.participant_high_id == models.SkillReview.reviewer_id),
        or_(models.SkillExchange.participant_low_id == models.SkillReview.reviewee_id,
            models.SkillExchange.participant_high_id == models.SkillReview.reviewee_id),
        models.SkillReview.reviewer_id != models.SkillReview.reviewee_id,
        ~reviewer.email.like("%@demo.ubcver.invalid"),
        ~reviewee.email.like("%@demo.ubcver.invalid"),
    )
    if viewer_id is not None:
        q = q.filter(models.SkillReview.reviewee_id != viewer_id)
    return q.subquery()


@router.get("/catalog", response_model=schemas.SkillCatalogOut)
def skill_catalog(_: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """A bounded projection of existing public CSV skill fields for autocomplete."""
    rows = db.query(models.User.skills_teach, models.User.skills_learn).filter(
        ~models.User.email.like("%@demo.ubcver.invalid"),
        or_(models.User.skills_teach != "", models.User.skills_learn != ""),
    ).limit(200).all()
    options = {label.casefold(): label for row in rows for raw in row for label in _items(raw or "").values()}
    return schemas.SkillCatalogOut(skills=sorted(options.values(), key=str.casefold)[:100])


@router.get("/discover", response_model=schemas.SkillDiscoveryPage)
def discover(
    category: schemas.SkillCategory | None = None,
    seeking: str | None = Query(default=None, max_length=100),
    offering: str | None = Query(default=None, max_length=100),
    meeting: schemas.Mode | None = None,
    minimum_rating: int | None = Query(default=None, ge=1, le=5),
    limit: int = Query(default=24, ge=1, le=50),
    me: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Bounded SQL discovery; unrated students stay in ordinary results.

    ``minimum_rating`` explicitly narrows to completed-review aggregates at or
    above that value. Missing feedback is NULL, never an invented zero rating.
    ``offering`` finds people who want something the caller can teach.
    """
    candidates = db.query(models.User).filter(models.User.id != me.id, ~models.User.email.like("%@demo.ubcver.invalid"))
    if category:
        candidates = candidates.filter(_category_condition(category))
    if seeking and seeking.strip():
        candidates = candidates.filter(_csv_column_contains(models.User.skills_teach, seeking))
    if offering and offering.strip():
        candidates = candidates.filter(_csv_column_contains(models.User.skills_learn, offering))
    if seeking is not None and not seeking.strip() or offering is not None and not offering.strip():
        candidates = candidates.filter(models.User.id == me.id)  # whitespace cannot become a wildcard
    if meeting and meeting != "either":
        candidates = candidates.filter(models.User.mode.in_((meeting, "either")))

    ratings = _rating_rows(db, me.id)
    aggregate = db.query(
        ratings.c.reviewee_id.label("user_id"),
        func.count(ratings.c.id).label("completed_reviews"),
        func.avg((ratings.c.learned + ratings.c.taught + ratings.c.collaboration) / 3.0).label("average"),
    ).group_by(ratings.c.reviewee_id).subquery()
    ranked = candidates.outerjoin(aggregate, aggregate.c.user_id == models.User.id).add_columns(
        func.coalesce(aggregate.c.completed_reviews, 0).label("completed_reviews"), aggregate.c.average,
    )
    if minimum_rating is not None:
        ranked = ranked.filter(aggregate.c.average >= minimum_rating)

    overlap_terms = []
    overlap_filters = []
    for mine, theirs in ((me.skills_learn, models.User.skills_teach), (me.skills_teach, models.User.skills_learn)):
        for term in _items(mine).values():
            predicate = _csv_column_contains(theirs, term)
            overlap_terms.append(case((predicate, 1), else_=0))
            overlap_filters.append(predicate)
    if overlap_filters:
        ranked = ranked.filter(or_(*overlap_filters))
    else:
        return schemas.SkillDiscoveryPage(results=[], count=0, limit=limit)
    overlap_score = sum(overlap_terms, start=0)
    rows = ranked.add_columns(overlap_score.label("overlap_score")).order_by(
        overlap_score.desc(), func.coalesce(aggregate.c.average, -1).desc(), models.User.id,
    ).limit(limit).all()
    results = []
    for row in rows:
        other, completed_reviews, average = row[:3]
        _, reasons = compatibility(me, other, "skill")
        they_teach = _shared(me.skills_learn, other.skills_teach)
        i_teach = _shared(me.skills_teach, other.skills_learn)
        skills = list(_items(other.skills_teach).values()) + list(_items(other.skills_learn).values())
        categories = [name for name, terms in CATEGORY_TERMS.items()
                      if any(term.lower() == item.lower() for item in skills for term in terms)]
        results.append(schemas.SkillDiscoveryOut(
            profile=schemas.StudentMatchOut.model_validate(other), categories=categories,
            they_teach_me=they_teach, i_teach_them=i_teach, mutual=bool(i_teach), reasons=reasons,
            rating=schemas.SkillRatingOut(average=round(float(average), 1) if average is not None else None,
                                          completed_reviews=completed_reviews),
        ))
    return schemas.SkillDiscoveryPage(results=results, count=len(results), limit=limit)


def _participants(exchange: models.SkillExchange) -> set[int]:
    return {exchange.participant_low_id, exchange.participant_high_id}


def _mutual_match(db: Session, low: int, high: int) -> bool:
    count = db.query(models.Swipe).filter(
        models.Swipe.kind == "skill", models.Swipe.direction == "like",
        or_(and_(models.Swipe.swiper_id == low, models.Swipe.target_id == high),
            and_(models.Swipe.swiper_id == high, models.Swipe.target_id == low)),
    ).count()
    # A row belongs to one constrained swiper/target/deck relationship.
    return count == 2


def _exchange_for(db: Session, exchange_id: int, me: models.User) -> models.SkillExchange:
    exchange = db.get(models.SkillExchange, exchange_id)
    if not exchange:
        raise HTTPException(404, "Exchange not found")
    if me.id not in _participants(exchange):
        raise HTTPException(404, "Exchange not found")
    return exchange


def _output(exchange: models.SkillExchange, me: models.User, db: Session) -> schemas.SkillExchangeOut:
    partner_id = next(user_id for user_id in _participants(exchange) if user_id != me.id)
    partner = db.get(models.User, partner_id)
    low_done, high_done = exchange.low_completed_at is not None, exchange.high_completed_at is not None
    mine = low_done if me.id == exchange.participant_low_id else high_done
    review = db.query(models.SkillReview).filter_by(exchange_id=exchange.id, reviewer_id=me.id).one_or_none()
    complete = low_done and high_done
    return schemas.SkillExchangeOut(
        id=exchange.id, partner=schemas.StudentMatchOut.model_validate(partner),
        scheduled_for=exchange.scheduled_for,
        review=schemas.ReviewState(
            status="submitted" if review else "eligible" if complete else "waiting_for_peer" if mine else "awaiting_completion",
            can_rate=complete, can_confirm_completion=not mine and not complete,
            acknowledged_by_me=mine, acknowledged_by_peer=high_done if me.id == exchange.participant_low_id else low_done,
            values=schemas.SkillReviewIn.model_validate(review, from_attributes=True) if review else None,
        ),
    )


@router.get("/exchanges", response_model=list[schemas.SkillExchangeOut])
def exchanges(me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(models.SkillExchange).filter(or_(models.SkillExchange.participant_low_id == me.id, models.SkillExchange.participant_high_id == me.id)).order_by(models.SkillExchange.scheduled_for.asc()).all()
    return [_output(row, me, db) for row in rows]


@router.post("/exchanges", response_model=schemas.SkillExchangeOut, status_code=201)
def schedule_exchange(data: schemas.SkillExchangeCreate, me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    if data.partner_id == me.id:
        raise HTTPException(400, "Choose another participant")
    partner = db.get(models.User, data.partner_id)
    if not partner or partner.email.endswith("@demo.ubcver.invalid"):
        raise HTTPException(404, "Student not found")
    low, high = sorted((me.id, data.partner_id))
    if not _mutual_match(db, low, high):
        raise HTTPException(403, "A mutual SkillShare match is required")
    if db.query(models.SkillExchange).filter_by(participant_low_id=low, participant_high_id=high).one_or_none():
        raise HTTPException(409, "This exchange already exists")
    exchange = models.SkillExchange(participant_low_id=low, participant_high_id=high, created_by_id=me.id,
                                    scheduled_for=data.scheduled_for.astimezone(timezone.utc).replace(tzinfo=None))
    db.add(exchange)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This exchange already exists")
    db.refresh(exchange)
    return _output(exchange, me, db)


@router.put("/exchanges/{exchange_id}/completion", response_model=schemas.SkillExchangeOut)
def complete_exchange(exchange_id: int, me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    exchange = _exchange_for(db, exchange_id, me)
    if exchange.low_completed_at is not None and exchange.high_completed_at is not None:
        raise HTTPException(409, "This exchange is already complete")
    scheduled_for = exchange.scheduled_for.replace(tzinfo=timezone.utc)
    if scheduled_for > datetime.now(timezone.utc):
        raise HTTPException(409, "Completion can be acknowledged after the scheduled lesson")
    if me.id == exchange.participant_low_id:
        if exchange.low_completed_at is not None:
            raise HTTPException(409, "You already acknowledged this lesson")
        exchange.low_completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    else:
        if exchange.high_completed_at is not None:
            raise HTTPException(409, "You already acknowledged this lesson")
        exchange.high_completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(exchange)
    return _output(exchange, me, db)


@router.put("/exchanges/{exchange_id}/review", response_model=schemas.SkillReviewOut)
def review_exchange(exchange_id: int, data: schemas.SkillReviewIn, me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    exchange = _exchange_for(db, exchange_id, me)
    if exchange.low_completed_at is None or exchange.high_completed_at is None:
        raise HTTPException(403, "Both participants must acknowledge completion before rating")
    partner_id = next(user_id for user_id in _participants(exchange) if user_id != me.id)
    review = db.query(models.SkillReview).filter_by(exchange_id=exchange.id, reviewer_id=me.id).one_or_none()
    if review:
        for field, value in data.model_dump().items():
            setattr(review, field, value)
        review.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    else:
        review = models.SkillReview(exchange_id=exchange.id, reviewer_id=me.id, reviewee_id=partner_id, **data.model_dump())
        db.add(review)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A rating already exists for your participation in this lesson")
    db.refresh(review)
    return review
