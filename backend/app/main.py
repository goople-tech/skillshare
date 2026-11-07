from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, gemini
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)  # creates tables on startup

app = FastAPI(title="UBC Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok"}


# ---------- Users ----------
@app.post("/users", response_model=schemas.UserOut)
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter_by(email=data.email).first()
    if existing:
        return existing  # acts as a simple "log in" for the MVP
    user = models.User(**data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ---------- Listings ----------
@app.get("/listings", response_model=list[schemas.ListingOut])
def list_listings(category: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Listing)
    if category:
        q = q.filter_by(category=category)
    return q.order_by(models.Listing.created_at.desc()).all()


@app.post("/listings", response_model=schemas.ListingOut)
def create_listing(data: schemas.ListingCreate, db: Session = Depends(get_db)):
    owner = db.get(models.User, data.owner_id)
    if not owner:
        raise HTTPException(404, "Owner not found")
    listing = models.Listing(**data.model_dump())
    listing.members.append(owner)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@app.post("/listings/{listing_id}/join", response_model=schemas.ListingOut)
def join_listing(listing_id: int, user_id: int, db: Session = Depends(get_db)):
    listing = db.get(models.Listing, listing_id)
    user = db.get(models.User, user_id)
    if not listing or not user:
        raise HTTPException(404, "Listing or user not found")
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
def ai_draft(req: schemas.DraftRequest):
    """Paste any text (e.g. a Reddit post) -> get a pre-filled listing."""
    return gemini.draft_listing(req.text)


@app.post("/ai/match")
def ai_match(req: schemas.MatchRequest, db: Session = Depends(get_db)):
    """Suggest the best listings for a user, with a reason for each."""
    user = db.get(models.User, req.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    others = db.query(models.Listing).filter(models.Listing.owner_id != user.id).all()
    user_d = schemas.UserOut.model_validate(user).model_dump()
    listings_d = [{"id": l.id, "category": l.category, "title": l.title,
                   "tag": l.tag, "description": l.description, "time": l.time} for l in others]
    return gemini.rank_matches(user_d, listings_d)

def skills(s: str) -> set[str]:  
    result = set()
    for x in s.split(","):
        if x.strip():
            result.add(x.strip().lower())
    return result
    
@app.get("/skillshare/matches/{user_id}")     
def skill_matches(user_id: int, db: Session = Depends(get_db)):
    user_p = db.get(models.User, user_id)
    if not user_p:
        raise HTTPException(404, "User cannot be found!")
    my_learn = skills(user_p.skills_learn)
    my_teach = skills(user_p.skills_teach)

    results = []
    for other in db.query(models.User).filter(models.User.id != user_id).all():
        they_teach_me = my_learn & skills(other.skills_teach)
        i_teach_them = my_teach & skills(other.skills_learn)
        if they_teach_me:
            results.append({
                "user": schemas.UserOut.model_validate(other),
                "they_teach_me": sorted(they_teach_me),
                "i_teach_them": sorted(i_teach_them),
                "mutual": bool(i_teach_them),   # the ideal skillshare.
            })
    results.sort(key=lambda r: (r["mutual"], len(r["they_teach_me"])), reverse=True)
    return results
