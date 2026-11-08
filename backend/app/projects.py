"""Projects: find teammates who can teach the skills a student project needs.

Read-only over existing public profile fields, so no new table or migration is
needed. Project drafts live in the student's browser (see frontend
``components/projects``). Only ``StudentMatchOut`` public fields are returned.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import current_user
from .database import get_db
from .skillshare import _csv_column_contains

router = APIRouter(prefix="/projects", tags=["projects"])

MAX_SKILLS = 6


@router.get("/teammates", response_model=list[schemas.ProjectSkillTeammates])
def teammates(
    skills: list[str] = Query(default=[], max_length=MAX_SKILLS),
    limit: int = Query(default=6, ge=1, le=12),
    me: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """For each requested skill, students (not the caller) who list it under skills_teach.

    Matching is whole-entry and case/space-insensitive, like SkillShare discovery.
    Blank skills are skipped; duplicates are collapsed; order is preserved.
    """
    seen: set[str] = set()
    out: list[schemas.ProjectSkillTeammates] = []
    for raw in skills:
        skill = raw.strip()[:100]
        key = skill.lower().replace(" ", "")
        if not key or key in seen:
            continue
        seen.add(key)
        rows = (
            db.query(models.User)
            .filter(models.User.id != me.id, _csv_column_contains(models.User.skills_teach, skill))
            .order_by(models.User.id)
            .limit(limit)
            .all()
        )
        out.append(schemas.ProjectSkillTeammates(
            skill=skill, students=[schemas.StudentMatchOut.model_validate(u) for u in rows],
        ))
    return out
