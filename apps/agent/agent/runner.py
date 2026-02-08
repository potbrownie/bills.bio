"""Agent loop: reason → act (tool) → observe → repeat until final text."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, AsyncGenerator

from openai import AsyncOpenAI

from agent.config import get_openai_max_tokens, get_openai_timeout_seconds
from agent.prompts import get_system_prompt
from agent.skills import get_allowed_tools
from agent.stream_events import (
    MAX_QUERY_PREVIEW_LENGTH,
    PHASE_THINKING,
    PHASE_TOOL_START,
    TYPE_DELTA,
    TYPE_SOURCES,
    TYPE_STATUS,
    build_status_event,
)
from tools import execute_tool, get_tool_definitions

MAX_STEPS = 5
DEFAULT_MODEL = "gpt-4o-mini"

logger = logging.getLogger(__name__)
perf_logger = logging.getLogger("agent.performance")
_MAX_LOG_RESULT = 200


def _create_kwargs() -> dict[str, Any]:
    """Build common kwargs for chat.completions.create (max_tokens, etc.)."""
    kwargs: dict[str, Any] = {}
    max_tokens = get_openai_max_tokens()
    if max_tokens is not None:
        kwargs["max_completion_tokens"] = max_tokens
    # Temperature balanced for natural but consistent responses
    kwargs["temperature"] = 0.8
    return kwargs


def _tool_subtitle(tool_name: str, args: dict[str, Any]) -> str:
    """Build a dynamic user-facing subtitle from the tool name and arguments."""
    query = (args.get("query") or "").strip()
    if len(query) > MAX_QUERY_PREVIEW_LENGTH:
        query = query[: MAX_QUERY_PREVIEW_LENGTH - 3].rstrip() + "..."
    if tool_name == "web_search":
        return f"Searching for {query}" if query else "Searching the web"
    if tool_name == "query_profile":
        return f"Looking up {query}" if query else "Checking Bill's profile"
    if tool_name == "schedule_meeting":
        name = (args.get("name") or "").strip()
        return f"Scheduling meeting with {name}" if name else "Scheduling meeting"
    if tool_name == "send_email":
        subject = (args.get("subject") or "").strip()
        if len(subject) > MAX_QUERY_PREVIEW_LENGTH:
            subject = subject[: MAX_QUERY_PREVIEW_LENGTH - 3].rstrip() + "..."
        return f"Sending email: {subject}" if subject else "Sending email"
    return tool_name.replace("_", " ").title()


def _messages_for_openai(
    messages: list[dict[str, Any]], system_prompt: str
) -> list[dict[str, Any]]:
    """Build OpenAI messages list with system prompt.

    OpenAI expects assistant messages with tool calls to use top-level tool_calls
    (not content[].type 'tool_use'), and tool results as separate role='tool' messages.
    """
    openai_messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt}
    ]
    for m in messages:
        role = m.get("role")
        content = m.get("content")
        if role == "assistant" and isinstance(content, list):
            text_parts: list[str] = []
            tool_calls_list: list[dict[str, Any]] = []
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "text":
                        text_parts.append(part.get("text", "") or "")
                    elif part.get("type") == "tool_use":
                        tc_id = part.get("tool_call_id", part.get("id", ""))
                        name = part.get("name", "")
                        inp = part.get("input", {})
                        tool_calls_list.append({
                            "id": tc_id,
                            "type": "function",
                            "function": {
                                "name": name,
                                "arguments": json.dumps(inp) if isinstance(inp, dict) else str(inp),
                            },
                        })
            if tool_calls_list:
                openai_messages.append({
                    "role": "assistant",
                    "content": (text_parts[0] if len(text_parts) == 1 else "\n".join(text_parts)) if text_parts else None,
                    "tool_calls": tool_calls_list,
                })
            elif text_parts:
                openai_messages.append({"role": "assistant", "content": "\n".join(text_parts)})
        elif role == "user" and isinstance(content, list):
            tool_results = [
                (p.get("tool_use_id", p.get("id", "")), p.get("content", ""))
                for p in content
                if isinstance(p, dict) and p.get("type") == "tool_result"
            ]
            if tool_results:
                for tool_call_id, tool_content in tool_results:
                    openai_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "content": tool_content if isinstance(tool_content, str) else json.dumps(tool_content),
                    })
            else:
                text = next(
                    (p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"),
                    str(content),
                )
                openai_messages.append({"role": "user", "content": text})
        elif role and content is not None:
            if role == "user":
                openai_messages.append({"role": "user", "content": content})
            elif role == "assistant":
                openai_messages.append({"role": "assistant", "content": content})
    return openai_messages


async def _run_agent_sync(
    client: AsyncOpenAI,
    openai_messages: list[dict[str, Any]],
    model: str,
    tools: list[dict[str, Any]],
    request_id: str | None = None,
) -> tuple[str, list[str]]:
    """Run the loop without streaming; return (final text, tools_used)."""
    tools_used: set[str] = set()
    step = 0
    timeout_sec = get_openai_timeout_seconds()
    create_kwargs = _create_kwargs()
    req_log = f" request_id={request_id}" if request_id else ""
    while step < MAX_STEPS:
        step += 1
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=openai_messages,
                    tools=tools,
                    tool_choice="auto",
                    stream=False,
                    **create_kwargs,
                ),
                timeout=timeout_sec,
            )
        except asyncio.TimeoutError:
            logger.warning("OpenAI request timed out after %s s%s", timeout_sec, req_log)
            return ("I'm sorry, the request took too long. Please try again.", sorted(tools_used))
        choice = response.choices[0]
        message = choice.message
        if getattr(message, "tool_calls", None) and message.tool_calls:
            openai_messages.append(
                {
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments or "{}",
                            },
                        }
                        for tc in message.tool_calls
                    ],
                }
            )
            tool_results = []
            for tc in message.tool_calls:
                tools_used.add(tc.function.name)
                args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                logger.info("tool_call name=%s args=%s%s", tc.function.name, args, req_log)
                result = execute_tool(tc.function.name, args)
                preview = result[: _MAX_LOG_RESULT] + "..." if len(result) > _MAX_LOG_RESULT else result
                logger.info("tool_result name=%s preview=%s%s", tc.function.name, preview, req_log)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": tc.id, "content": result}
                )
            for tr in tool_results:
                openai_messages.append({
                    "role": "tool",
                    "tool_call_id": tr["tool_use_id"],
                    "content": tr["content"],
                })
            continue
        return ((message.content or "").strip(), sorted(tools_used))
    return ("I'm sorry, I wasn't able to complete that. Please try again.", sorted(tools_used))


def _sources_event(tools_used: set[str]) -> dict[str, Any]:
    """Build sources event for UI (e.g. 'From Bill's profile' / 'From web')."""
    return {"type": TYPE_SOURCES, "tools": sorted(tools_used)}


async def _run_agent_stream(
    client: AsyncOpenAI,
    openai_messages: list[dict[str, Any]],
    model: str,
    tools: list[dict[str, Any]],
    request_id: str | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """Run the loop with streaming; yield status, delta, and sources events for the UI."""
    tools_used: set[str] = set()
    step = 0
    timeout_sec = get_openai_timeout_seconds()
    create_kwargs = _create_kwargs()
    req_log = f" request_id={request_id}" if request_id else ""
    while step < MAX_STEPS:
        step += 1
        use_stream = step == 1
        step_start = time.time()
        logger.info("stream step %s use_stream=%s%s", step, use_stream, req_log)
        yield build_status_event(PHASE_THINKING, "Thinking...")
        try:
            llm_start = time.time()
            if use_stream:
                response = await client.chat.completions.create(
                    model=model,
                    messages=openai_messages,
                    tools=tools,
                    tool_choice="auto",
                    stream=True,
                    **create_kwargs,
                )
                llm_init_time = time.time() - llm_start
                perf_logger.info(f"[{request_id}] LLM init (step {step}): {llm_init_time:.3f}s")
                logger.info("stream step %s create() returned, consuming stream%s", step, req_log)
            else:
                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=model,
                        messages=openai_messages,
                        tools=tools,
                        tool_choice="auto",
                        stream=False,
                        **create_kwargs,
                    ),
                    timeout=timeout_sec,
                )
        except asyncio.TimeoutError:
            logger.warning("OpenAI request timed out after %s s%s", timeout_sec, req_log)
            yield _sources_event(tools_used)
            yield {"type": TYPE_DELTA, "delta": "I'm sorry, the request took too long. Please try again."}
            return

        if use_stream:
            tool_calls_buffer: list[dict[str, Any]] = []
            chunk_count = 0
            async for chunk in response:
                chunk_count += 1
                if chunk_count == 1 or chunk_count % 20 == 0:
                    logger.info("stream step %s chunk %s%s", step, chunk_count, req_log)
                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta:
                    continue
                if getattr(delta, "content", None) and delta.content:
                    yield {"type": TYPE_DELTA, "delta": delta.content}
                if getattr(delta, "tool_calls", None) and delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index if tc.index is not None else len(tool_calls_buffer)
                        while len(tool_calls_buffer) <= idx:
                            tool_calls_buffer.append(
                                {"id": "", "name": "", "arguments": ""}
                            )
                        if tc.id:
                            tool_calls_buffer[idx]["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                tool_calls_buffer[idx]["name"] = tc.function.name
                            if tc.function.arguments:
                                tool_calls_buffer[idx]["arguments"] += (
                                    tc.function.arguments or ""
                                )

            stream_time = time.time() - llm_start
            perf_logger.info(f"[{request_id}] LLM streaming (step {step}): {stream_time:.3f}s ({chunk_count} chunks)")
            logger.info("stream step %s stream done chunks=%s tool_calls_buffer=%s%s", step, chunk_count, len(tool_calls_buffer), req_log)
            if tool_calls_buffer and any(t.get("name") for t in tool_calls_buffer):
                tool_calls_for_api = [
                    {
                        "id": t["id"],
                        "type": "function",
                        "function": {
                            "name": t["name"],
                            "arguments": t.get("arguments") or "{}",
                        },
                    }
                    for t in tool_calls_buffer
                    if t.get("name")
                ]
                openai_messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": tool_calls_for_api,
                })
                tool_results = []
                for t in tool_calls_buffer:
                    if not t.get("name"):
                        continue
                    tools_used.add(t["name"])
                    args = json.loads(t["arguments"]) if t.get("arguments") else {}
                    logger.info("tool_call name=%s args=%s%s", t["name"], args, req_log)
                    subtitle = _tool_subtitle(t["name"], args)
                    yield build_status_event(
                        PHASE_TOOL_START, subtitle, tool=t["name"]
                    )
                    tool_start = time.time()
                    result = execute_tool(t["name"], args)
                    tool_time = time.time() - tool_start
                    perf_logger.info(f"[{request_id}] Tool {t['name']}: {tool_time:.3f}s")
                    preview = result[: _MAX_LOG_RESULT] + "..." if len(result) > _MAX_LOG_RESULT else result
                    logger.info("tool_result name=%s preview=%s%s", t["name"], preview, req_log)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": t["id"],
                            "content": result,
                        }
                    )
                for tr in tool_results:
                    openai_messages.append({
                        "role": "tool",
                        "tool_call_id": tr["tool_use_id"],
                        "content": tr["content"],
                    })
                continue
            step_time = time.time() - step_start
            perf_logger.info(f"[{request_id}] Step {step} total: {step_time:.3f}s")
            yield _sources_event(tools_used)
            return

        # Non-streaming step (step > 1)
        choice = response.choices[0]
        message = choice.message
        if getattr(message, "tool_calls", None) and message.tool_calls:
            openai_messages.append(
                {
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments or "{}",
                            },
                        }
                        for tc in message.tool_calls
                    ],
                }
            )
            tool_results = []
            for tc in message.tool_calls:
                tools_used.add(tc.function.name)
                args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                logger.info("tool_call name=%s args=%s%s", tc.function.name, args, req_log)
                subtitle = _tool_subtitle(tc.function.name, args)
                yield build_status_event(
                    PHASE_TOOL_START, subtitle, tool=tc.function.name
                )
                result = execute_tool(tc.function.name, args)
                preview = result[: _MAX_LOG_RESULT] + "..." if len(result) > _MAX_LOG_RESULT else result
                logger.info("tool_result name=%s preview=%s%s", tc.function.name, preview, req_log)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": tc.id, "content": result}
                )
            for tr in tool_results:
                openai_messages.append({
                    "role": "tool",
                    "tool_call_id": tr["tool_use_id"],
                    "content": tr["content"],
                })
            continue
        text = (message.content or "").strip()
        if text:
            yield {"type": TYPE_DELTA, "delta": text}
        yield _sources_event(tools_used)
        return

    yield _sources_event(tools_used)
    yield {
        "type": TYPE_DELTA,
        "delta": "I'm sorry, I wasn't able to complete that. Please try again.",
    }


async def run_agent(
    messages: list[dict[str, Any]],
    *,
    model: str = DEFAULT_MODEL,
    context: str = "public",
    skill: str = "answer_about_bill",
    memory: str | None = None,
    visitor_context: str | None = None,
    stream: bool = False,
    request_id: str | None = None,
    mode: str = "default",
) -> dict[str, Any] | AsyncGenerator[dict[str, Any], None]:
    """Run the agent loop until the model returns a final text response.

    Args:
        messages: Conversation history (each has role and content).
        model: OpenAI model name.
        context: "public" or "private" for system prompt.
        memory: Optional memory from Mem0.
        visitor_context: Optional visitor profile context.
        skill: Skill id (default answer_about_bill).
        memory: Optional remembered context from Mem0 (session memory).
        stream: If True, return an async generator that yields events;
            otherwise return a dict with message and sources.
        request_id: Optional ID for request tracing in logs.
        mode: Conversation mode (default, funny, wise, annoyed).

    Returns:
        If stream is False: {"message": str, "sources": list[str]}.
        If stream is True: an async generator that yields status, delta, and sources events.
    """
    client = AsyncOpenAI(timeout=get_openai_timeout_seconds())
    system_prompt = get_system_prompt(context, skill, memory, visitor_context, mode)
    openai_messages = _messages_for_openai(messages, system_prompt)
    tools = get_tool_definitions(get_allowed_tools(skill))
    if stream:
        return _run_agent_stream(client, openai_messages, model, tools, request_id=request_id)
    text, sources = await _run_agent_sync(client, openai_messages, model, tools, request_id=request_id)
    return {"message": text, "sources": sources}
