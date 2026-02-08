---
name: bills-bio-agent
description: Edits and extends the bills.bio Python agent (FastAPI, OpenAI, tools, streaming). Use when modifying the agent loop, prompts, tools (query_profile, web_search), skills, rate limits, or chat API; when adding new tools or skills; or when debugging agent/runner, main.py, or docs/AGENT_ARCHITECTURE.md.
---

# Bills.bio Agent

## Key files

| Purpose | Path |
|--------|------|
| API entry, chat endpoints, rate limit | `agent/main.py` |
| Agent loop, tool dispatch, streaming | `agent/agent/runner.py` |
| System prompts, context/skill | `agent/agent/prompts.py` |
| Skill definitions (name, description, tools) | `agent/agent/skills.py` |
| Tool registry, execute_tool, get_tool_definitions | `agent/tools/__init__.py` |
| Profile tool | `agent/tools/profile.py` |
| Web search tool | `agent/tools/web_search.py` |
| Stream events (status/delta, sanitize) | `agent/agent/stream_events.py` |
| Memory (Mem0 OSS, add/search by session) | `agent/agent/memory_layer.py` |
| Rate limiter (public/private per hour) | `agent/agent/rate_limit.py` |
| Optional SSM config load | `agent/agent/config.py` |
| Profile data (JSON) | `agent/data/profile.json` |
| Architecture and progress | `docs/AGENT_ARCHITECTURE.md` |
| Python style | `docs/CODE_GUIDELINES.md` |

## Conventions

- **Skills**: Name lowercase-hyphens; description third person, WHAT + WHEN (max 1024 chars). Each skill has `prompt_fragment` and `tools` list. Only `answer_about_bill` is defined; unknown skill ids fall back to it.
- **Stream events**: Use `agent.stream_events` constants and `build_status_event()`; no magic strings. Status payload has phase, subtitle, tool?, timestamp.
- **Run locally**: From repo root, start agent with `cd agent && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000`. Next.js proxy uses `AGENT_API_URL` (default `http://localhost:8000`).
- **Chat API**: POST body includes `messages`, `context` (public/private), `skill` (default answer_about_bill), optional `session_id` (Mem0 memory scope per session). Rate limit per (client IP, context). Responses include `sources` (tool names used). Memory: search before run, add after; use `memory` param in prompts/runner.

## Adding a tool

1. Implement in `agent/tools/<name>.py`; add to `TOOLS_DEFINITIONS` and `_TOOL_EXECUTORS` in `agent/tools/__init__.py`.
2. Add default args in `execute_tool` if needed.
3. Add subtitle in `agent/agent/runner.py` `_tool_subtitle()` for dynamic status.
4. Include in skills' `tools` list in `agent/agent/skills.py` where relevant.
5. Add a human-readable label in `components/Chat.tsx` `TOOL_LABELS` so the UI shows "From X" under assistant messages.

## Adding a skill

1. Add entry to `SKILLS` in `agent/agent/skills.py` with `name`, `description` (third person, WHAT + WHEN), `prompt_fragment`, `tools`.
2. No change to runner; prompt and tool list are selected by skill id from the request.
