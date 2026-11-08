from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Category = Literal["study", "skill", "ride"]
Mode = Literal["in_person", "online", "either"]
Energy = Literal["low", "medium", "high"]


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


class ListingCreate(BaseModel):
    category: Category
    title: str
    description: str = ""
    tag: str = ""
    location: str = ""
    time: str = ""
    capacity: int = 4


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
    text: str  # e.g. a pasted Reddit post


