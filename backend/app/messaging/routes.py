"""Mutual-match private messages. No URL/body may choose a sender or connection.

Every endpoint requires a real profile and checks both current same-kind likes
and conversation membership. Unknown, foreign and ineligible IDs return the same
404. Payload/window bounds are not production anti-abuse rate limiting. No
editing, deletion, notifications or peer read receipts are part of this MVP.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models
from ..auth import current_user
from ..database import get_db
from . import schemas
from .models import Conversation, Message, utc_now

router = APIRouter(prefix="/conversations", tags=["messaging"])


def _private(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["Vary"] = "Authorization"


def _mutual_ids(db: Session, user_id: int, kind: str) -> set[int]:
    outgoing = db.query(models.Swipe.target_id).filter_by(
        swiper_id=user_id, direction="like", kind=kind,
    ).subquery()
    return {target_id for (target_id,) in db.query(models.Swipe.swiper_id).filter(
        models.Swipe.target_id == user_id,
        models.Swipe.kind == kind,
        models.Swipe.direction == "like",
        models.Swipe.swiper_id.in_(db.query(outgoing.c.target_id)),
    ).all()}


def _is_mutual(db: Session, low_id: int, high_id: int, kind: str) -> bool:
    pair = ((low_id, high_id), (high_id, low_id))
    return db.query(models.Swipe).filter(
        models.Swipe.kind == kind,
        models.Swipe.direction == "like",
        or_(*[(models.Swipe.swiper_id == source) & (models.Swipe.target_id == target)
              for source, target in pair]),
    ).count() == 2


def _side(conversation: Conversation, user_id: int) -> str | None:
    if conversation is not None:
        if user_id == conversation.participant_low_id:
            return "low"
        if user_id == conversation.participant_high_id:
            return "high"
    return None


def _authorized(db: Session, conversation_id: int, me: models.User) -> tuple[Conversation, str]:
    conversation = db.get(Conversation, conversation_id)
    side = _side(conversation, me.id)
    if (
        conversation is None or side is None or conversation.kind not in ("buddy", "skill")
        or not _is_mutual(db, conversation.participant_low_id, conversation.participant_high_id, conversation.kind)
    ):
        raise HTTPException(404, "Conversation not found")
    return conversation, side


def _materialize(db: Session, me_id: int, other_id: int, kind: str) -> Conversation | None:
    low, high = sorted((me_id, other_id))
    values = {"participant_low_id": low, "participant_high_id": high, "kind": kind}
    conversation = db.query(Conversation).filter_by(**values).one_or_none()
    if conversation:
        return conversation
    # Caller supplied the authoritative same-kind mutual set. No message creates a match.
    conversation = Conversation(**values)
    db.add(conversation)
    try:
        db.commit()
        db.refresh(conversation)
        return conversation
    except IntegrityError:
        db.rollback()
        return db.query(Conversation).filter_by(**values).one_or_none()


def _other(db: Session, conversation: Conversation, me_id: int) -> models.User:
    other_id = conversation.participant_high_id if me_id == conversation.participant_low_id else conversation.participant_low_id
    other = db.get(models.User, other_id)
    if other is None:
        raise HTTPException(404, "Conversation not found")
    return other


def _unread(db: Session, conversation: Conversation, side: str, me_id: int) -> int:
    cursor = getattr(conversation, f"{side}_last_read_message_id") or 0
    return db.query(Message).filter(
        Message.conversation_id == conversation.id,
        Message.sender_id != me_id,
        Message.id > cursor,
    ).count()


def _summary(db: Session, conversation: Conversation, me: models.User) -> schemas.ConversationOut:
    latest = db.query(Message).filter_by(conversation_id=conversation.id).order_by(Message.id.desc()).first()
    return schemas.ConversationOut(
        id=conversation.id, kind=conversation.kind,
        participant=_other(db, conversation, me.id),
        last_message_id=latest.id if latest else None,
        latest_message_preview=latest.body[:100] if latest else None,
        last_message_at=latest.created_at if latest else None,
        unread_count=_unread(db, conversation, _side(conversation, me.id), me.id),
    )


def _output(message: Message, me: models.User, kind: str, db: Session) -> schemas.MessageOut:
    sender = db.get(models.User, message.sender_id)
    if sender is None:
        raise HTTPException(404, "Conversation not found")
    return schemas.MessageOut(
        id=message.id, conversation_id=message.conversation_id, kind=kind,
        body=message.body, created_at=message.created_at,
        mine=message.sender_id == me.id, sender=sender,
    )


@router.get("", response_model=list[schemas.ConversationOut])
def list_conversations(
    response: Response, kind: schemas.Literal["buddy", "skill"],
    me: models.User = Depends(current_user), db: Session = Depends(get_db),
):
    """Reconcile current matches idempotently into private, context-scoped mailboxes."""
    _private(response)
    conversations = [conversation for other_id in _mutual_ids(db, me.id, kind)
                     if (conversation := _materialize(db, me.id, other_id, kind)) is not None]
    ordering = {conversation.id: conversation.created_at or datetime.min for conversation in conversations}
    result = [_summary(db, conversation, me) for conversation in conversations]
    return sorted(result, key=lambda row: (row.last_message_at or ordering[row.id], row.id), reverse=True)


@router.get("/{conversation_id}/messages", response_model=schemas.MessagePage)
def get_messages(
    conversation_id: int, response: Response,
    before: int | None = Query(default=None, gt=0),
    limit: int = Query(default=50, ge=1, le=100),
    me: models.User = Depends(current_user), db: Session = Depends(get_db),
):
    """Stable exclusive-ID-cursor history, oldest to newest for this window."""
    _private(response)
    conversation, _ = _authorized(db, conversation_id, me)
    query = db.query(Message).filter_by(conversation_id=conversation.id)
    if before is not None:
        query = query.filter(Message.id < before)
    window = query.order_by(Message.id.desc()).limit(limit + 1).all()
    messages = list(reversed(window[:limit]))
    has_earlier = len(window) > limit
    return schemas.MessagePage(
        conversation_id=conversation.id, kind=conversation.kind,
        participant=_other(db, conversation, me.id),
        messages=[_output(row, me, conversation.kind, db) for row in messages],
        has_earlier=has_earlier,
        next_before=messages[0].id if messages and has_earlier else None,
    )


@router.post("/{conversation_id}/messages", response_model=schemas.MessageOut, status_code=201)
def send_message(
    conversation_id: int, data: schemas.MessageCreate, response: Response,
    me: models.User = Depends(current_user), db: Session = Depends(get_db),
):
    """Commit sender, timestamp, conversation and sender-read-cursor atomically."""
    _private(response)
    conversation, side = _authorized(db, conversation_id, me)
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        conversation = db.query(Conversation).filter_by(id=conversation.id).with_for_update().one()
    message = Message(conversation_id=conversation.id, sender_id=me.id, body=data.body)
    db.add(message)
    db.flush()
    timestamp = utc_now()
    message.created_at = timestamp
    conversation.updated_at = timestamp
    setattr(conversation, f"{side}_last_read_message_id", message.id)
    setattr(conversation, f"{side}_last_read_at", timestamp)
    db.commit()
    db.refresh(message)
    return _output(message, me, conversation.kind, db)


@router.post("/{conversation_id}/read", response_model=schemas.ReadStateOut)
def mark_read(
    conversation_id: int, response: Response,
    me: models.User = Depends(current_user), db: Session = Depends(get_db),
):
    """Update only the reader's own cursor, never the peer's or a receipt."""
    _private(response)
    conversation, side = _authorized(db, conversation_id, me)
    latest = db.query(Message).filter_by(conversation_id=conversation.id).order_by(Message.id.desc()).first()
    if latest is not None:
        setattr(conversation, f"{side}_last_read_message_id", latest.id)
        setattr(conversation, f"{side}_last_read_at", utc_now())
        db.commit()
    return schemas.ReadStateOut(
        conversation_id=conversation.id,
        last_read_message_id=getattr(conversation, f"{side}_last_read_message_id"),
        read_at=getattr(conversation, f"{side}_last_read_at"),
        unread_count=_unread(db, conversation, side, me.id),
    )
