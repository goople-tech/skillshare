"""Direct messages between matched students.

Only two people who both liked each other (in either swipe deck) can message.
Clients poll `GET /messages/{user_id}?after_id=` for new messages; there is no
realtime push yet. Message text is never logged.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import current_user
from .database import get_db

router = APIRouter(prefix="/messages", tags=["messages"])


def is_matched(db: Session, a: int, b: int) -> bool:
    for row in db.query(models.Swipe).filter_by(swiper_id=a, target_id=b, direction="like"):
        if db.query(models.Swipe).filter_by(swiper_id=b, target_id=a, kind=row.kind, direction="like").first():
            return True
    return False


def _other(db: Session, me: models.User, user_id: int) -> models.User:
    if user_id == me.id:
        raise HTTPException(400, "You can't message yourself")
    other = db.get(models.User, user_id)
    if not other or not is_matched(db, me.id, other.id):
        # Same answer for "doesn't exist" and "not matched", so this can't probe accounts.
        raise HTTPException(403, "You can message someone once you've both liked each other")
    return other


def _out(message: models.Message, me: models.User) -> schemas.MessageOut:
    return schemas.MessageOut(id=message.id, mine=message.sender_id == me.id, body=message.body, sent_at=message.created_at)


@router.get("/{user_id}", response_model=list[schemas.MessageOut])
def conversation(user_id: int, after_id: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200),
                 me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Messages with one matched student, oldest first. Pass the last seen id as `after_id` to poll."""
    other = _other(db, me, user_id)
    rows = (db.query(models.Message)
            .filter(or_(and_(models.Message.sender_id == me.id, models.Message.recipient_id == other.id),
                        and_(models.Message.sender_id == other.id, models.Message.recipient_id == me.id)))
            .filter(models.Message.id > after_id)
            .order_by(models.Message.id.asc())
            .limit(limit).all())
    return [_out(row, me) for row in rows]


@router.post("/{user_id}", response_model=schemas.MessageOut)
def send(user_id: int, data: schemas.MessageIn, me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    other = _other(db, me, user_id)
    body = data.body.strip()
    if not body:
        raise HTTPException(422, "Message can't be empty")
    message = models.Message(sender_id=me.id, recipient_id=other.id, body=body)
    db.add(message)
    db.commit()
    db.refresh(message)
    return _out(message, me)
