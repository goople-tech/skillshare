import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, gemini
from .auth import current_email, current_user
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)  # creates tables on startup

# Comma-separated list in .env overrides the default.
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",") if o.strip()]

app = FastAPI(title="UBC Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Vite dev servers (5173 default, 5174 if 5173 is busy)
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# ---------- Listings ----------
@app.get("/listings", response_model=list[schemas.ListingOut])
def list_listings(category: str | None = None, _: models.User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(models.Listing)
    if category:
        q = q.filter_by(category=category)
    return q.order_by(models.Listing.created_at.desc()).all()


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
    user_d = schemas.UserOut.model_validate(user).model_dump()
    listings_d = [{"id": l.id, "category": l.category, "title": l.title,
                   "tag": l.tag, "description": l.description, "time": l.time} for l in others]
    return gemini.rank_matches(user_d, listings_d)
