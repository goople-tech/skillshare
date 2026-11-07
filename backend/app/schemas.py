from typing import Literal
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict

Category = Literal["study", "skill", "ride"]


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    bio: str = ""
    courses: str = ""
    skills_teach: str = ""
    skills_learn: str = ""

    @field_validator("email")
    @classmethod
    def must_be_ubc(cls, v: str) -> str:
        if not v.lower().endswith(("@student.ubc.ca", "@alum.ubc.ca", "@students.cs.ubc.ca", "@ubc.ca")):
            raise ValueError("Must be a UBC email!")
        return v.lower()


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
    owner_id: int


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


class MatchRequest(BaseModel):
    user_id: int
