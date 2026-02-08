#!/usr/bin/env python3
"""FastAPI app for Bill's agent: /health, /chat, /chat/stream."""

from __future__ import annotations

import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI

from agent.config import load_env_from_ssm
from agent.memory_layer import add_memory, search_memory
from agent.rate_limit import get_limiter
from agent.runner import run_agent
from db.postgres import PostgresDB
from extractors.simple_profile_extractor import AsyncProfileUpdater

# Load .env file
_env = Path(__file__).resolve().parent / ".env"
if _env.exists():
    load_dotenv(_env)

# Get loggers
logger = logging.getLogger("agent.main")
perf_logger = logging.getLogger("agent.performance")

# Show INFO logs for visibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Optional: load OPENAI_API_KEY, SERPER_API_KEY, etc. from AWS SSM when USE_SSM=true.
load_env_from_ssm()

app = FastAPI(title="Bill's Agent API", version="1.0.0")

# CORS - allow requests from Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://billsbio.vercel.app",
        "https://*.vercel.app",
        "http://localhost:3000",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and profile updater
db = PostgresDB()
openai_client = AsyncOpenAI()
profile_updater = AsyncProfileUpdater(openai_client, db)


@app.on_event("startup")
async def startup():
    """Initialize database connection pool"""
    await db.connect()
    logger.info("Database connection pool initialized")


@app.on_event("shutdown")
async def shutdown():
    """Close database connection pool"""
    await db.close()
    logger.info("Database connection pool closed")


class ChatMessage(BaseModel):
    """A single chat message."""

    role: str
    content: str | list[Any]


class ChatRequest(BaseModel):
    """Request body for /chat and /chat/stream."""

    messages: list[ChatMessage]
    context: str = "public"
    skill: str = "answer_about_bill"
    session_id: str | None = None  # Required for profile matching
    ip: str | None = None  # Optional; for profile matching
    fingerprint: str | None = None  # Optional; for profile matching
    mode: str = "default"  # Conversation mode: default, funny, wise, annoyed


class ChatResponse(BaseModel):
    """Non-streaming chat response."""

    message: str
    sources: list[str] = []


def _client_id(request: Request) -> str:
    """Client identifier for rate limiting (IP; respects X-Forwarded-For behind proxy)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check for load balancers and Docker."""
    from agent.memory_layer import _get_memory, _is_enabled, _MEMORY_INIT_FAILED
    
    response: dict[str, Any] = {
        "status": "ok",
        "services": {}
    }
    
    # Check mem0 status
    mem0_enabled = _is_enabled()
    mem0_initialized = _get_memory() is not None
    
    if not mem0_enabled:
        response["services"]["mem0"] = {
            "status": "disabled",
            "message": "Memory is disabled via MEMORY_ENABLED=false"
        }
    elif _MEMORY_INIT_FAILED:
        response["services"]["mem0"] = {
            "status": "failed",
            "message": "Mem0 initialization failed (check logs for details)"
        }
    elif mem0_initialized:
        response["services"]["mem0"] = {
            "status": "operational",
            "message": "Mem0 memory layer is initialized and ready"
        }
    else:
        response["services"]["mem0"] = {
            "status": "unknown",
            "message": "Mem0 status could not be determined"
        }
    
    return response


def _ensure_rate_limit(request: Request, context: str) -> None:
    """Raise 429 if over limit for (client_id, context)."""
    limiter = get_limiter()
    client_id = _client_id(request)
    if not limiter.is_allowed(client_id, context):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again later.",
        )


def _last_user_content(messages: list[dict[str, Any]]) -> str:
    """Extract last user message content as string for memory search."""
    for m in reversed(messages):
        if m.get("role") == "user":
            c = m.get("content")
            if isinstance(c, str):
                return c
            if isinstance(c, list):
                return next(
                    (p.get("text", "") for p in c if isinstance(p, dict) and p.get("type") == "text"),
                    "",
                )
            return str(c) if c is not None else ""
    return ""


def _format_visitor_context(profile: dict[str, Any]) -> str:
    """Format visitor profile data for AI context."""
    if not profile:
        return ""
    
    parts = []
    name = profile.get("name", "")
    status = profile.get("status", "anonymous")
    data = profile.get("data", {})
    
    # Handle case where data is a JSON string
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, TypeError):
            data = {}
    
    # Basic info
    if name and name != "Anonymous":
        parts.append(f"You're talking to {name}")
        if status == "identified":
            parts.append("(identified visitor)")
    else:
        parts.append("You're talking to a new visitor")
    
    # Professional context
    if data.get("professional"):
        prof = data["professional"]
        prof_parts = []
        if prof.get("title"):
            prof_parts.append(prof["title"])
        if prof.get("company"):
            prof_parts.append(f"at {prof['company']}")
        if prof_parts:
            parts.append("Work: " + " ".join(prof_parts))
    
    # Location
    if data.get("location"):
        loc = data["location"]
        loc_parts = []
        if loc.get("city"):
            loc_parts.append(loc["city"])
        if loc.get("country"):
            loc_parts.append(loc["country"])
        if loc_parts:
            parts.append("Location: " + ", ".join(loc_parts))
    
    # Context/interests
    if data.get("context"):
        ctx = data["context"]
        if ctx.get("why_visiting"):
            parts.append(f"Why: {ctx['why_visiting']}")
        if ctx.get("looking_for"):
            parts.append(f"Looking for: {ctx['looking_for']}")
    
    if data.get("interests"):
        interests = data["interests"]
        if interests.get("topics"):
            parts.append("Interests: " + ", ".join(interests["topics"][:5]))  # Top 5
    
    # Socials (if they want to connect)
    if data.get("socials"):
        socials = data["socials"]
        social_list = []
        for platform in ["twitter", "linkedin", "github"]:
            if socials.get(platform):
                social_list.append(f"{platform}: {socials[platform]}")
        if social_list:
            parts.append("Connect: " + ", ".join(social_list))
    
    return "\n".join(parts) if parts else ""


@app.post("/chat", response_model=ChatResponse)
async def chat(http_request: Request, body: ChatRequest) -> ChatResponse:
    """Non-streaming chat: run agent and return the final message."""
    start_time = time.time()
    request_id = str(uuid.uuid4())
    perf_logger.info(f"[{request_id}] Request started")
    
    _ensure_rate_limit(http_request, body.context)
    messages = [m.model_dump() for m in body.messages]
    
    # Get or create visitor profile (multi-signal matching)
    profile = None
    profile_id = None
    if body.session_id:
        try:
            profile = await db.get_or_create_visitor_profile(
                session_id=body.session_id,
                ip=body.ip,
                fingerprint=body.fingerprint
            )
            profile_id = profile["id"]
            logger.info(f"[{request_id}] Profile: {profile_id} (status={profile.get('status')})")
        except Exception as e:
            logger.warning(f"[{request_id}] Profile creation failed: {e}")
    
    # Memory search timing (use profile_id for scoping)
    memory = ""
    if profile_id:
        mem_start = time.time()
        query = _last_user_content(messages) or "recent context"
        memory = search_memory(query, profile_id)
        mem_time = time.time() - mem_start
        perf_logger.info(f"[{request_id}] Memory search: {mem_time:.3f}s")
    
    # Format visitor profile context
    visitor_context = _format_visitor_context(profile) if profile else None
    
    try:
        # Agent execution timing
        agent_start = time.time()
        result = await run_agent(
            messages,
            context=body.context,
            skill=body.skill,
            memory=memory or None,
            visitor_context=visitor_context,
            stream=False,
            request_id=request_id,
            mode=body.mode,
        )
        agent_time = time.time() - agent_start
        perf_logger.info(f"[{request_id}] Agent execution: {agent_time:.3f}s")
        
        # Memory storage and profile extraction (async, non-blocking)
        if profile_id:
            mem_save_start = time.time()
            last_user = next((m for m in reversed(messages) if m.get("role") == "user"), None)
            if last_user:
                # Store in mem0
                add_memory(
                    [last_user, {"role": "assistant", "content": result.get("message", "")}],
                    profile_id,
                )
                # Extract profile data in background (fire-and-forget)
                user_message = last_user.get("content", "")
                if isinstance(user_message, list):
                    user_message = next((p.get("text", "") for p in user_message if isinstance(p, dict) and p.get("type") == "text"), "")
                profile_updater.update_profile_in_background(profile_id, user_message)
            mem_save_time = time.time() - mem_save_start
            perf_logger.info(f"[{request_id}] Memory save: {mem_save_time:.3f}s")
        
        total_time = time.time() - start_time
        perf_logger.info(f"[{request_id}] TOTAL: {total_time:.3f}s")
        
        return ChatResponse(
            message=result.get("message", ""),
            sources=result.get("sources", []),
        )
    except HTTPException:
        raise
    except Exception as e:
        total_time = time.time() - start_time
        perf_logger.error(f"[{request_id}] ERROR after {total_time:.3f}s: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# SSE event names (see agent.stream_events for payload shapes).
EV_STATUS = "status"
EV_DELTA = "message_delta"
EV_DONE = "done"
EV_ERROR = "error"


def _sse_event(event: str, data: str) -> str:
    """Format a single SSE event (event + data lines + blank line)."""
    return f"event: {event}\ndata: {data}\n\n"


@app.post("/chat/stream")
async def chat_stream(http_request: Request, body: ChatRequest) -> StreamingResponse:
    """Streaming chat: SSE stream of status, message_delta, and done.

    Event types:
      - status: { phase, subtitle, tool?, timestamp }. phase is "thinking"
        or "tool_start". UI shows subtitle (e.g. "Thinking...", "Searching for X").
      - message_delta: { delta }. Text chunk for the assistant reply.
      - sources: { tools: string[] }. Tools used (e.g. query_profile, web_search). UI shows "From Bill's profile" / "From web".
      - done: { done: true }. Stream complete.
      - error: { error }. Stream failed.
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    perf_logger.info(f"[{request_id}] Stream request started")
    
    _ensure_rate_limit(http_request, body.context)
    messages = [m.model_dump() for m in body.messages]
    
    # Get or create visitor profile (multi-signal matching)
    profile = None
    profile_id = None
    if body.session_id:
        try:
            profile = await db.get_or_create_visitor_profile(
                session_id=body.session_id,
                ip=body.ip,
                fingerprint=body.fingerprint
            )
            profile_id = profile["id"]
            logger.info(f"[{request_id}] Profile: {profile_id} (status={profile.get('status')})")
        except Exception as e:
            logger.warning(f"[{request_id}] Profile creation failed: {e}")
    
    # Memory search timing (use profile_id for scoping)
    memory = ""
    if profile_id:
        mem_start = time.time()
        query = _last_user_content(messages) or "recent context"
        memory = search_memory(query, profile_id)
        mem_time = time.time() - mem_start
        perf_logger.info(f"[{request_id}] Memory search: {mem_time:.3f}s")
    
    # Format visitor profile context
    visitor_context = _format_visitor_context(profile) if profile else None
    
    _log = logging.getLogger("agent.main")
    _log.info("chat/stream request_id=%s messages=%s", request_id, len(messages))

    async def generate() -> Any:
        accumulated = ""
        first_token_time = None
        tokens_received = 0
        try:
            agent_start = time.time()
            stream = await run_agent(
                messages,
                context=body.context,
                skill=body.skill,
                memory=memory or None,
                visitor_context=visitor_context,
                stream=True,
                request_id=request_id,
                mode=body.mode,
            )
            async for item in stream:
                if first_token_time is None and item.get("type") == "delta":
                    first_token_time = time.time() - agent_start
                    perf_logger.info(f"[{request_id}] Time to first token: {first_token_time:.3f}s")
                if not item or not isinstance(item, dict):
                    continue
                kind = item.get("type")
                if kind == "status":
                    payload = {
                        k: item[k]
                        for k in ("phase", "subtitle", "tool", "timestamp")
                        if k in item
                    }
                    yield _sse_event(EV_STATUS, json.dumps(payload))
                elif kind == "delta":
                    delta = item.get("delta", "")
                    if delta:
                        accumulated += delta
                        tokens_received += 1
                        yield _sse_event(EV_DELTA, json.dumps({"delta": delta}))
                elif kind == "sources":
                    yield _sse_event(
                        "sources",
                        json.dumps({"tools": item.get("tools", [])}),
                    )
            agent_time = time.time() - agent_start
            perf_logger.info(f"[{request_id}] Agent streaming: {agent_time:.3f}s ({tokens_received} tokens)")
            
            # Memory storage and profile extraction (async, non-blocking)
            if profile_id:
                mem_save_start = time.time()
                last_user = next((m for m in reversed(messages) if m.get("role") == "user"), None)
                if last_user:
                    # Store in mem0
                    add_memory(
                        [last_user, {"role": "assistant", "content": accumulated}],
                        profile_id,
                    )
                    # Extract profile data in background (fire-and-forget)
                    user_message = last_user.get("content", "")
                    if isinstance(user_message, list):
                        user_message = next((p.get("text", "") for p in user_message if isinstance(p, dict) and p.get("type") == "text"), "")
                    profile_updater.update_profile_in_background(profile_id, user_message)
                mem_save_time = time.time() - mem_save_start
                perf_logger.info(f"[{request_id}] Memory save: {mem_save_time:.3f}s")
            
            total_time = time.time() - start_time
            perf_logger.info(f"[{request_id}] TOTAL: {total_time:.3f}s")
            
            _log.info("chat/stream done request_id=%s", request_id)
            yield _sse_event(EV_DONE, json.dumps({"done": True}))
        except Exception as e:
            total_time = time.time() - start_time
            perf_logger.error(f"[{request_id}] ERROR after {total_time:.3f}s: {e}")
            _log.exception("chat/stream error request_id=%s", request_id)
            yield _sse_event(EV_ERROR, json.dumps({"error": str(e)}))

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
