"""
Background collection worker using APScheduler.

Start the scheduler via CollectionWorker.get_instance().start(db_session_factory).
The scheduler polls all active sources on a configurable interval (default: 60 min).
"""

import logging
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class CollectionWorker:
    """Singleton APScheduler wrapper for background article collection."""

    _instance: Optional["CollectionWorker"] = None

    def __init__(self) -> None:
        from apscheduler.schedulers.background import BackgroundScheduler

        self.scheduler = BackgroundScheduler(
            job_defaults={
                "coalesce": True,       # merge missed runs into a single execution
                "max_instances": 1,     # prevent overlapping collection jobs
                "misfire_grace_time": 60,
            }
        )
        self.is_running = False

    @classmethod
    def get_instance(cls) -> "CollectionWorker":
        """Return the singleton worker instance, creating it if necessary."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def start(self, db_session_factory: Callable, interval_minutes: int = 60) -> None:
        """Start the scheduler and add the periodic collection job."""
        if self.is_running:
            logger.warning("CollectionWorker is already running — skipping start")
            return

        self.scheduler.add_job(
            self.run_collection,
            trigger="interval",
            minutes=interval_minutes,
            id="collect_all_active",
            replace_existing=True,
            kwargs={"db_session_factory": db_session_factory},
        )

        self.scheduler.start()
        self.is_running = True
        logger.info(
            "CollectionWorker started — polling every %d minute(s)", interval_minutes
        )

    def run_collection(self, db_session_factory: Callable) -> None:
        """
        Execute a single collection run across all active sources,
        then verify any articles still in 'new' status.
        Called by APScheduler on the configured interval.
        """
        from app.services.collection import CollectionService
        from app.services.verification import VerificationService
        from app.models.article import Article

        db = db_session_factory()
        try:
            service = CollectionService(db)
            result = service.collect_all_active()
            logger.info(
                "Scheduled collection complete: %s sources processed, %s articles collected",
                result.get("sources_processed", 0),
                result.get("total_collected", 0),
            )

            # Auto-verify all articles still in 'new' status
            new_articles = db.query(Article).filter(Article.status == "new").all()
            if new_articles:
                logger.info("Auto-verifying %d unverified article(s)...", len(new_articles))
                verify_service = VerificationService(db)
                verified = 0
                for article in new_articles:
                    try:
                        verify_service.verify_article(article.id)
                        verified += 1
                    except Exception as exc:
                        logger.warning("Failed to verify article %d: %s", article.id, exc)
                logger.info("Auto-verification complete: %d/%d verified", verified, len(new_articles))
        except Exception as exc:
            logger.error("Scheduled collection failed: %s", exc, exc_info=True)
            try:
                db.rollback()
            except Exception:
                pass
        finally:
            try:
                db.close()
            except Exception:
                pass

    def stop(self) -> None:
        """Shut down the scheduler gracefully."""
        if not self.is_running:
            return
        try:
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            logger.info("CollectionWorker stopped")
        except Exception as exc:
            logger.error("Error stopping CollectionWorker: %s", exc)


def start_collection_worker() -> None:
    """
    Initialise and start the background collection worker.
    Called from application startup when ENVIRONMENT != 'test'.
    """
    from app.config import settings
    from app.database import SessionLocal

    if settings.ENVIRONMENT == "test":
        logger.info("Skipping CollectionWorker startup in test environment")
        return

    try:
        worker = CollectionWorker.get_instance()
        worker.start(db_session_factory=SessionLocal)
    except Exception as exc:
        logger.error(
            "Failed to start CollectionWorker — background collection disabled: %s", exc
        )


def stop_collection_worker() -> None:
    """Stop the background collection worker. Called from application shutdown."""
    worker = CollectionWorker.get_instance()
    worker.stop()
