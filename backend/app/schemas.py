from typing import Literal
from pydantic import BaseModel, ConfigDict

Category = Literal["study", "skill", "ride"]


class UserCreate(BaseModel):
    """Profile fields. The email comes from the verified Auth0 token, never from the client."""
    name: str
    bio: str = ""
    courses: str = ""
    skills_teach: str = ""
    skills_learn: str = ""


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    name: str
    bio: str
    courses: str
    skills_teach: str
    skills_learn: str
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


