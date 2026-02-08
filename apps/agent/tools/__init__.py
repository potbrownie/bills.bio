"""Tool registry: definitions and execution for the agent."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Callable

from agent.cache import get_profile_cache, get_search_cache
from tools import profile as profile_tool
from tools import web_search as web_search_tool
from tools import schedule_meeting as schedule_meeting_tool
from tools import send_email as send_email_tool

logger = logging.getLogger(__name__)
perf_logger = logging.getLogger("agent.performance")

# OpenAI-compatible tool definitions for the API (name, description, parameters).
TOOLS_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "query_profile",
            "description": (
                "Query your profile: your bio, interests, projects, and blog post metadata. "
                "Use for any question about yourself, your work, your interests, or your blog. "
                "Prefer the user's exact wording for the query when it fits. Scope can be 'bio', 'interests', 'projects', 'blog', or 'all'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural language or keyword query. Prefer reusing the user's wording when appropriate.",
                    },
                    "scope": {
                        "type": "string",
                        "enum": ["bio", "interests", "projects", "blog", "all"],
                        "description": "Which part of the profile to return. Default 'all'.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the web for current or general information. "
                "Use when the user asks about things outside your profile or when you need "
                "up-to-date or third-party information. Prefer the user's wording for the search query when it fits."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query. Prefer reusing the user's wording when appropriate.",
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Maximum number of results (default 5).",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_meeting",
            "description": (
                "Schedule a Google Meet meeting with a qualified person who has a legitimate reason to meet. "
                "Use ONLY when someone explicitly requests to schedule a meeting, book time, or arrange a call. "
                "Requires: name, email, and a qualified reason (e.g., collaboration, hiring, partnership, investment, speaking opportunity). "
                "DO NOT use for casual chat, questions, or unqualified requests."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Full name of the person requesting the meeting.",
                    },
                    "email": {
                        "type": "string",
                        "description": "Email address where the meeting invite will be sent.",
                    },
                    "reason": {
                        "type": "string",
                        "description": "The reason for the meeting. Must be qualified and legitimate (e.g., business opportunity, collaboration, partnership, hiring discussion).",
                    },
                    "duration_minutes": {
                        "type": "integer",
                        "description": "Meeting duration in minutes (default 30).",
                    },
                },
                "required": ["name", "email", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": (
                "Send an email to Bill (the site owner). Use when someone wants to send a message, "
                "has a question that requires a detailed response, wants to leave feedback, or requests contact. "
                "Can be used for inquiries, feedback, business proposals, or any message that should reach Bill directly. "
                "If the sender provides their email, include it so Bill can reply."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Email subject line. Should be concise and descriptive.",
                    },
                    "message": {
                        "type": "string",
                        "description": "The email message/body content. Include all relevant details from the conversation.",
                    },
                    "sender_name": {
                        "type": "string",
                        "description": "Name of the person sending the message (if provided).",
                    },
                    "sender_email": {
                        "type": "string",
                        "description": "Email address of the sender (if provided). Will be added to reply-to field.",
                    },
                    "reply_to": {
                        "type": "string",
                        "description": "Reply-to email address. Defaults to sender_email if provided.",
                    },
                },
                "required": ["subject", "message"],
            },
        },
    },
]

_TOOL_EXECUTORS: dict[str, Callable[..., str]] = {
    "query_profile": profile_tool.query_profile,
    "web_search": web_search_tool.web_search,
    "schedule_meeting": schedule_meeting_tool.schedule_meeting,
    "send_email": send_email_tool.send_email,
}


def get_tool_definitions(allowed_names: list[str] | None = None) -> list[dict[str, Any]]:
    """Return OpenAI tool definitions, optionally filtered by allowed names.

    Args:
        allowed_names: If non-empty, only include tools whose name is in this list.
            If None or empty, return all tools.

    Returns:
        List of tool definition dicts for the API.
    """
    if not allowed_names:
        return list(TOOLS_DEFINITIONS)
    names_set = set(allowed_names)
    return [
        t for t in TOOLS_DEFINITIONS
        if t.get("function", {}).get("name") in names_set
    ]


def _cache_key(name: str, arguments: dict[str, Any]) -> str:
    """Generate cache key from tool name and arguments."""
    args_json = json.dumps(arguments, sort_keys=True)
    return hashlib.md5(f"{name}:{args_json}".encode()).hexdigest()


def execute_tool(name: str, arguments: dict[str, Any]) -> str:
    """Execute a tool by name with the given arguments (with caching).

    Args:
        name: Tool name (e.g. 'query_profile', 'web_search').
        arguments: JSON object of arguments (e.g. {'query': '...', 'scope': 'all'}).

    Returns:
        Tool result as a string. On error, returns an error message string.
    """
    if name not in _TOOL_EXECUTORS:
        return f"Error: Unknown tool '{name}'."
    
    # Apply defaults for optional args
    if name == "query_profile" and "scope" not in arguments:
        arguments = {**arguments, "scope": "all"}
    if name == "web_search" and "num_results" not in arguments:
        arguments = {**arguments, "num_results": 5}
    if name == "schedule_meeting" and "duration_minutes" not in arguments:
        arguments = {**arguments, "duration_minutes": 30}
    
    # Check cache
    cache_key = _cache_key(name, arguments)
    if name == "query_profile":
        cache = get_profile_cache()
        ttl = 300  # 5 minutes for profile data
        cached = cache.get(cache_key, ttl)
        if cached is not None:
            perf_logger.info(f"Tool {name} cache HIT")
            return cached
    elif name == "web_search":
        cache = get_search_cache()
        ttl = 60  # 1 minute for search results
        cached = cache.get(cache_key, ttl)
        if cached is not None:
            perf_logger.info(f"Tool {name} cache HIT")
            return cached
    
    # Execute tool
    fn = _TOOL_EXECUTORS[name]
    try:
        tool_start = time.time()
        result = fn(**arguments)
        tool_time = time.time() - tool_start
        perf_logger.info(f"Tool {name} executed in {tool_time:.3f}s")
        
        # Store in cache
        if name == "query_profile":
            get_profile_cache().set(cache_key, result, 300)
        elif name == "web_search":
            get_search_cache().set(cache_key, result, 60)
        
        return result
    except TypeError as e:
        return f"Tool argument error: {e!s}"
    except Exception as e:
        logger.exception(f"Tool {name} execution error")
        return f"Tool execution error: {e!s}"
