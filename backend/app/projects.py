"""Projects: students post what they want to build and find teammates who can teach the skills it needs.

Endpoints (all require a signed-in UBC student):
  GET    /projects                 every student's projects, newest first (``?mine=true`` for your own)
  POST   /projects                 create one of your projects
  DELETE /projects/{id}            delete your own project (others get 404)
  GET    /projects/{id}/teammates  students who can teach that project's skills, grouped by skill
  GET    /projects/teammates       same lookup for an ad-hoc ``?skills=`` list

Only ``StudentMatchOut`` public fields are returned for owners and teammates.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import current_user
from .database import get_db
from .skillshare import _csv_column_contains

router = APIRouter(prefix="/projects", tags=["projects"])

MAX_SKILLS = 6
MAX_PROJECTS_PER_STUDENT = 20


def clean_skills(raw: list[str]) -> list[str]:
    """Trim, drop blanks and commas, de-duplicate case/space-insensitively, keep order, cap at MAX_SKILLS."""
    seen: set[str] = set()
    out: list[str] = []
    for item in raw:
        skill = item.replace(",", " ").strip()[:100]
        key = skill.lower().replace(" ", "")
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(skill)
        if len(out) == MAX_SKILLS:
            break
    return out


def _out(project: models.Project, owner: models.User, me: models.User) -> schemas.ProjectOut:
    return schemas.ProjectOut(
        id=project.id, title=project.title, pitch=project.pitch or "",
        skills_needed=[s for s in (project.skills_needed or "").split(",") if s],
        owner=schemas.StudentMatchOut.model_validate(owner), is_mine=project.owner_id == me.id,
        created_at=project.created_at,
    )


def _teammates_for(skills: list[str], me: models.User, db: Session, limit: int) -> list[schemas.ProjectSkillTeammates]:
    out = []
    for skill in clean_skills(skills):
        rows = (
            db.query(models.User)
            .filter(models.User.id != me.id, _csv_column_contains(models.User.skills_teach, skill))
            .order_by(models.User.id).limit(limit).all()
        )
        out.append(schemas.ProjectSkillTeammates(skill=skill, students=[schemas.StudentMatchOut.model_validate(u) for u in rows]))
    return out


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(
    mine: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    me: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Project, models.User).join(models.User, models.User.id == models.Project.owner_id)
    if mine:
        query = query.filter(models.Project.owner_id == me.id)
    rows = query.order_by(models.Project.created_at.desc(), models.Project.id.desc()).limit(limit).all()
    return [_out(project, owner, me) for project, owner in rows]


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(data: schemas.ProjectIn, me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    title = data.title.strip()
    skills = clean_skills(data.skills_needed)
    if not title:
        raise HTTPException(422, "Give your project a name")
    if not skills:
        raise HTTPException(422, "List at least one skill the project needs")
    if db.query(models.Project).filter_by(owner_id=me.id).count() >= MAX_PROJECTS_PER_STUDENT:
        raise HTTPException(409, f"You can keep up to {MAX_PROJECTS_PER_STUDENT} projects. Delete one first.")
    project = models.Project(owner_id=me.id, title=title, pitch=data.pitch.strip(), skills_needed=",".join(skills))
    db.add(project)
    db.commit()
    db.refresh(project)
    return _out(project, me, me)


@router.get("/teammates", response_model=list[schemas.ProjectSkillTeammates])
def teammates(
    skills: list[str] = Query(default=[], max_length=MAX_SKILLS),
    limit: int = Query(default=6, ge=1, le=12),
    me: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """For each requested skill, students (not the caller) who list it under skills_teach."""
    return _teammates_for(skills, me, db, limit)


@router.delete("/{project_id}")
def delete_project(project_id: int, me: models.User = Depends(current_user), db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project or project.owner_id != me.id:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()
    return {"deleted": True}  # JSON body: the frontend apiRequest always parses JSON


@router.get("/{project_id}/teammates", response_model=list[schemas.ProjectSkillTeammates])
def project_teammates(
    project_id: int,
    limit: int = Query(default=6, ge=1, le=12),
    me: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return _teammates_for((project.skills_needed or "").split(","), me, db, limit)
