from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class MessageCreate(BaseModel):
    """Forged identifiers are rejected rather than silently overriding server data."""

    model_config = {"extra": "forbid"}
    body: str = Field(max_length=2_000)

    @field_validator("body")
    @classmethod
    def trim_without_transforming_content(cls, body: str) -> str:
        body = body.strip()
        if not body:
            raise ValueError("Message cannot be empty")
        return body


class ChatParticipant(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    kind: Literal["buddy", "skill"]
    body: str
    created_at: datetime
    mine: bool
    sender: ChatParticipant


class ConversationOut(BaseModel):
    id: int
    kind: Literal["buddy", "skill"]
    participant: ChatParticipant
    last_message_id: int | None
    latest_message_preview: str | None
    last_message_at: datetime | None
    unread_count: int


class MessagePage(BaseModel):
    conversation_id: int
    kind: Literal["buddy", "skill"]
    participant: ChatParticipant
    messages: list[MessageOut]
    has_earlier: bool
    next_before: int | None


class ReadStateOut(BaseModel):
    conversation_id: int
    last_read_message_id: int | None
    read_at: datetime | None
    unread_count: int
