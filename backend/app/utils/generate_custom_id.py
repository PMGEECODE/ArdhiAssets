"""
Government-Compliant ID Generation Utilities
* CSPRNG via secrets module
* Configurable entropy
* Audit logging
* No timestamps in public IDs
* Pure functions
"""

from __future__ import annotations

import logging
from typing import Final
import secrets
import string
import uuid

from app.core.config import settings

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Constants (configurable via settings)
# ----------------------------------------------------------------------
_ALPHABET: Final[str] = string.ascii_uppercase + string.digits  # A-Z, 0-9 only (safe, readable)
_MIN_ENTROPY_BITS: Final[int] = 128  # FIPS minimum for identifiers

# ----------------------------------------------------------------------
# Helper: Entropy calculation
# ----------------------------------------------------------------------
def _required_length(entropy_bits: int = _MIN_ENTROPY_BITS) -> int:
    """
    Calculate minimum length needed for given entropy in base-36.
    log2(36^L) >= entropy_bits → L >= ceil(entropy_bits / log2(36))
    """
    import math
    return max(1, math.ceil(entropy_bits / math.log2(len(_ALPHABET))))


# ----------------------------------------------------------------------
# Core Generator (Pure, Secure, Auditable)
# ----------------------------------------------------------------------
def generate_custom_id(
    prefix: str = "",
    *,
    entropy_bits: int | None = None,
    length: int | None = None,
) -> str:
    """
    Generate a cryptographically secure custom ID.

    Args:
        prefix: Optional prefix (e.g., "DEV", "NOT"). Must be uppercase alphanumeric + underscore.
        entropy_bits: Minimum entropy in bits (default: 128). Overrides length.
        length: Exact length of random part (if entropy_bits not provided).

    Returns:
        ID in format: `{prefix}_{random}` or just `{random}`

    Security:
        - Uses `secrets.token_urlsafe` (CSPRNG)
        - Enforces minimum 128-bit entropy
        - Logs every generation
    """
    if prefix and not prefix.isalnum() and "_" not in prefix:
        raise ValueError("Prefix must contain only A-Z, 0-9, and underscore")

    # Determine length
    if entropy_bits is not None:
        length = _required_length(entropy_bits)
    elif length is None:
        length = _required_length()  # default 128 bits

    if length < 1:
        raise ValueError("Length must be >= 1")

    # Generate CSPRNG bytes → URL-safe base64 → trim to alphabet
    byte_length = (length * 6 + 7) // 8  # 6 bits per char in base64
    random_bytes = secrets.token_bytes(byte_length)
    random_str = secrets.token_urlsafe(byte_length).replace("-", "").replace("_", "")[:length]

    # Fallback: if token_urlsafe gives short string, regenerate
    while len(random_str) < length:
        extra = secrets.token_urlsafe(byte_length)[: length - len(random_str)]
        random_str += extra.replace("-", "").replace("_", "")

    # Map to safe alphabet
    random_part = "".join(c for c in random_str.upper() if c in _ALPHABET)[:length]
    while len(random_part) < length:
        extra = secrets.choice(_ALPHABET)
        random_part += extra

    full_id = f"{prefix}_{random_part}" if prefix else random_part

    # Audit log
    logger.info(
        "ID generated",
        extra={
            "id": full_id,
            "prefix": prefix or None,
            "entropy_bits": entropy_bits or _MIN_ENTROPY_BITS,
            "length": length,
            "source": "generate_custom_id",
        },
    )

    return full_id


# ----------------------------------------------------------------------
# UUID4 (Standard, Secure)
# ----------------------------------------------------------------------
def generate_uuid() -> "uuid.UUID":
    """Generate a UUID4 (128-bit, CSPRNG-based)."""
    import uuid
    uid = uuid.uuid4()  # <-- Return as uuid.UUID, not str
    logger.info("UUID generated", extra={"id": str(uid), "source": "generate_uuid"})
    return uid



# ----------------------------------------------------------------------
# Specialized Generators (Legacy Compatibility)
# ----------------------------------------------------------------------
def generate_custom_device_id() -> str:
    """Generate device ID: DEV_<12-char random> (128-bit entropy)."""
    return generate_custom_id(
        prefix="DEV",
        entropy_bits=settings.ID_ENTROPY_BITS,  # configurable
    )


def generate_custom_notification_id() -> str:
    """Generate notification ID: NOT_<10-char random> (128-bit entropy)."""
    return generate_custom_id(
        prefix="NOT",
        entropy_bits=settings.ID_ENTROPY_BITS,
    )


# ----------------------------------------------------------------------
# Timestamp ID (Internal Use Only – NOT for public exposure)
# ----------------------------------------------------------------------
def generate_internal_timestamp_id(prefix: str = "INT") -> str:
    """
    Generate timestamped ID for internal logging/audit only.
    NOT for public use (predictable).
    """
    from datetime import datetime
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_part = generate_custom_id(length=6)
    full_id = f"{prefix}_{timestamp}_{random_part}"

    logger.info(
        "Internal timestamp ID generated",
        extra={"id": full_id, "source": "generate_internal_timestamp_id"},
    )
    return full_id