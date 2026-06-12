"""Initial schema - create all tables

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, server_default="viewer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # --- sources ---
    op.create_table(
        "sources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("polling_interval_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("last_polled_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sources_id"), "sources", ["id"], unique=False)

    # --- articles ---
    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(1024), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("collected_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("status", sa.String(50), nullable=False, server_default="new"),
        sa.Column("severity", sa.String(50), nullable=True),
        sa.Column("trust_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content_hash", sa.String(64), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_articles_id"), "articles", ["id"], unique=False)
    op.create_index(op.f("ix_articles_url"), "articles", ["url"], unique=True)
    op.create_index(op.f("ix_articles_source_id"), "articles", ["source_id"], unique=False)
    op.create_index(op.f("ix_articles_status"), "articles", ["status"], unique=False)
    op.create_index(op.f("ix_articles_severity"), "articles", ["severity"], unique=False)
    op.create_index(op.f("ix_articles_content_hash"), "articles", ["content_hash"], unique=False)

    # --- verification_results ---
    op.create_table(
        "verification_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("authenticity_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("credibility_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("severity", sa.String(50), nullable=True),
        sa.Column("confidence", sa.String(50), nullable=True),
        sa.Column("business_impact", sa.Text(), nullable=True),
        sa.Column("ai_analysis", sa.Text(), nullable=True),
        sa.Column("trust_score_breakdown", sa.JSON(), nullable=True),
        sa.Column("cve_references", sa.JSON(), nullable=True),
        sa.Column("sources_checked", sa.JSON(), nullable=True),
        sa.Column("affected_products", sa.JSON(), nullable=True),
        sa.Column("recommended_actions", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("article_id"),
    )
    op.create_index(op.f("ix_verification_results_id"), "verification_results", ["id"], unique=False)
    op.create_index(op.f("ix_verification_results_article_id"), "verification_results", ["article_id"], unique=True)

    # --- generated_content ---
    op.create_table(
        "generated_content",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(1024), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_generated_content_id"), "generated_content", ["id"], unique=False)
    op.create_index(op.f("ix_generated_content_article_id"), "generated_content", ["article_id"], unique=False)

    # --- published_content ---
    op.create_table(
        "published_content",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("generated_content_id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("published_by", sa.Integer(), nullable=True),
        sa.Column("platform", sa.String(100), nullable=False, server_default="internal"),
        sa.Column("status", sa.String(50), nullable=False, server_default="published"),
        sa.Column("published_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["generated_content_id"], ["generated_content.id"]),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"]),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_published_content_id"), "published_content", ["id"], unique=False)
    op.create_index(op.f("ix_published_content_generated_content_id"), "published_content", ["generated_content_id"], unique=False)
    op.create_index(op.f("ix_published_content_article_id"), "published_content", ["article_id"], unique=False)

    # --- audit_logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_resource_type"), "audit_logs", ["resource_type"], unique=False)

    # --- approvals ---
    op.create_table(
        "approvals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("analyst_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"]),
        sa.ForeignKeyConstraint(["analyst_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_approvals_id"), "approvals", ["id"], unique=False)
    op.create_index(op.f("ix_approvals_article_id"), "approvals", ["article_id"], unique=False)

    # --- settings ---
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_settings_id"), "settings", ["id"], unique=False)
    op.create_index(op.f("ix_settings_key"), "settings", ["key"], unique=True)


def downgrade() -> None:
    op.drop_table("settings")
    op.drop_table("approvals")
    op.drop_table("audit_logs")
    op.drop_table("published_content")
    op.drop_table("generated_content")
    op.drop_table("verification_results")
    op.drop_table("articles")
    op.drop_table("sources")
    op.drop_table("users")
