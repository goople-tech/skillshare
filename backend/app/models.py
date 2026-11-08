from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Table, Column, Float, UniqueConstraint, CheckConstraint
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
    sticker: Mapped[str] = mapped_column(String, default="")  # public profile sticker id, optional
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


class SkillExchange(Base):
    """One mutually liked SkillShare pair's scheduled lesson.

    Keeping the pair unique makes this the deliberately small, one-lesson MVP.
    Scheduling belongs to its participants; only their acknowledgements complete
    the exchange. A later multi-lesson/bundle product needs a separate migration
    and a lesson identifier, rather than overloading these acknowledgements.
    """
    __tablename__ = "skill_exchanges"
    __table_args__ = (
        UniqueConstraint("participant_low_id", "participant_high_id", name="uq_skill_exchange_pair"),
        CheckConstraint("participant_low_id < participant_high_id", name="ck_skill_exchange_normalized_pair"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    participant_low_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    participant_high_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    low_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    high_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SkillReview(Base):
    """One participant's three-category rating for one mutually completed lesson."""
    __tablename__ = "skill_reviews"
    __table_args__ = (
        UniqueConstraint("exchange_id", "reviewer_id", name="uq_skill_review_participant"),
        CheckConstraint("learned BETWEEN 1 AND 5 AND taught BETWEEN 1 AND 5 AND collaboration BETWEEN 1 AND 5", name="ck_skill_review_scores"),
        CheckConstraint("reviewer_id <> reviewee_id", name="ck_skill_review_no_self_rating"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    exchange_id: Mapped[int] = mapped_column(ForeignKey("skill_exchanges.id"), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reviewee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    learned: Mapped[int] = mapped_column(Integer)
    taught: Mapped[int] = mapped_column(Integer)
    collaboration: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
