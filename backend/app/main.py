import os
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, inspect, or_, text
from sqlalchemy.orm import Session

from . import models, schemas, gemini
from .swipe import router as swipe_router
from .skillshare import router as skillshare_discovery_router
from .messaging.routes import router as messaging_router
from .auth import current_email, current_user
from .database import Base, engine, get_db
from .privacy import aggregate_heat_points

Base.metadata.create_all(bind=engine)  # creates tables on startup

# create_all() never adds columns to an existing table, so add the profile columns
# to databases created before they existed (no need to delete ubchub.db).
_PROFILE_COLUMNS = {"interests": "''", "mode": "'either'", "energy": "'medium'", "photo": "''"}


def _add_missing_profile_columns() -> None:
    existing = {c["name"] for c in inspect(engine).get_columns("users")}
    with engine.begin() as conn:
        for name, default in _PROFILE_COLUMNS.items():
            if name not in existing:
                kind = "TEXT" if name == "photo" else "VARCHAR"
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {kind} NOT NULL DEFAULT {default}"))


_add_missing_profile_columns()

# Comma-separated list in .env overrides the default.
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,https://skillshare.app.space").split(",") if o.strip()]

app = FastAPI(title="UBC Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Vite dev servers (5173 default, 5174 if 5173 is busy)
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(swipe_router)  # Buddies / SkillShare swipe decks (app/swipe.py)
app.include_router(skillshare_discovery_router)  # discovery + completed-lesson reviews
app.include_router(messaging_router)  # private Buddies / SkillShare conversations


@app.get("/")
def health():
    return {"status": "ok"}


# ---------- Users ----------
@app.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(current_user)):
    return user


@app.post("/users", response_model=schemas.UserOut)
def create_profile(data: schemas.UserCreate, email: str = Depends(current_email), db: Session = Depends(get_db)):
    """Create the caller's profile (email comes from the verified token). Idempotent."""
    existing = db.query(models.User).filter_by(email=email).first()
    if existing:
        return existing
    user = models.User(email=email, **data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/me", response_model=schemas.UserOut)
def update_profile(data: schemas.UserUpdate, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Edit the caller's own profile. Only fields included in the request are changed."""
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            raise HTTPException(422, f"{field} cannot be null")
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


# ---------- Listings ----------
def _text_match(value: str):
    """Bound user-supplied LIKE metacharacters before a case-insensitive match."""
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _contains(column, value: str):
    return func.lower(column).like(_text_match(value.lower()), escape="\\")


@app.get("/listings", response_model=list[schemas.ListingOut])
def list_listings(
    search: str | None = None,
    category: schemas.Category | None = None,
    skill: str | None = None,
    course: str | None = None,
    interest: str | None = None,
    meeting: schemas.Mode | None = None,
    available: bool = False,
    limit: int = 50,
    _: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Search/filter in SQL; fuzzy terms intentionally span the current text-tag prototype."""
    if limit < 1 or limit > 100:
        raise HTTPException(422, "limit must be between 1 and 100")
    if search and len(search) > 200:
        raise HTTPException(422, "search must be 200 characters or less")
    q = db.query(models.Listing)
    if category:
        q = q.filter_by(category=category)
    if search:
        q = q.filter(or_(_contains(models.Listing.title, search), _contains(models.Listing.description, search), _contains(models.Listing.tag, search), _contains(models.Listing.location, search)))
    if skill:
        q = q.filter(_contains(models.Listing.tag, skill))
    if course:
        q = q.filter(or_(_contains(models.Listing.tag, course), _contains(models.Listing.description, course)))
    if interest:
        q = q.filter(or_(_contains(models.Listing.description, interest), _contains(models.Listing.title, interest)))
    if meeting:
        # Prototype listings have free-text meeting details, not a normalized meeting column.
        meeting_terms = {"in_person": ["in person", "in-person"], "online": ["online"], "either": ["either", "hybrid", "online", "in person", "in-person"]}[meeting]
        # Explicit lowercase/escape comparison behaves consistently in SQLite and PostgreSQL.
        q = q.filter(or_(*(func.lower(models.Listing.location).like(_text_match(term).lower(), escape="\\") for term in meeting_terms)))
    if available:
        membership_count = db.query(models.listing_members.c.listing_id, func.count(models.listing_members.c.user_id).label("members_count")).group_by(models.listing_members.c.listing_id).subquery()
        q = q.outerjoin(membership_count, models.Listing.id == membership_count.c.listing_id).filter(func.coalesce(membership_count.c.members_count, 0) < models.Listing.capacity)
    return q.order_by(models.Listing.created_at.desc()).limit(limit).all()


@app.post("/listings", response_model=schemas.ListingOut)
def create_listing(data: schemas.ListingCreate, owner: models.User = Depends(current_user), db: Session = Depends(get_db)):
    listing = models.Listing(**data.model_dump(), owner_id=owner.id)
    listing.members.append(owner)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@app.post("/listings/{listing_id}/join", response_model=schemas.ListingOut)
def join_listing(listing_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    listing = db.get(models.Listing, listing_id)
    if not listing:
        raise HTTPException(404, "Listing not found")
    if user in listing.members:
        raise HTTPException(400, "Already joined")
    if len(listing.members) >= listing.capacity:
        raise HTTPException(400, "Listing is full")
    listing.members.append(user)
    user.xp += 10  # XP for joining
    db.commit()
    db.refresh(listing)
    return listing


# ---------- Gemini AI ----------
@app.post("/ai/draft")
def ai_draft(req: schemas.DraftRequest, _: models.User = Depends(current_user)):
    """Paste any text (e.g. a Reddit post) -> get a pre-filled listing."""
    return gemini.draft_listing(req.text)


@app.post("/ai/match")
def ai_match(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Suggest the best listings for the logged-in user, with a reason for each."""
    others = db.query(models.Listing).filter(models.Listing.owner_id != user.id).all()
    user_d = schemas.UserOut.model_validate(user).model_dump(exclude={"photo"})
    listings_d = [{"id": l.id, "category": l.category, "title": l.title,
                   "tag": l.tag, "description": l.description, "time": l.time} for l in others]
    return gemini.rank_matches(user_d, listings_d)

def skills(s: str) -> set[str]:  
    result = set()
    for x in s.split(","):
        if x.strip():
            result.add(x.strip().lower())
    return result
    
@app.get("/skillshare/matches", response_model=list[schemas.SkillMatchOut])
def skill_matches(user_p: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """People who can teach the logged-in user something they want to learn (mutual swaps first)."""
    user_id = user_p.id
    my_learn = skills(user_p.skills_learn)
    my_teach = skills(user_p.skills_teach)

    results = []
    for other in db.query(models.User).filter(models.User.id != user_id).all():
        they_teach_me = my_learn & skills(other.skills_teach)
        i_teach_them = my_teach & skills(other.skills_learn)
        if they_teach_me:
            results.append({
                "user": schemas.StudentMatchOut.model_validate(other),
                "they_teach_me": sorted(they_teach_me),
                "i_teach_them": sorted(i_teach_them),
                "mutual": bool(i_teach_them),   # the ideal skillshare.
            })
    results.sort(key=lambda r: (r["mutual"], len(r["they_teach_me"])), reverse=True)
    return results


# ---------- Live presence (heatmap) ----------
# One live point per person, refreshed on a timer, then forgotten.
PRESENCE_REFRESH_SECONDS = 30
PRESENCE_TTL_SECONDS = 180


def _presence_cutoff() -> datetime:
    return datetime.utcnow() - timedelta(seconds=PRESENCE_TTL_SECONDS)


def _prune_presence(db: Session) -> None:
    db.query(models.Presence).filter(models.Presence.updated_at < _presence_cutoff()).delete(synchronize_session=False)


def _check_coord(lat: float, lng: float) -> None:
    if not -90 <= lat <= 90 or not -180 <= lng <= 180:
        raise HTTPException(400, "Invalid location")


@app.get("/presence/heatmap", response_model=schemas.HeatmapOut)
def presence_heatmap(_: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Broad areas and counts only; individual coordinates stay with their owner."""
    _prune_presence(db)
    db.commit()
    rows = db.query(models.Presence.lat, models.Presence.lng).all()
    return {
        "areas": aggregate_heat_points(rows),
        "active_students": len(rows),
        "refresh_seconds": PRESENCE_REFRESH_SECONDS,
        "ttl_seconds": PRESENCE_TTL_SECONDS,
    }


@app.get("/presence/me", response_model=schemas.PresenceMine)
def my_presence(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _prune_presence(db)
    db.commit()
    row = db.get(models.Presence, user.id)
    if not row:
        return {"sharing": False}
    return {"sharing": True, "lat": row.lat, "lng": row.lng}


@app.post("/presence", response_model=schemas.PresenceMine)
def update_presence(data: schemas.PresenceUpdate, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    _check_coord(data.lat, data.lng)
    _prune_presence(db)
    row = db.get(models.Presence, user.id)
    now = datetime.utcnow()
    if row:
        row.lat = data.lat
        row.lng = data.lng
        row.updated_at = now
    else:
        row = models.Presence(user_id=user.id, lat=data.lat, lng=data.lng, updated_at=now)
        db.add(row)
    db.commit()
    return {"sharing": True, "lat": row.lat, "lng": row.lng}


@app.delete("/presence", response_model=schemas.PresenceMine)
def clear_presence(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    db.query(models.Presence).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.commit()
    return {"sharing": False}
