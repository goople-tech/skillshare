"""Add mutually completed single lessons and per-participant ratings.

Additive only: no user/profile columns, production data or existing tables are
changed. Review with the backend owner and rehearse on the production database.
The ``create_all`` starter path does not replace this deliberate migration.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261108_02"
down_revision: Union[str, None] = "20261108_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "skill_exchanges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("participant_low_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("participant_high_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("low_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("high_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("participant_low_id < participant_high_id", name="ck_skill_exchange_normalized_pair"),
        sa.UniqueConstraint("participant_low_id", "participant_high_id", name="uq_skill_exchange_pair"),
    )
    op.create_index("ix_skill_exchanges_participant_low_id", "skill_exchanges", ["participant_low_id"])
    op.create_index("ix_skill_exchanges_participant_high_id", "skill_exchanges", ["participant_high_id"])
    op.create_index("ix_skill_exchanges_scheduled_for", "skill_exchanges", ["scheduled_for"])
    op.create_table(
        "skill_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exchange_id", sa.Integer(), sa.ForeignKey("skill_exchanges.id"), nullable=False),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("learned", sa.Integer(), nullable=False),
        sa.Column("taught", sa.Integer(), nullable=False),
        sa.Column("collaboration", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("learned BETWEEN 1 AND 5 AND taught BETWEEN 1 AND 5 AND collaboration BETWEEN 1 AND 5", name="ck_skill_review_scores"),
        sa.CheckConstraint("reviewer_id <> reviewee_id", name="ck_skill_review_no_self_rating"),
        sa.UniqueConstraint("exchange_id", "reviewer_id", name="uq_skill_review_participant"),
    )
    op.create_index("ix_skill_reviews_exchange_id", "skill_reviews", ["exchange_id"])
    op.create_index("ix_skill_reviews_reviewer_id", "skill_reviews", ["reviewer_id"])
    op.create_index("ix_skill_reviews_reviewee_id", "skill_reviews", ["reviewee_id"])


def downgrade() -> None:
    # Rollback tooling only; never run this against production data automatically.
    op.drop_index("ix_skill_reviews_reviewee_id", table_name="skill_reviews")
    op.drop_index("ix_skill_reviews_reviewer_id", table_name="skill_reviews")
    op.drop_index("ix_skill_reviews_exchange_id", table_name="skill_reviews")
    op.drop_table("skill_reviews")
    op.drop_index("ix_skill_exchanges_scheduled_for", table_name="skill_exchanges")
    op.drop_index("ix_skill_exchanges_participant_high_id", table_name="skill_exchanges")
    op.drop_index("ix_skill_exchanges_participant_low_id", table_name="skill_exchanges")
    op.drop_table("skill_exchanges")
