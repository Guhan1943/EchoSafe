"""CTI threat events tables

Revision ID: 002
Revises: 001
Create Date: 2026-06-12
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "threat_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("external_id", sa.String(255), nullable=False, unique=True),
        sa.Column("source_adapter", sa.String(100), nullable=False),
        sa.Column("source_type", sa.String(100), nullable=False),
        sa.Column("title", sa.String(1024), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.String(2048), nullable=True),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("collected_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="new"),
        sa.Column("confidence_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confidence_level", sa.String(20), nullable=False, server_default="low"),
        sa.Column("confidence_reasoning", sa.JSON(), nullable=True),
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("severity", sa.String(20), nullable=True),
        sa.Column("is_duplicate", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("duplicate_of_id", sa.Integer(), sa.ForeignKey("threat_events.id"), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
    )
    op.create_index("ix_threat_events_external_id", "threat_events", ["external_id"], unique=True)
    op.create_index("ix_threat_events_source_adapter", "threat_events", ["source_adapter"])
    op.create_index("ix_threat_events_source_type", "threat_events", ["source_type"])
    op.create_index("ix_threat_events_status", "threat_events", ["status"])
    op.create_index("ix_threat_events_confidence_level", "threat_events", ["confidence_level"])
    op.create_index("ix_threat_events_severity", "threat_events", ["severity"])

    op.create_table(
        "threat_entities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("threat_events.id"), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("value", sa.String(512), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.UniqueConstraint("event_id", "entity_type", "value", name="uq_threat_entity"),
    )
    op.create_index("ix_threat_entities_event_id", "threat_entities", ["event_id"])
    op.create_index("ix_threat_entities_entity_type", "threat_entities", ["entity_type"])

    op.create_table(
        "event_embeddings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("threat_events.id"), nullable=False, unique=True),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_event_embeddings_event_id", "event_embeddings", ["event_id"], unique=True)

    op.create_table(
        "threat_risk_assessments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("threat_events.id"), nullable=False, unique=True),
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("severity", sa.String(20), nullable=False, server_default="low"),
        sa.Column("cvss_score", sa.Float(), nullable=True),
        sa.Column("exploit_available", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("public_poc", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("vendor_confirmed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("mention_velocity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reasons", sa.JSON(), nullable=True),
        sa.Column("assessed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_threat_risk_assessments_event_id", "threat_risk_assessments", ["event_id"], unique=True)


def downgrade() -> None:
    op.drop_table("threat_risk_assessments")
    op.drop_table("event_embeddings")
    op.drop_table("threat_entities")
    op.drop_table("threat_events")
