"""Add trust_level to verification_results."""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "verification_results",
        sa.Column("trust_level", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("verification_results", "trust_level")
