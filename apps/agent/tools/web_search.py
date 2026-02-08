"""Web search tool using an external search API (e.g. Serper)."""

from __future__ import annotations

import os
from typing import Any

import httpx


def web_search(query: str, num_results: int = 5) -> str:
    """Search the web and return titles, snippets, and URLs.

    Args:
        query: Search query string.
        num_results: Maximum number of results to return (default 5).

    Returns:
        A text block of search results (title, snippet, url per result)
        for the LLM to summarize. If the API key is missing or the request
        fails, returns an error message string.
    """
    ttl = int(os.environ.get("SEARCH_CACHE_TTL_SECONDS", "0") or "0")
    cache = None
    key = f"search:{query}:{num_results}"
    if ttl > 0:
        from agent.cache import get_search_cache
        cache = get_search_cache()
        cached = cache.get(key, float(ttl))
        if cached is not None:
            return cached

    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        return "Error: SERPER_API_KEY is not set. Web search is unavailable."

    url = "https://google.serper.dev/search"
    payload: dict[str, Any] = {"q": query, "num": min(num_results, 10)}
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as e:
        return f"Web search request failed: {e!s}"
    except Exception as e:
        return f"Web search error: {e!s}"

    organic = data.get("organic", [])
    if not organic:
        return "No search results found."

    lines: list[str] = []
    for i, item in enumerate(organic[:num_results], 1):
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        link = item.get("link", "")
        lines.append(f"{i}. {title}\n   {snippet}\n   URL: {link}")
    result = "\n\n".join(lines)
    if ttl > 0 and cache is not None:
        cache.set(key, result, float(ttl))
    return result
