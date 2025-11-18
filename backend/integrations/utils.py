from __future__ import annotations

import base64
import logging
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger("corbi.audit")


def _get_fernet() -> Fernet:
    key = getattr(settings, "FERNET_KEY", None) or _fallback_key()
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def _fallback_key() -> bytes:
    # derive a deterministic key from SECRET_KEY as a last resort (dev only)
    raw = getattr(settings, "SECRET_KEY", "fallback-secret-key")
    padded = base64.urlsafe_b64encode(raw.encode()[:32].ljust(32, b"0"))
    return padded


def encrypt_token(token: str) -> str:
    f = _get_fernet()
    return f.encrypt(token.encode()).decode()


def decrypt_token(token_encrypted: str) -> str | None:
    f = _get_fernet()
    try:
        return f.decrypt(token_encrypted.encode()).decode()
    except (InvalidToken, AttributeError):
        logger.warning("token.decrypt_failed")
        return None
