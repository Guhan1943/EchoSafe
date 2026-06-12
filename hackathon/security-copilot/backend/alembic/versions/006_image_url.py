"""Add image_url to articles and generated_content

Revision ID: 006_image_url
Revises: 005_client_recipients
Create Date: 2026-06-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_image_url"
down_revision: Union[str, None] = "005_client_recipients"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("articles", sa.Column("image_url", sa.String(length=2048), nullable=True))
    op.add_column(
        "generated_content",
        sa.Column("image_url", sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("generated_content", "image_url")
    op.drop_column("articles", "image_url")
