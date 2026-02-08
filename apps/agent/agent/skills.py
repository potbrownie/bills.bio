"""Agent skills: named capabilities with prompt fragment and tool subset.

Follows Claude/Cursor/Codex skill standards:
- name: lowercase-hyphens, max 64 chars.
- description: third person, WHAT + WHEN (explicit triggers), max 1024 chars.
- prompt_fragment: step-by-step instructions appended to system prompt when skill is active;
  use imperative language; assume no prior context; be explicit about tool choice and boundaries.

See docs/AGENT_ARCHITECTURE.md §7; OpenAI Codex create-skill; Claude Agent Skills best practices.
"""

from __future__ import annotations

from typing import Any

# Skill: name, description (for discovery/docs), prompt_fragment (appended to system prompt), tools (allowed tool names; empty = all).
SKILLS: dict[str, dict[str, Any]] = {
    "answer_about_bill": {
        "name": "answer_about_bill",
        "description": (
            "Answers questions about Bill, his work, interests, projects, and blog using profile data and optional web search. "
            "Use when the user asks about Bill, his site, his projects, his blog, his interests, or mixes Bill-related and general topics; "
            "also use for open-ended chat where the user may want information about Bill or the outside world. "
            "Prefers the profile tool for Bill-specific facts; uses web search only when the request requires current events, "
            "external sources, or information not in the profile."
        ),
        "prompt_fragment": (
            "\n\n--- SKILL: answer_about_bill ---\n"
            "Personal site. Be naturally curious and conversational.\n\n"
            "Key behaviors:\n"
            "- Start conversations: ask their name, what they do, what they're building\n"
            "- After they answer: acknowledge, then move forward naturally\n"
            "- Be brief but engaging: don't just say 'cool' repeatedly\n"
            "- Share your context when relevant (Brisbane, robots, what you're working on)\n"
            "- Balance: curious without interrogating, brief without boring\n\n"
            "Tools (use seamlessly):\n"
            "query_profile, web_search, schedule_meeting, send_email\n"
        ),
        "tools": ["query_profile", "web_search", "schedule_meeting", "send_email"],
    },
}

DEFAULT_SKILL = "answer_about_bill"


def get_skill(skill_id: str) -> dict[str, Any]:
    """Return skill config by id; fallback to default if unknown."""
    return SKILLS.get(skill_id, SKILLS[DEFAULT_SKILL])


def get_prompt_fragment(skill_id: str) -> str:
    """Return the prompt fragment for the skill (appended to system prompt)."""
    return get_skill(skill_id).get("prompt_fragment", "")


def get_allowed_tools(skill_id: str) -> list[str]:
    """Return the list of allowed tool names for the skill (empty = all)."""
    tools = get_skill(skill_id).get("tools", [])
    return list(tools) if tools else []
