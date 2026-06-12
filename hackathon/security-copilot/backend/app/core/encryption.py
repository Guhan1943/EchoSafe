import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet

from app.config import settings


def _fernet_key() -> bytes:
    raw = getattr(settings, "ENCRYPTION_KEY", "") or settings.SECRET_KEY
    digest = hashlib.sha256(raw.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_json(data: dict[str, Any]) -> str:
    f = Fernet(_fernet_key())
    return f.encrypt(json.dumps(data).encode()).decode()


def decrypt_json(token: str) -> dict[str, Any]:
    f = Fernet(_fernet_key())
    return json.loads(f.decrypt(token.encode()).decode())
