from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Table, Column, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

# Many-to-many: which users joined which listing
listing_members = Table(
    "listing_members",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id"), primary_key=True),
    Column("user_id", ForeignKey("users.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    bio: Mapped[str] = mapped_column(Text, default="")
    courses: Mapped[str] = mapped_column(String, default="")   # comma-separated, e.g. "CPSC 213,BIOL 112"
    skills_teach: Mapped[str] = mapped_column(String, default="")
    skills_learn: Mapped[str] = mapped_column(String, default="")
    # Buddies matching fields (whiteboard: interests, in-person/online, energy level)
    interests: Mapped[str] = mapped_column(String, default="")      # comma-separated, e.g. "hiking,board games"
    mode: Mapped[str] = mapped_column(String, default="either")     # in_person | online | either
    energy: Mapped[str] = mapped_column(String, default="medium")   # low | medium | high
    photo: Mapped[str] = mapped_column(Text, default="")  # small data URL, optional
    xp: Mapped[int] = mapped_column(Integer, default=0)

    listings: Mapped[list["Listing"]] = relationship(back_populates="owner")


class Listing(Base):
    """One model for all three features. category = 'study' | 'skill' | 'ride'."""
    __tablename__ = "listings"
    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    tag: Mapped[str] = mapped_column(String, default="")        # course code, skill, or destination
    location: Mapped[str] = mapped_column(String, default="")
    time: Mapped[str] = mapped_column(String, default="")       # free text for MVP, e.g. "Sat 2pm"
    capacity: Mapped[int] = mapped_column(Integer, default=4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    owner: Mapped[User] = relationship(back_populates="listings")
    members: Mapped[list[User]] = relationship(secondary=listing_members)


class Presence(Base):
    """One current location per user. Each update replaces the row. Old rows are dropped by a timer."""
    __tablename__ = "presences"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class Swipe(Base):
    """One decision by `swiper` about `target` in one deck. Swiping again on the same person updates it."""
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("swiper_id", "target_id", "kind", name="uq_swipe_once_per_deck"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    swiper_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    target_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String)        # buddy | skill
    direction: Mapped[str] = mapped_column(String)   # like | pass
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
