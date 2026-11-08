"""Add private, kind-scoped conversations and persistent messages.

This additive migration contains no data changes, seeds, or production deletes.
Existing deployments must run it once before enabling the messaging endpoints;
the current starter's create_all remains only a new-database compatibility path.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261108_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("participant_low_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("participant_high_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        # Referenced messages are created below; add the cursor FKs afterwards.
        sa.Column("low_last_read_message_id", sa.Integer(), nullable=True),
        sa.Column("high_last_read_message_id", sa.Integer(), nullable=True),
        sa.Column("low_last_read_at", sa.DateTime(), nullable=True),
        sa.Column("high_last_read_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("kind IN ('buddy', 'skill')", name="ck_conversation_kind"),
        sa.CheckConstraint("participant_low_id < participant_high_id", name="ck_conversation_distinct_normalized_pair"),
        sa.UniqueConstraint("participant_low_id", "participant_high_id", "kind", name="uq_conversation_pair_kind"),
    )
    op.create_index("ix_conversation_low_updated", "conversations", ["participant_low_id", "updated_at", "id"])
    op.create_index("ix_conversation_high_updated", "conversations", ["participant_high_id", "updated_at", "id"])
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id", "id"])
    # SQLite supports named relational constraints only through batch copies.
    # This also works as a simple ALTER TABLE on production PostgreSQL.
    with op.batch_alter_table("conversations") as batch:
        batch.create_foreign_key("fk_conversation_low_last_read", "messages", ["low_last_read_message_id"], ["id"])
        batch.create_foreign_key("fk_conversation_high_last_read", "messages", ["high_last_read_message_id"], ["id"])


def downgrade() -> None:
    raise RuntimeError("Private history is not destructively rolled back by this migration.")
