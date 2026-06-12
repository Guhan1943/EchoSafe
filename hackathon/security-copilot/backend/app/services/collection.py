import hashlib
import logging
from datetime import datetime
from typing import Optional

import feedparser
from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.source import Source

logger = logging.getLogger(__name__)


class CollectionService:
    def __init__(self, db: Session):
        self.db = db

    def collect_from_source(self, source_id: int) -> dict:
        """
        Collect articles from a single source.
        Returns {collected: int, errors: int, articles: list}
        """
        source = self.db.query(Source).filter(Source.id == source_id).first()
        if source is None:
            return {"collected": 0, "errors": 1, "articles": []}

        collected = 0
        errors = 0
        articles = []

        try:
            if source.source_type == "rss_feed":
                entries = self.fetch_rss(source.url)
            else:
                # For other types, also try RSS parsing as a best-effort
                entries = self.fetch_rss(source.url)

            for entry in entries:
                try:
                    url = entry.get("url")
                    if not url:
                        errors += 1
                        continue

                    content_hash = self._compute_hash(url)

                    # Deduplicate by URL
                    existing = (
                        self.db.query(Article)
                        .filter(Article.url == url)
                        .first()
                    )
                    if existing is not None:
                        continue

                    article = Article(
                        source_id=source.id,
                        title=entry.get("title", "Untitled")[:1024],
                        url=url[:2048],
                        content=entry.get("content"),
                        summary=entry.get("summary"),
                        author=entry.get("author"),
                        published_at=entry.get("published_at"),
                        content_hash=content_hash,
                        status="new",
                    )
                    self.db.add(article)
                    self.db.flush()
                    collected += 1
                    articles.append({"id": article.id, "title": article.title, "url": url})
                except Exception as exc:
                    logger.warning("Error saving article entry: %s", exc)
                    errors += 1

            # Update last_polled_at
            source.last_polled_at = datetime.utcnow()
            self.db.commit()

        except Exception as exc:
            logger.error("Error collecting from source %s: %s", source_id, exc)
            self.db.rollback()
            errors += 1

        return {"collected": collected, "errors": errors, "articles": articles}

    def collect_all_active(self) -> dict:
        """
        Collect from all active sources.
        Returns {sources_processed: int, total_collected: int}
        """
        sources = self.db.query(Source).filter(Source.is_active == True).all()  # noqa: E712
        sources_processed = 0
        total_collected = 0

        for source in sources:
            result = self.collect_from_source(source.id)
            sources_processed += 1
            total_collected += result.get("collected", 0)

        return {"sources_processed": sources_processed, "total_collected": total_collected}

    def fetch_rss(self, url: str) -> list[dict]:
        """
        Fetch and parse an RSS/Atom feed.
        Returns a list of dicts with normalized fields.
        """
        entries = []
        try:
            feed = feedparser.parse(url)

            for entry in feed.entries:
                link = getattr(entry, "link", None) or getattr(entry, "id", None)
                if not link:
                    continue

                title = getattr(entry, "title", "Untitled")

                # Summary / content
                summary = None
                content = None
                if hasattr(entry, "summary"):
                    summary = entry.summary
                if hasattr(entry, "content") and entry.content:
                    # feedparser content is a list of dicts
                    content = entry.content[0].get("value", "") if entry.content else None

                author = getattr(entry, "author", None)

                published_at = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    published_at = self._parse_date(entry.published_parsed)
                elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                    published_at = self._parse_date(entry.updated_parsed)

                entries.append(
                    {
                        "title": title,
                        "url": link,
                        "summary": summary,
                        "content": content,
                        "author": author,
                        "published_at": published_at,
                        "external_id": getattr(entry, "id", None) or self._compute_hash(link),
                    }
                )
        except Exception as exc:
            logger.error("Error fetching RSS feed %s: %s", url, exc)

        return entries

    def _compute_hash(self, url: str) -> str:
        """SHA256 hash of URL for deduplication."""
        return hashlib.sha256(url.encode("utf-8")).hexdigest()

    def _parse_date(self, date_tuple) -> Optional[datetime]:
        """
        Parse a feedparser date tuple (time.struct_time) into a datetime.
        Returns None on failure.
        """
        if date_tuple is None:
            return None
        try:
            import time
            ts = time.mktime(date_tuple)
            return datetime.utcfromtimestamp(ts)
        except Exception:
            return None
