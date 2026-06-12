import json
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.encryption import decrypt_json, encrypt_json
from app.models.publishing_channel import PublishingChannel


class PublishingChannelRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_type(self, channel_type: str) -> Optional[PublishingChannel]:
        return (
            self.db.query(PublishingChannel)
            .filter(PublishingChannel.channel_type == channel_type)
            .first()
        )

    def list_all(self) -> list[PublishingChannel]:
        return self.db.query(PublishingChannel).order_by(PublishingChannel.channel_type).all()

    def get_credentials(self, channel_type: str) -> Optional[dict[str, Any]]:
        channel = self.get_by_type(channel_type)
        if channel is None or not channel.encrypted_credentials:
            return None
        return decrypt_json(channel.encrypted_credentials)

    def upsert(
        self,
        channel_type: str,
        *,
        status: str,
        metadata: dict[str, Any],
        credentials: Optional[dict[str, Any]] = None,
        created_by: Optional[int] = None,
    ) -> PublishingChannel:
        channel = self.get_by_type(channel_type)
        meta_json = json.dumps(metadata)
        cred_blob = encrypt_json(credentials) if credentials else None

        if channel is None:
            channel = PublishingChannel(
                channel_type=channel_type,
                status=status,
                config_metadata=meta_json,
                encrypted_credentials=cred_blob,
                connected_at=datetime.utcnow() if status == "connected" else None,
                created_by=created_by,
            )
            self.db.add(channel)
        else:
            channel.status = status
            channel.config_metadata = meta_json
            if cred_blob is not None:
                channel.encrypted_credentials = cred_blob
            channel.connected_at = datetime.utcnow() if status == "connected" else None
            channel.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(channel)
        return channel

    def disconnect(self, channel_type: str) -> Optional[PublishingChannel]:
        channel = self.get_by_type(channel_type)
        if channel is None:
            return None
        channel.status = "disconnected"
        channel.encrypted_credentials = None
        channel.connected_at = None
        channel.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(channel)
        return channel

    @staticmethod
    def public_metadata(channel: PublishingChannel) -> dict[str, Any]:
        if not channel.config_metadata:
            return {}
        return json.loads(channel.config_metadata)
