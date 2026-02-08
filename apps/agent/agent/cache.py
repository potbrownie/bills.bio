"""Optional in-memory TTL cache for profile and web search results.

Used when PROFILE_CACHE_TTL_SECONDS or SEARCH_CACHE_TTL_SECONDS are set.
Thread-safe; per-process (not shared across workers).
"""

from __future__ import annotations

import threading
import time
from typing import Any


class TTLCache:
    """In-memory cache with per-entry TTL. Thread-safe."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str, ttl_seconds: float) -> Any | None:
        """Return cached value if present and not expired; else None."""
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.monotonic() >= expiry:
                del self._data[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: float) -> None:
        """Store value with given TTL in seconds."""
        if ttl_seconds <= 0:
            return
        expiry = time.monotonic() + ttl_seconds
        with self._lock:
            self._data[key] = (value, expiry)


_profile_cache: TTLCache | None = None


def get_profile_cache() -> TTLCache:
    """Return shared profile cache singleton."""
    global _profile_cache
    if _profile_cache is None:
        _profile_cache = TTLCache()
    return _profile_cache


_search_cache: TTLCache | None = None


def get_search_cache() -> TTLCache:
    """Return shared search cache singleton."""
    global _search_cache
    if _search_cache is None:
        _search_cache = TTLCache()
    return _search_cache
