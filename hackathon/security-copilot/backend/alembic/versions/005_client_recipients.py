"""Add client_recipients table for email publishing

Revision ID: 005_client_recipients
Revises: 004_trust_level
Create Date: 2026-06-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_client_recipients"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_recipients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_client_recipients_id", "client_recipients", ["id"])
    op.create_index("ix_client_recipients_email", "client_recipients", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_client_recipients_email", table_name="client_recipients")
    op.drop_index("ix_client_recipients_id", table_name="client_recipients")
    op.drop_table("client_recipients")
