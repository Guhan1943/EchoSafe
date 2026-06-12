import logging
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.content import PublishedContent
from app.models.source import Source
from app.models.verification import VerificationResult

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview(self) -> dict:
        total_articles = self.db.query(func.count(Article.id)).scalar() or 0

        verified_count = (
            self.db.query(func.count(Article.id))
            .filter(Article.status == "ai_verified")
            .scalar()
            or 0
        )

        approved_count = (
            self.db.query(func.count(Article.id))
            .filter(Article.status == "approved")
            .scalar()
            or 0
        )

        published_count = (
            self.db.query(func.count(Article.id))
            .filter(Article.status == "published")
            .scalar()
            or 0
        )

        avg_trust_score = (
            self.db.query(func.avg(Article.trust_score)).scalar() or 0.0
        )
        avg_trust_score = round(float(avg_trust_score), 2)

        # verification_success_rate = articles that have a verification result / total
        verified_with_result = (
            self.db.query(func.count(VerificationResult.id)).scalar() or 0
        )
        verification_success_rate = (
            round(verified_with_result / total_articles * 100, 2)
            if total_articles > 0
            else 0.0
        )

        # Articles by severity
        severity_rows = (
            self.db.query(Article.severity, func.count(Article.id))
            .filter(Article.severity.isnot(None))
            .group_by(Article.severity)
            .all()
        )
        articles_by_severity = {row[0]: row[1] for row in severity_rows}

        # Articles by status
        status_rows = (
            self.db.query(Article.status, func.count(Article.id))
            .group_by(Article.status)
            .all()
        )
        articles_by_status = {row[0]: row[1] for row in status_rows}

        return {
            "total_articles": total_articles,
            "verified_count": verified_count,
            "approved_count": approved_count,
            "published_count": published_count,
            "avg_trust_score": avg_trust_score,
            "verification_success_rate": verification_success_rate,
            "articles_by_severity": articles_by_severity,
            "articles_by_status": articles_by_status,
        }

    def get_source_stats(self) -> list[dict]:
        rows = (
            self.db.query(
                Source.id,
                Source.name,
                func.count(Article.id).label("article_count"),
                func.avg(Article.trust_score).label("avg_trust_score"),
                func.max(Source.last_polled_at).label("last_collected"),
            )
            .outerjoin(Article, Article.source_id == Source.id)
            .group_by(Source.id, Source.name)
            .all()
        )

        result = []
        for row in rows:
            result.append(
                {
                    "source_id": row.id,
                    "name": row.name,
                    "article_count": row.article_count or 0,
                    "avg_trust_score": (
                        round(float(row.avg_trust_score), 2)
                        if row.avg_trust_score is not None
                        else 0.0
                    ),
                    "last_collected": row.last_collected,
                }
            )
        return result

    def get_trust_score_distribution(self) -> dict:
        ranges = [
            ("0-20", 0, 20),
            ("21-40", 21, 40),
            ("41-60", 41, 60),
            ("61-80", 61, 80),
            ("81-100", 81, 100),
        ]

        distribution = []
        for label, low, high in ranges:
            count = (
                self.db.query(func.count(Article.id))
                .filter(Article.trust_score >= low, Article.trust_score <= high)
                .scalar()
                or 0
            )
            distribution.append({"range": label, "count": count})

        avg_score = float(
            self.db.query(func.avg(Article.trust_score)).scalar() or 0.0
        )
        min_score = (
            self.db.query(func.min(Article.trust_score)).scalar() or 0
        )
        max_score = (
            self.db.query(func.max(Article.trust_score)).scalar() or 0
        )

        return {
            "distribution": distribution,
            "avg": round(avg_score, 2),
            "min": min_score,
            "max": max_score,
        }
