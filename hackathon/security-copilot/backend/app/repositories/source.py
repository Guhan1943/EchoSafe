from datetime import datetime
from typing import Optional

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.models.source import Source
from app.repositories.base import BaseRepository


class SourceRepository(BaseRepository[Source]):
    def __init__(self, db: Session) -> None:
        super().__init__(Source, db)

    def get_active_sources(self) -> list[Source]:
        stmt = select(Source).where(Source.is_active == True)  # noqa: E712
        return list(self.db.execute(stmt).scalars().all())

    def get_by_source_type(self, source_type: str) -> list[Source]:
        stmt = select(Source).where(Source.source_type == source_type)
        return list(self.db.execute(stmt).scalars().all())

    def update_last_polled(self, source_id: int) -> Optional[Source]:
        source = self.get(source_id)
        if source is None:
            return None
        source.last_polled_at = datetime.utcnow()
        self.db.add(source)
        self.db.commit()
        self.db.refresh(source)
        return source

    def get_due_for_polling(self) -> list[Source]:
        """Return active sources where last_polled_at is NULL or the elapsed time
        since last poll exceeds the configured polling_interval_minutes."""
        now = datetime.utcnow()
        # Fetch all active sources and filter in Python to avoid dialect-specific
        # interval arithmetic (works with both SQLite in tests and PostgreSQL in prod).
        stmt = select(Source).where(Source.is_active == True)  # noqa: E712
        sources = list(self.db.execute(stmt).scalars().all())
        due = []
        for source in sources:
            if source.last_polled_at is None:
                due.append(source)
            else:
                elapsed_minutes = (now - source.last_polled_at).total_seconds() / 60
                if elapsed_minutes >= source.polling_interval_minutes:
                    due.append(source)
        return due
