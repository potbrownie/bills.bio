"""Memory layer using Mem0 OSS: add and search by session_id.

Mem0 extracts facts from conversation turns (add) and returns relevant
memories for a query (search). Scoped by session_id so each chat session
has its own memory. Disabled when MEMORY_ENABLED=false or mem0ai not installed.
See docs.mem0.ai (open-source Python quickstart).
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

logger = logging.getLogger(__name__)
perf_logger = logging.getLogger("agent.performance")

_MEMORY: Any = None
_MEMORY_INIT_FAILED: bool = False


def _is_enabled() -> bool:
    if os.environ.get("MEMORY_ENABLED", "true").strip().lower() in ("0", "false", "no"):
        return False
    return True


def _get_memory() -> Any | None:
    """Lazy-init Mem0 Memory(); return None if disabled or import fails."""
    global _MEMORY, _MEMORY_INIT_FAILED
    if _MEMORY is not None:
        return _MEMORY
    if _MEMORY_INIT_FAILED or not _is_enabled():
        return None
    try:
        from mem0 import Memory
        _MEMORY = Memory()
        logger.info("Mem0 OSS memory layer initialized.")
        return _MEMORY
    except ImportError as e:
        logger.warning("mem0ai not installed; memory disabled. pip install mem0ai. %s", e)
        _MEMORY_INIT_FAILED = True
        return None
    except Exception as e:
        # e.g. OpenAIError when OPENAI_API_KEY is missing (mem0 uses it for embeddings)
        logger.warning("Mem0 init failed; memory disabled. %s", e)
        _MEMORY_INIT_FAILED = True
        return None


def add_memory(messages: list[dict[str, Any]], session_id: str) -> None:
    """Store a conversation turn in Mem0. Uses session_id as user_id for scoping.

    Args:
        messages: List of {"role": "user"|"assistant", "content": str}.
        session_id: Scope key (e.g. client-generated session UUID).
    """
    mem = _get_memory()
    if not mem or not messages:
        return
    try:
        start = time.time()
        # Mem0 expects role/content; we may have content as list (multimodal). Normalize to str.
        normalized = []
        for m in messages:
            content = m.get("content")
            if isinstance(content, list):
                text = next((p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"), "")
            else:
                text = str(content) if content is not None else ""
            normalized.append({"role": m.get("role", "user"), "content": text})
        if not normalized:
            return
        mem.add(normalized, user_id=session_id)
        elapsed = time.time() - start
        perf_logger.info(f"Mem0 add: {elapsed:.3f}s (session={session_id}, messages={len(normalized)})")
        logger.debug("Mem0 add: session_id=%s messages=%d", session_id, len(normalized))
    except Exception as e:
        logger.warning("Mem0 add failed: %s", e)


def search_memory(query: str, session_id: str, top_k: int = 5) -> str:
    """Search Mem0 for relevant memories; return formatted string for system prompt.

    Args:
        query: Natural-language question or context (e.g. last user message).
        session_id: Scope key (same as add_memory).
        top_k: Max number of memories to return.

    Returns:
        Formatted string (e.g. "- Memory 1\\n- Memory 2") or empty if none.
    """
    mem = _get_memory()
    if not mem or not query.strip():
        return ""
    try:
        start = time.time()
        result = mem.search(query, user_id=session_id, limit=top_k)
        elapsed = time.time() - start
        
        if not result:
            perf_logger.info(f"Mem0 search: {elapsed:.3f}s (no results)")
            return ""
        
        # OSS may return dict with "results" or list of items with "memory" text.
        if isinstance(result, dict):
            items = result.get("results", result.get("memories", []))
        else:
            items = result if isinstance(result, list) else []
        texts = []
        for item in items:
            if isinstance(item, dict):
                text = item.get("memory", item.get("text", ""))
                if text:
                    texts.append(text.strip())
            elif isinstance(item, str):
                texts.append(item.strip())
        
        perf_logger.info(f"Mem0 search: {elapsed:.3f}s (found {len(texts)} memories)")
        
        if not texts:
            return ""
        return "Remembered from past conversation:\n" + "\n".join(f"- {t}" for t in texts)
    except Exception as e:
        logger.warning("Mem0 search failed: %s", e)
        return ""
