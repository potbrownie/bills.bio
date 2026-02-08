"""In-memory rate limiter for chat endpoints (public vs private context).

Public: stricter limit (e.g. N messages per IP per hour) to control cost and abuse.
Private (Bill): higher or no limit. See docs/AGENT_ARCHITECTURE.md §2 and Phase 2.
"""

from __future__ import annotations

import os
import threading
import time
from typing import Optional

# Defaults: public 20/hour, private 100/hour (0 = no limit).
RATE_LIMIT_PUBLIC_PER_HOUR = int(os.environ.get("RATE_LIMIT_PUBLIC_PER_HOUR", "20"))
RATE_LIMIT_PRIVATE_PER_HOUR = int(
    os.environ.get("RATE_LIMIT_PRIVATE_PER_HOUR", "100")
)
WINDOW_SECONDS = 3600


class RateLimiter:
    """Fixed-window rate limiter per (client_id, context)."""

    __slots__ = ("_window_sec", "_limits", "_counts", "_windows", "_lock")

    def __init__(
        self,
        window_sec: int = WINDOW_SECONDS,
        public_limit: int = RATE_LIMIT_PUBLIC_PER_HOUR,
        private_limit: int = RATE_LIMIT_PRIVATE_PER_HOUR,
    ) -> None:
        self._window_sec = window_sec
        self._limits = {"public": public_limit, "private": private_limit}
        self._counts: dict[tuple[str, str], int] = {}
        self._windows: dict[tuple[str, str], int] = {}
        self._lock = threading.Lock()

    def _window_id(self) -> int:
        return int(time.time() // self._window_sec)

    def is_allowed(self, client_id: str, context: str) -> bool:
        """Return True if the request is within limit, False if rate limited."""
        limit = self._limits.get(context, self._limits["public"])
        if limit <= 0:
            return True
        key = (client_id, context)
        now_id = self._window_id()
        with self._lock:
            window_id = self._windows.get(key)
            if window_id is None or window_id != now_id:
                self._counts[key] = 0
                self._windows[key] = now_id
            count = self._counts[key]
            if count >= limit:
                return False
            self._counts[key] = count + 1
            return True

    def remaining(self, client_id: str, context: str) -> Optional[int]:
        """Return remaining requests in the current window, or None if no limit."""
        limit = self._limits.get(context, self._limits["public"])
        if limit <= 0:
            return None
        key = (client_id, context)
        now_id = self._window_id()
        with self._lock:
            window_id = self._windows.get(key)
            if window_id is None or window_id != now_id:
                return limit
            return max(0, limit - self._counts[key])


# Module-level singleton for use in FastAPI dependency.
_limiter: Optional[RateLimiter] = None


def get_limiter() -> RateLimiter:
    """Return the global rate limiter instance."""
    global _limiter
    if _limiter is None:
        _limiter = RateLimiter(
            window_sec=WINDOW_SECONDS,
            public_limit=RATE_LIMIT_PUBLIC_PER_HOUR,
            private_limit=RATE_LIMIT_PRIVATE_PER_HOUR,
        )
    return _limiter
