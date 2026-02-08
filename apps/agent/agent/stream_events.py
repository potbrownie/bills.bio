"""Stream event types and payload builders for the agent SSE API.

Follows SSE best practices: structured payloads, category/phase naming,
timestamps for ordering, and sanitized user-facing text.
See docs/AGENT_ARCHITECTURE.md §4.1 and §15 (Turn 5).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

# Stream event types (yielded by runner, consumed by main.py).
TYPE_STATUS = "status"
TYPE_DELTA = "delta"
TYPE_SOURCES = "sources"

# Status phases (present tense for in-progress; category:action style).
PHASE_THINKING = "thinking"
PHASE_TOOL_START = "tool_start"

# Bounds for user-facing subtitles (compact, safe for JSON and UI).
MAX_SUBTITLE_LENGTH = 120
MAX_QUERY_PREVIEW_LENGTH = 50


def sanitize_subtitle(text: str) -> str:
    """Sanitize subtitle for safe display and JSON.

    Strips control characters, normalizes whitespace, and truncates.
    """
    if not text or not isinstance(text, str):
        return ""
    # Strip control chars and normalize whitespace to single space.
    cleaned = re.sub(r"[\x00-\x1f\x7f]+", " ", text)
    cleaned = " ".join(cleaned.split())
    if len(cleaned) > MAX_SUBTITLE_LENGTH:
        cleaned = cleaned[: MAX_SUBTITLE_LENGTH - 3].rstrip() + "..."
    return cleaned


def build_status_event(
    phase: str,
    subtitle: str,
    *,
    tool: str | None = None,
) -> dict[str, Any]:
    """Build a status event payload (phase, subtitle, tool?, timestamp).

    Caller should yield {"type": TYPE_STATUS, **payload} or merge
    into a single payload. Timestamp is ISO 8601 UTC for ordering.
    """
    return {
        "type": TYPE_STATUS,
        "phase": phase,
        "subtitle": sanitize_subtitle(subtitle),
        "tool": tool,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
