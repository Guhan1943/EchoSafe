import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionLocal, init_db

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    _seed_initial_data()
    _sync_approved_content_flags()
    _seed_dev_mailpit_channel()
    # Start background collection worker (skipped in test environments)
    try:
        from app.workers.collector import start_collection_worker
        start_collection_worker()
    except Exception as exc:
        logger.warning("Could not start collection worker: %s", exc)


@app.on_event("shutdown")
def shutdown_event() -> None:
    try:
        from app.workers.collector import stop_collection_worker
        stop_collection_worker()
    except Exception as exc:
        logger.warning("Could not stop collection worker: %s", exc)


def _seed_initial_data() -> None:
    from app.core.security import get_password_hash
    from app.models.user import User
    from app.models.source import Source
    from app.models.settings import Setting

    db = SessionLocal()
    try:
        # Seed default admin user
        existing_admin = db.query(User).filter(User.email == "admin@securitycopilot.dev").first()
        if not existing_admin:
            admin_user = User(
                email="admin@securitycopilot.dev",
                hashed_password=get_password_hash("admin123"),
                full_name="System Admin",
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            logger.info("Created default admin user: admin@securitycopilot.dev")

        # Seed default RSS sources
        default_sources = [
            {
                "name": "The Hacker News",
                "url": "https://feeds.feedburner.com/TheHackersNews",
                "source_type": "rss_feed",
            },
            {
                "name": "BleepingComputer",
                "url": "https://www.bleepingcomputer.com/feed/",
                "source_type": "rss_feed",
            },
            {
                "name": "SecurityWeek",
                "url": "https://feeds.feedburner.com/securityweek",
                "source_type": "rss_feed",
            },
            {
                "name": "Dark Reading",
                "url": "https://www.darkreading.com/rss.xml",
                "source_type": "rss_feed",
            },
            {
                "name": "Krebs on Security",
                "url": "https://krebsonsecurity.com/feed/",
                "source_type": "rss_feed",
            },
            {
                "name": "CrowdStrike Blog",
                "url": "https://www.crowdstrike.com/blog/feed/",
                "source_type": "vendor_blog",
            },
            {
                "name": "SentinelOne Blog",
                "url": "https://www.sentinelone.com/feed/",
                "source_type": "vendor_blog",
            },
            {
                "name": "Microsoft Security Blog",
                "url": "https://www.microsoft.com/en-us/security/blog/feed/",
                "source_type": "vendor_blog",
            },
        ]

        existing_source_count = db.query(Source).count()
        if existing_source_count == 0:
            for source_data in default_sources:
                source = Source(**source_data)
                db.add(source)
            logger.info("Created %d default RSS sources", len(default_sources))

        from app.services.trust_scoring import default_reputation_map_json

        default_settings = [
            {
                "key": "source_reputation_map",
                "value": default_reputation_map_json(),
                "description": "JSON map of source name substrings to reputation scores (0-25)",
            },
            {
                "key": "openai_model",
                "value": settings.OPENAI_MODEL,
                "description": "OpenAI model to use for AI analysis",
            },
            {
                "key": "openai_api_key",
                "value": settings.OPENAI_API_KEY,
                "description": "OpenAI API key for AI features",
            },
            {
                "key": "max_articles_per_collection",
                "value": "50",
                "description": "Maximum number of articles to collect per source per run",
            },
        ]

        for setting_data in default_settings:
            existing = db.query(Setting).filter(Setting.key == setting_data["key"]).first()
            if not existing:
                setting = Setting(
                    key=setting_data["key"],
                    value=setting_data["value"],
                    description=setting_data["description"],
                )
                db.add(setting)

        db.commit()
        logger.info("Database seeding complete")

    except Exception as exc:
        db.rollback()
        logger.error("Error during database seeding: %s", exc)
        raise
    finally:
        db.close()


def _seed_dev_mailpit_channel() -> None:
    """Auto-connect Mailpit in development so email publishing works without Gmail."""
    if settings.ENVIRONMENT != "development":
        return

    from app.repositories.publishing_channel import PublishingChannelRepository
    from app.services.mailpit_connect import connect_mailpit_channel

    db = SessionLocal()
    try:
        repo = PublishingChannelRepository(db)
        existing = repo.get_by_type("email")
        if existing is not None and existing.status == "connected":
            meta = repo.public_metadata(existing)
            if meta.get("smtp_host") == "mailpit":
                return

        connect_mailpit_channel(db, created_by=None, retries=5, retry_delay_seconds=2.0)
    except Exception as exc:
        logger.warning("Could not seed dev Mailpit channel: %s", exc)
        db.rollback()
    finally:
        db.close()


def _sync_approved_content_flags() -> None:
    """Fix legacy rows where articles are approved but content.is_approved is false."""
    from app.models.article import Article
    from app.models.content import GeneratedContent

    db = SessionLocal()
    try:
        approved = (
            db.query(Article)
            .filter(Article.status.in_(["approved", "published"]))
            .all()
        )
        for article in approved:
            records = (
                db.query(GeneratedContent)
                .filter(GeneratedContent.article_id == article.id)
                .all()
            )
            for record in records:
                record.is_approved = True
        if approved:
            db.commit()
            logger.info("Synced is_approved flag for %d approved articles", len(approved))
    except Exception as exc:
        logger.warning("Could not sync approved content flags: %s", exc)
        db.rollback()
    finally:
        db.close()


@app.get("/health")
def health_check() -> dict:
    return {"status": "healthy", "version": "1.0.0"}


# Import and include API router - done after app creation to avoid circular imports
try:
    from app.api.v1.router import router as api_router
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
except ImportError as exc:
    logger.warning("API router not yet available: %s", exc)

try:
    from app.api.linkedin_auth import router as linkedin_auth_router
    app.include_router(linkedin_auth_router, prefix="/auth", tags=["LinkedIn OAuth"])
except ImportError as exc:
    logger.warning("LinkedIn auth router not yet available: %s", exc)
