from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


def utc_now() -> datetime:
    """Naive UTC is the database convention used by the existing SQLAlchemy models."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Conversation(Base):
    """One channel for a currently mutual pair in one product scope.

    Eligibility authority remains the two reciprocal rows in ``swipes``. This
    row is a materialized, durable mailbox; its presence alone grants nothing.
    """

    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("participant_low_id", "participant_high_id", "kind", name="uq_conversation_pair_kind"),
        CheckConstraint("participant_low_id < participant_high_id", name="ck_conversation_distinct_normalized_pair"),
        CheckConstraint("kind IN ('buddy', 'skill')", name="ck_conversation_kind"),
        Index("ix_conversation_low_updated", "participant_low_id", "updated_at", "id"),
        Index("ix_conversation_high_updated", "participant_high_id", "updated_at", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    participant_low_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    participant_high_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    low_last_read_message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id", name="fk_conversation_low_last_read"), nullable=True)
    high_last_read_message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id", name="fk_conversation_high_last_read"), nullable=True)
    low_last_read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    high_last_read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation_id", "conversation_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
