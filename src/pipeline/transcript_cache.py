from __future__ import annotations

import hashlib


def normalize_transcript(text: str) -> str:
    """
    Normalize transcript text for cache hashing only.

    Behavior is intentionally limited to newline normalization and trim so the
    cache key remains deterministic without mutating transcript meaning.
    """

    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


def transcript_hash(normalized_text: str) -> str:
    """Return a deterministic SHA-256 digest for normalized transcript text."""

    return hashlib.sha256(normalized_text.encode("utf-8")).hexdigest()
