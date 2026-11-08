from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Category = Literal["study", "skill", "ride"]
Mode = Literal["in_person", "online", "either"]
Energy = Literal["low", "medium", "high"]
SwipeKind = Literal["buddy", "skill"]
SwipeDirection = Literal["like", "pass"]


class UserCreate(BaseModel):
    """Profile fields. The email comes from the verified Auth0 token, never from the client."""
    name: str
    bio: str = ""
    courses: str = ""
    skills_teach: str = ""
    skills_learn: str = ""
    interests: str = ""
    mode: Mode = "either"
    energy: Energy = "medium"
    photo: str = Field(default="", max_length=400_000)


class UserUpdate(BaseModel):
    """Partial profile edit: only the fields sent are changed. Email and XP can't be edited."""
    name: str | None = Field(default=None, min_length=1)
    bio: str | None = None
    courses: str | None = None
    skills_teach: str | None = None
    skills_learn: str | None = None
    interests: str | None = None
    mode: Mode | None = None
    energy: Energy | None = None
    photo: str | None = Field(default=None, max_length=400_000)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    name: str
    bio: str
    courses: str
    skills_teach: str
    skills_learn: str
    interests: str
    mode: str
    energy: str
    photo: str
    xp: int


class StudentMatchOut(BaseModel):
    """Only public recommendation fields; never reveal another student's account data."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    bio: str
    courses: str
    skills_teach: str
    skills_learn: str
    interests: str
    mode: Mode
    energy: Energy


class SkillRatingOut(BaseModel):
    """Completed-review aggregate only. Absent values mean no completed reviews."""
    average: float | None = Field(default=None, ge=1, le=5)
    completed_reviews: int = Field(ge=0)


class SkillMatchOut(BaseModel):
    user: StudentMatchOut
    they_teach_me: list[str]
    i_teach_them: list[str]
    mutual: bool


SkillCategory = Literal["technical", "academic", "creative", "design", "music", "languages", "other"]


class SkillDiscoveryOut(BaseModel):
    profile: StudentMatchOut
    categories: list[SkillCategory]
    they_teach_me: list[str]
    i_teach_them: list[str]
    mutual: bool
    reasons: list[str]
    rating: SkillRatingOut


class SkillDiscoveryPage(BaseModel):
    results: list[SkillDiscoveryOut]
    count: int = Field(ge=0)
    limit: int = Field(ge=1, le=50)


class SkillCatalogOut(BaseModel):
    """Existing public-profile skills for meaningful filter options, not fixture data."""
    skills: list[str]


class SkillExchangeCreate(BaseModel):
    """Schedule one lesson with an existing mutual SkillShare match."""
    partner_id: int
    scheduled_for: datetime

    @model_validator(mode="after")
    def scheduled_time_has_zone(self):
        if self.scheduled_for.utcoffset() is None:
            raise ValueError("scheduled_for must include a UTC offset")
        return self


class ReviewState(BaseModel):
    status: Literal["waiting_for_peer", "awaiting_completion", "eligible", "submitted"]
    can_rate: bool
    can_confirm_completion: bool
    acknowledged_by_me: bool
    acknowledged_by_peer: bool
    values: "SkillReviewIn | None" = None


class SkillExchangeOut(BaseModel):
    id: int
    partner: StudentMatchOut
    scheduled_for: datetime
    review: ReviewState


class SkillReviewIn(BaseModel):
    learned: int = Field(ge=1, le=5)
    taught: int = Field(ge=1, le=5)
    collaboration: int = Field(ge=1, le=5)


class SkillReviewOut(BaseModel):
    """Author-owned values. Feedback author identities are never publicly aggregated."""
    exchange_id: int
    learned: int
    taught: int
    collaboration: int
    updated_at: datetime


class ListingCreate(BaseModel):
    category: Category
    title: str
    description: str = ""
    tag: str = ""
    location: str = ""
    time: str = ""
    capacity: int = Field(default=4, ge=1, le=100)


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: str
    title: str
    description: str
    tag: str
    location: str
    time: str
    capacity: int
    owner: UserOut
    members: list[UserOut]


class DraftRequest(BaseModel):
    text: str = Field(max_length=10_000)  # e.g. a pasted Reddit post


class PresenceUpdate(BaseModel):
    lat: float
    lng: float


class HeatPoint(BaseModel):
    lat: float
    lng: float


class HeatArea(BaseModel):
    area: HeatPoint
    count: int


class HeatmapOut(BaseModel):
    areas: list[HeatArea]
    active_students: int
    refresh_seconds: int
    ttl_seconds: int


class PresenceMine(BaseModel):
    sharing: bool
    lat: float | None = None
    lng: float | None = None


class SwipeCard(BaseModel):
    """A deck card. `reasons` are plain-language overlaps; no numeric score is exposed."""
    profile: StudentMatchOut
    reasons: list[str]


class SwipeIn(BaseModel):
    target_id: int
    kind: SwipeKind
    direction: SwipeDirection


class SwipeResult(BaseModel):
    matched: bool
    profile: StudentMatchOut | None = None   # set only when this swipe completed a mutual like


class SwipeMatch(BaseModel):
    kind: SwipeKind
    profile: StudentMatchOut
