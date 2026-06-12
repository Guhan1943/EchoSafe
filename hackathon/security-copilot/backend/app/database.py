from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _apply_schema_patches() -> None:
    """Add columns/tables missing from DBs created before newer migrations."""
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "verification_results" in table_names:
            cols = {c["name"] for c in inspector.get_columns("verification_results")}
            if "trust_level" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE verification_results "
                        "ADD COLUMN trust_level VARCHAR(50)"
                    )
                )

        if "published_content" in table_names:
            cols = {c["name"] for c in inspector.get_columns("published_content")}
            if "response_message" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE published_content "
                        "ADD COLUMN response_message TEXT"
                    )
                )

        if "articles" in table_names:
            cols = {c["name"] for c in inspector.get_columns("articles")}
            if "image_url" not in cols:
                conn.execute(
                    text("ALTER TABLE articles ADD COLUMN image_url VARCHAR(2048)")
                )

        if "generated_content" in table_names:
            cols = {c["name"] for c in inspector.get_columns("generated_content")}
            if "image_url" not in cols:
                conn.execute(
                    text("ALTER TABLE generated_content ADD COLUMN image_url VARCHAR(2048)")
                )


def run_migrations() -> None:
    """Apply Alembic migrations when available (safe no-op if already current)."""
    import logging
    import os

    logger = logging.getLogger(__name__)
    try:
        from alembic import command
        from alembic.config import Config

        ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
        cfg = Config(ini_path)
        command.upgrade(cfg, "head")
        logger.info("Database migrations up to date")
    except Exception as exc:
        logger.warning("Alembic upgrade skipped, using schema patches: %s", exc)


def init_db() -> None:
    # Import all models so Base.metadata is populated before create_all
    import app.models  # noqa: F401

    run_migrations()
    _apply_schema_patches()
    Base.metadata.create_all(bind=engine)
