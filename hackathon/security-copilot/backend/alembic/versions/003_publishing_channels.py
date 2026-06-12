"""Publishing channels migration."""

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "publishing_channels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("channel_type", sa.String(50), nullable=False, unique=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="disconnected"),
        sa.Column("config_metadata", sa.Text(), nullable=True),
        sa.Column("encrypted_credentials", sa.Text(), nullable=True),
        sa.Column("connected_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.add_column(
        "published_content",
        sa.Column("response_message", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("published_content", "response_message")
    op.drop_table("publishing_channels")
