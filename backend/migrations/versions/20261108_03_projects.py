"""Add student projects (title, pitch, skills needed) for the Projects page.

Additive only: one new table; no existing tables or data change.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261108_03"
down_revision: Union[str, None] = "20261108_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("pitch", sa.String(280), nullable=False, server_default=""),
        sa.Column("skills_needed", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_index("ix_projects_created_at", "projects", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_projects_created_at", table_name="projects")
    op.drop_index("ix_projects_owner_id", table_name="projects")
    op.drop_table("projects")
