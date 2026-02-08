# Agent Architecture: Deep Reasoning Agent (Manus-Inspired)

**Status**: ✅ **Fully Implemented** - Monorepo structure: `apps/agent/` (Python) and `apps/web/` (Next.js). Historical notes may reference old `agent/` paths at root.

A plan for a reasoning agent that analyzes user tasks, selects and uses tools (web search, profile database), and iterates until the task is complete—inspired by Manus’s agent loop and LangChain-style ReAct patterns.

---

## 1. Vision & Goals

- **Reasoning-first**: The agent explicitly reasons about the user’s goal, then decides whether and which tools to use.
- **Tool autonomy**: It can call multiple tools in sequence or in parallel (when the API supports it), and use tool results to decide the next step.
- **Structured knowledge**: Profile and site data live in a small “database” (queryable by the agent) so answers about Bill are grounded in facts.
- **Web search**: For questions outside that knowledge (current events, general facts), the agent can search the web and summarize.
- **Single, coherent response**: After zero or more tool steps, the agent returns one clear answer to the user.
- **Streaming**: The agent’s final text response is **streamed** to the client (token-by-token or chunk-by-chunk) so the user sees the answer as it is generated, rather than waiting for the full response.

---

## 2. Access model: private vs public agent

The same agent architecture serves **two audiences**:

| | **Public agent** | **Private agent (Bill)** |
|---|------------------|---------------------------|
| **Who** | Anyone visiting bills.bio | Only Bill (authenticated) |
| **Where** | Main site chat (“Chat with Bill’s AI”) | Same UI when Bill is logged in, or a separate /dashboard/agent / API |
| **Persona** | Speaks **as Bill** / on Bill’s behalf: “I’m Bill’s AI; I can tell you about me and my work, or we can chat about other things.” | Can act as **Bill’s personal assistant**: tasks for Bill, not only answering about Bill |
| **Tools** | Profile DB + web search only. No access to Bill’s private data or actions. | Same tools **plus** (optional) private tools: e.g. notes, drafts, calendar, “remind me”, internal search |
| **Rate limits** | Stricter (e.g. N messages per IP per hour) to control cost and abuse | Higher or no limit for Bill |
| **Auth** | None; session optional for abuse mitigation | Bill signs in (e.g. session cookie or API key for programmatic use) |
| **Data** | Conversations may be logged for safety/quality; no PII required | Bill’s private conversations and tool use stay server-side and are not shared |

**Implementation notes:**

- **Single codebase (Python)**: One orchestrator, one tool registry. At request time we decide **context** = `public` or `private` (e.g. from FastAPI dependency or auth middleware: no auth → public, valid Bill session/API key → private).
- **Context drives behavior**: System prompt and tool set depend on context. Public prompt: “You are Bill’s AI assistant on his personal site. You represent Bill. Use profile_db for facts about Bill, web_search when needed.” Private prompt can add: “The user is Bill. You can also help with personal tasks using [private tools].”
- **Public-first**: The site ships with the public agent; private mode is added when auth exists. Unauthenticated users always get the public agent.

**Summary:** Bill’s agent is **public-facing** (anyone can talk to “Bill’s AI”) and **private** (Bill gets a more capable, personal version when signed in). Same deep architecture; different context, tools, and limits.

---

## 3. High-Level Architecture (Manus-Inspired)

Manus uses a **six-stage agent loop** and a **triangular core** (Planner, Knowledge, Datasource). We adapt this into a simpler but “deep” architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (Agent Loop)                                               │
│  • Maintains conversation state (messages + tool calls/results)          │
│  • Invokes the LLM with tools; handles tool_use → execute → feed back    │
│  • Stops when LLM returns a final text response (no more tool calls)    │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  REASONING      │  │  TOOL REGISTRY   │  │  SKILLS LAYER   │
│  (LLM)          │  │  (choose & run   │  │  (optional:      │
│  • Analyze task │  │   tools)         │  │   pre-packaged   │
│  • Choose tools │  │  • profile_db    │  │   tool combos +  │
│  • Synthesize   │  │  • web_search    │  │   prompts)       │
│    final answer │  │  • (extensible)  │  │                  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                             │
│  • Profile DB (Bill’s info, interests, bio, projects, blog metadata)    │
│  • Web search API (e.g. Serper, Tavily, or Bing) — external             │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Orchestrator** = our implementation of the “agent loop” (see below).
- **Reasoning** = LLM (OpenAI or Claude) with a system prompt that encourages step-by-step thinking and tool use when needed.
- **Tool registry** = the set of callable tools (profile DB, web search) the model can choose from.
- **Skills layer** = optional; later we can add named “skills” that bundle tools + short instructions (e.g. “answer_about_bill” → prefer profile_db first).

---

## 4. Agent Loop (Reason → Act → Observe)

We use a **ReAct-style loop** that also mirrors Manus’s stages:

| Step | Name (Manus-like) | What happens |
|------|-------------------|----------------|
| 1 | **Event analysis** | User message (and history) is sent to the LLM with a system prompt that defines role, tools, and reasoning expectations. |
| 2 | **Reasoning / Tool choice** | LLM returns either (a) a final text answer, or (b) one or more `tool_use` (function) calls with arguments. |
| 3 | **Execution standby** | Server validates tool names and inputs against the tool registry. |
| 4 | **Iterative processing** | For each tool call: execute tool (profile DB query or web search), get result. |
| 5 | **Result submission** | Append tool results to the conversation (as assistant tool_use + user tool_result, or provider-equivalent). Send updated messages back to the LLM. |
| 6 | **Loop or end** | If the LLM again returns tool calls → go to step 3. If it returns only text → **standby**: that text is the final answer; return it to the user. |

**Loop control:**

- **Max steps per turn**: Cap the number of tool rounds (e.g. 5–10) to avoid runaway loops.
- **Max total tokens**: Respect model context limits; optionally summarize or truncate old messages.
- **Error handling**: If a tool fails, inject the error message as the tool result and let the LLM reason about it (retry, answer with what it knows, or say it couldn’t complete the task).

---

## 4.1 Streaming agent response

The agent’s **final text** to the user is streamed so the client can display tokens as they arrive.

**Flow:**

1. **During tool steps**: No streaming of LLM output (the model is emitting tool calls, not user-facing text). Optionally, the server can send **server-sent events (SSE)** or a custom stream protocol with events such as `tool_start`, `tool_end`, `thinking` so the UI can show “Searching…”, “Reading profile…”, etc.
2. **Final text step**: When the LLM returns only text (no more tool calls), the server **streams** that text to the client. Use the LLM provider’s streaming API (e.g. OpenAI `stream=True`, Claude streaming) and forward chunks over the same connection (SSE or chunked transfer).
3. **Client**: The chat UI consumes the stream (e.g. `EventSource` for SSE, or `fetch` with `ReadableStream`) and appends each chunk to the assistant message in real time.

**Implementation (Python):**

- **Endpoint**: Expose a **streaming** endpoint (e.g. `POST /chat/stream` or `GET /chat/stream` with body via query/headers if needed). Response: `Content-Type: text/event-stream` (SSE) or `Transfer-Encoding: chunked` with a simple newline- or JSON-line-delimited protocol.
- **SSE events (suggested)**: `message_delta` (text chunk), optional `tool_start` / `tool_end` (name, id), optional `done` (final message id or metadata). This keeps the protocol simple and allows the front-end to show tool activity and incremental text.
- **Agent loop**: Run the loop as today; when the last step is “text only”, do not buffer the full response—call the LLM with streaming, and for each chunk received, write an SSE event (or chunk) to the response. Ensure proper backpressure and cleanup on client disconnect (e.g. abort the LLM stream).
- **Front-end**: Next.js chat calls the streaming endpoint (directly or via Next.js API route that proxies and forwards the stream). Render assistant message by appending each `message_delta` chunk; optionally show a “Using tool: …” state for `tool_start` / `tool_end`.

**Constraints:**

- Do **not** cache streaming responses (see CloudFront section). Ensure CloudFront/origin does not buffer the entire response.
- Timeouts: set a reasonable read timeout on the client and a write timeout on the server so long-running tool steps don’t break the connection unexpectedly.

---

## 5. Tools

### 5.1 Profile / Database Tool

- **Purpose**: Answer questions about Bill using structured, editable data (bio, interests, projects, blog).
- **Name**: e.g. `query_profile` or `get_profile_info`.
- **Inputs** (suggested):
  - `query` (string): Natural language or keyword query, e.g. “What are Bill’s interests?”, “Bill’s blog posts about design.”
  - Optional: `scope` enum — e.g. `bio | interests | projects | blog | all`.
- **Implementation (Python)**:
  - **Option A — In-memory / JSON**: Single JSON file with profile, projects, blog metadata. Tool loads with `json.load`, filters/searches (e.g. by keyword or simple heuristics). Good for MVP.
  - **Option B — SQLite**: Schema with tables like `profile`, `interests`, `projects`, `blog_posts`. Tool uses `sqlite3` with parameterized SQL or a small query builder. Better for richer queries and growth.
  - **Option C — Vector search**: Embed profile + blog text (e.g. with `sentence-transformers` or an embeddings API), use cosine similarity for “semantic” query. Overkill for a single profile unless you have lots of long-form content.
- **Output**: Structured text or JSON (e.g. “Bill’s interests: Technology, Design, Books, Coffee. Bio: …”) so the LLM can cite it in its answer.

**Data to store (aligned with current site):**

- **Profile**: Name, short bio, location if desired.
- **Interests**: e.g. Technology & Innovation, Design & Aesthetics, Books & Reading, Coffee & Food.
- **Projects**: Titles, descriptions, links (from ProjectGrid).
- **Blog**: Post id, title, excerpt, date, category, read time (from Blog.tsx).

This can start as a single JSON file and later move to SQLite or a small API.

### 5.2 Web Search Tool

- **Purpose**: For questions that are not (or not fully) answerable from the profile DB—e.g. “What’s the weather in Bill’s city?”, “Latest news about X,” or “What does Bill think about topic Y?” when the profile doesn’t have it.
- **Name**: e.g. `web_search`.
- **Inputs**:
  - `query` (string): Search query.
  - Optional: `num_results` (number), `recency` (e.g. past day/week).
- **Implementation (Python)**: Call a search API (Serper, Tavily, Bing, etc.) with `httpx` or `requests`; return titles, snippets, and URLs. The agent uses this to compose an answer.
- **Output**: List of results (title, snippet, url) as plain text or structured block so the LLM can summarize and attribute.

**Safety / cost**: Rate-limit and optionally restrict to “safe” queries; hide API keys in env.

---

## 6. Reasoning & Tool Selection (How the Agent Chooses)

- **System prompt** should:
  - Define the agent’s role (e.g. “You are Bill’s AI assistant.”).
  - List available tools with clear descriptions and when to use each.
  - Instruct the model to **reason briefly** (e.g. “Think step by step: what does the user need? Do I have that in Bill’s profile or do I need to search the web?”).
  - Prefer profile for “Bill-specific” questions and web search for everything else or to complement profile.
- **Tool descriptions** (for the LLM) must be precise:
  - **profile_db**: “Query Bill’s profile: bio, interests, projects, blog post metadata. Use this for any question about Bill, his work, his interests, or his blog.”
  - **web_search**: “Search the web for current or general information. Use when the user asks about things outside Bill’s profile or when you need up-to-date or third-party information.”
- **Provider behavior**: With OpenAI (or Claude), we pass these as function/tool definitions; the model returns `tool_calls` when it wants to use a tool. We execute, append results, and call again until the model responds with only text.

No separate “planner” module is required: the LLM’s own output (reasoning + tool calls) is the planner. Optionally we can add a **skill** like “answer_about_bill” that tells the model to try profile first, then search if needed.

---

## 7. Skills Layer (Optional)

- **Skill** = named capability that can bundle:
  - A short instruction (e.g. “Prefer profile_db for facts about Bill; use web_search only if necessary.”).
  - A subset of tools (e.g. profile_db + web_search).
- **Use case**: For “Chat with Bill’s AI,” the default skill could be “answer_about_bill” with profile + web search. Later, skills like “research_topic” (web_search only) or “summarize_blog” (profile_db blog only) can be added.
- **Implementation (Python)**: Either (a) different system prompts per skill, or (b) a single system prompt that mentions “current skill: X” and tool list. Store prompts and tool subsets in a small config or dict in code. No need for a full Manus-style “skill API” in v1.

---

## 8. Data Model: Profile “Database”

Minimal schema that matches the current site and supports the profile tool.

**Option A — Single JSON (MVP):**

```json
{
  "profile": {
    "name": "Bill",
    "bio": "I'm Bill, and this is my personal space on the web...",
    "location": "",
    "interests": ["Technology & Innovation", "Design & Aesthetics", "Books & Reading", "Coffee & Food"]
  },
  "projects": [
    { "id": "1", "title": "...", "description": "...", "url": "...", "tags": [] }
  ],
  "blogPosts": [
    { "id": 1, "title": "Why I Love Minimalist Design", "excerpt": "...", "date": "2024-01-15", "category": "Design", "readTime": "3 min" }
  ]
}
```

**Option B — SQLite (later, Python):**

- Tables: `profile` (key-value or columns), `interests` (id, name), `projects` (id, title, description, url, …), `blog_posts` (id, title, excerpt, date, category, read_time).
- Tool uses `sqlite3` (or `aiosqlite` for async); runs `SELECT` based on parsed `query` or `scope`; result set is formatted as text for the LLM.

---

## 9. Tech Stack (Concise)

**Agent and backend: Python.** Front-end: existing Next.js site; it calls a Python API for chat.

| Component        | Choice                                      |
|-----------------|---------------------------------------------|
| **Agent / API** | **Python**: FastAPI app exposing e.g. `POST /chat` (non-streaming) and `POST /chat/stream` (SSE or chunked). Runs the agent loop, tools, and LLM calls; streams final text to client. |
| LLM             | OpenAI (recommended) or Claude via official Python SDKs (`openai`, `anthropic`) |
| Agent loop      | Custom Python (no LangChain): loop in a single module or package; tool_use → execute → append → call again. |
| Tools           | Python: profile reader (JSON/SQLite), `requests` or `httpx` for web search API. |
| Profile storage | JSON file (MVP) in `data/profile.json` → optional `sqlite3` later. |
| Web search      | One of: Serper, Tavily, Bing Web Search API; call from Python. |
| **Runtime**     | Python 3.10+; `venv`; run API with `uvicorn` (FastAPI) or similar. |
| **Key management** | **AWS SSM Parameter Store** in production: store `OPENAI_API_KEY`, `SERPER_API_KEY`, etc.; ECS secrets from SSM or entrypoint fetches at startup. Local: `.env` / `os.environ`. |
| **Front-end**   | Next.js: Chat UI calls **streaming** endpoint (e.g. `POST /chat/stream` or SSE); displays assistant message incrementally as chunks arrive. |

**Integration:** Next.js `app/api/chat/route.ts` can proxy to the Python backend (so the site still exposes `/api/chat` and the front-end does not need the Python URL). Alternatively, front-end calls the Python service directly if CORS and URL are configured.

---

## 10. Docker (backend)

The Python agent backend is **containerised** for deployment on a Linux machine (e.g. EC2, ECS, or a VPS). The Next.js app can be built and served separately or in the same deployment; this section covers the **agent API** container.

**Goals:**

- Reproducible, portable run of the agent API on any Linux host with Docker.
- Single Dockerfile for the Python service; optional `docker-compose` for local dev (agent + optional DB).
- No dependency on the host’s Python version or global packages.

**Dockerfile (suggested):**

- **Base**: Use an official Python image (e.g. `python:3.11-slim` or `python:3.12-slim`) for a small image and security updates.
- **Workdir**: Set a working directory (e.g. `/app`); copy `requirements.txt` first, then `RUN pip install --no-cache-dir -r requirements.txt`, then copy application code. This keeps layer caching effective.
- **User**: Run as a non-root user (e.g. create `appuser`, `chown` files, `USER appuser`) to reduce risk.
- **Entrypoint**: Run the ASGI app with `uvicorn` (e.g. `uvicorn main:app --host 0.0.0.0 --port 8000`). Expose port `8000` (or the chosen port).
- **Env**: Do not bake secrets into the image. Use `ENV` only for non-secret config (e.g. `PYTHONUNBUFFERED=1`). Require `OPENAI_API_KEY`, `SERPER_API_KEY` (or similar) to be provided at runtime (e.g. env file, **AWS SSM Parameter Store**, or orchestration secrets)—see **Key management (AWS SSM)** below.
- **Data**: Mount `data/profile.json` (and optional SQLite file) via a volume or bind-mount at runtime so profile data can be updated without rebuilding the image. Alternatively bake a default `profile.json` into the image for simplicity and override with a mount if needed.

**Example layout:**

```
apps/agent/
  Dockerfile
  requirements.txt
  main.py
  agent/ ...
  tools/ ...
  db/ ...
  extractors/ ...
```

**Runtime:**

- On the Linux machine: `docker build -t bill-agent ./apps/agent` (or path to Dockerfile), then `docker run -p 8000:8000 --env-file .env bill-agent`. For production, use an orchestrator (e.g. Docker Compose, systemd unit, or ECS task definition) and ensure the container restarts on failure.
- **Health check**: Expose a simple `GET /health` (or `/`) that returns 200 so the host or load balancer can verify the API is up. Optionally use `HEALTHCHECK` in the Dockerfile.

**Key management (AWS SSM Parameter Store):**

Use **AWS Systems Manager Parameter Store** (SSM) to store API keys and other secrets (e.g. `OPENAI_API_KEY`, `SERPER_API_KEY`) instead of env files in production. Benefits: centralised, auditable, IAM-controlled access; optional encryption via KMS; no secrets in repo or image.

- **Parameters**: Create parameters (e.g. under `/bills-bio/agent/` or `/bills-bio/production/`) as **SecureString** if using KMS, or standard String. Names can map to env vars (e.g. `OPENAI_API_KEY`, `SERPER_API_KEY`).
- **How the container gets them**:  
  - **ECS**: Use ECS task definition **secrets** with `valueFrom` pointing at the SSM parameter ARN (e.g. `arn:aws:ssm:region:account:parameter/bills-bio/agent/OPENAI_API_KEY`). ECS injects them as env vars; no code change.  
  - **EC2 / Docker on Linux**: Grant the instance or task role `ssm:GetParameters` (and `kms:Decrypt` if SecureString). At startup, either (1) an **entrypoint script** that fetches parameters via AWS CLI or SDK and exports them before starting `uvicorn`, or (2) use **EC2 Instance Connect** / user data to fetch once and write to a temp env file passed to `docker run --env-file`, or (3) a small sidecar or init container that fetches and exposes env to the main container.  
  - **Local dev**: Keep using `.env` or `os.environ`; no SSM dependency. App can check for env var first, then optionally fall back to SSM if a config flag (e.g. `USE_SSM=true`) is set.
- **IAM**: Restrict the role to only the parameters it needs (resource ARNs or prefix). Use a dedicated policy (e.g. `bills-bio-agent-ssm`) so rotation and auditing are straightforward.
- **Rotation**: Rotate keys in SSM (update parameter value); restart the task or container so it picks up the new value (or implement periodic refresh in app if needed).

**Next.js:** The Next.js app can be Dockerised separately (e.g. `node:20-alpine`, `npm run build`, `npm run start`) and run on another container or host, or served by the same Linux box; the chat UI then calls the agent API (direct or via Next.js proxy) as configured.

---

## 11. CloudFront CDN

**CloudFront** is used as the CDN in front of the application to cache static assets and optionally the site’s HTML/JS, and to terminate HTTPS at the edge.

**Goals:**

- Cache static assets (e.g. Next.js `/_next/static/*`, `/favicon.svg`, public files) at the edge to reduce latency and origin load.
- **Do not** cache the agent chat API or any streaming response; ensure chat and stream requests always hit the origin (or the API backend) with no caching.
- Single public hostname (e.g. `bills.bio` or `www.bills.bio`) with HTTPS; CloudFront in front of one or more origins.

**Setup (conceptual):**

- **Origins**:  
  - **Next.js (or static site)**: Origin 1 — e.g. an S3 bucket (static export), or a Load Balancer / custom origin (Node/Next server).  
  - **Agent API (optional separate origin)**: If the front-end calls the agent API on a different host (e.g. `api.bills.bio`), add a second origin (e.g. the Linux server or an ALB) and a behaviour for that path/domain. Alternatively, the only origin is the Next.js server, which proxies `/api/chat` and `/api/chat/stream` to the Python backend; then CloudFront has a single origin.
- **Behaviours**:  
  - **Default (e.g. `/*`)**: Cache based on selected cache policy; typically cache `/_next/static/*`, `/static/*`, and other immutable assets with long TTL. For Next.js server-rendered or API routes, use a “CachingDisabled” or short TTL policy for the default behaviour if the default is the Next server.  
  - **Chat / stream**: If chat is under `/api/chat` or `/api/chat/stream`, create a behaviour for that path pattern with **caching disabled** (Cache policy: CachingDisabled, or TTL 0). Forward all headers (or at least those needed for auth and streaming) and allow `POST` (and `GET` if used for SSE). This ensures streaming responses are not cached or buffered at the edge.
- **SSL**: Use an ACM certificate (in us-east-1 for CloudFront) and attach it to the distribution; use the certificate for the chosen public hostname (e.g. `bills.bio`).
- **Restrictions**: Optionally restrict by geo or signed URLs/cookies if needed later.

**Streaming:**

- CloudFront **can** forward chunked responses and SSE from the origin; ensure the behaviour for the stream path has caching disabled and that the origin (Next.js or Python) does not buffer the full response. If using Next.js as a proxy to Python, ensure the Next.js route streams the response through without buffering.

**Summary:**

- CloudFront: CDN for static assets and HTTPS; cache static content; do not cache `/api/chat` or streaming; agent backend runs on Linux (Docker), optionally behind the same or a separate origin.

---

## 12. Implementation Phases

### Phase 1 — Foundation (Complete)

1. **Python project**: Created `apps/agent/` directory with `venv`, `requirements.txt` (e.g. `openai`, `fastapi`, `uvicorn`, `httpx`). Entrypoint: FastAPI app with `POST /chat`.
2. **Profile data**: PostgreSQL database integration via `apps/agent/db/postgres.py` with profiles, conversations, and messages tables.
3. **Tool registry**: In Python, defined `query_profile` and `web_search` in `apps/agent/tools/` with OpenAI function schemas.
4. **Tool execution**: Implemented `query_profile` (PostgreSQL queries) and `web_search` (Serper API). Returns structured data for the LLM.
5. **Agent loop**: `apps/agent/agent/runner.py`: converts messages, calls OpenAI with tools, executes tool calls, streams responses via SSE with status events.
6. **System prompt**: `apps/agent/agent/prompts.py` with role + tool-usage instructions + intent-following best practices.

### Phase 2 — Robustness & Observability (Week 2)

1. **Loop limits**: Max steps (e.g. 5), max tokens, timeouts (e.g. `asyncio.wait_for` or request timeout in OpenAI client).
2. **Errors**: In Python, catch tool errors; pass error message as tool result; let LLM say “I couldn’t complete this because ….”
3. **Logging**: Use `logging`; log each tool call and result (and optionally token usage) for debugging.
4. **Env / keys**: Local: `OPENAI_API_KEY`, `SERPER_API_KEY` (or similar) via `os.environ` or `pydantic-settings`; document in `.env.example`. Production: use **AWS SSM Parameter Store** for keys (see §10 Key management); app or entrypoint fetches from SSM when running in AWS.

### Phase 3 — Polish & Skills (Later)

1. **Skills**: Optional “skill” query param or default skill “answer_about_bill” with tuned system prompt (in Python, select prompt and tool list by skill).
2. **Profile DB upgrade**: If needed, move to SQLite (`sqlite3` or `aiosqlite`) and a small query layer in Python.
3. **Caching**: Optional caching for profile queries or repeated search queries (e.g. `functools.lru_cache` or in-memory dict with TTL).
4. **UI**: Next.js chat shows “used tools” or “sources” (e.g. “From Bill’s profile” / “From web”) if the Python API returns that metadata in the response.

### Phase 4 — Deployment: Docker, SSM & CloudFront (Complete)

1. **Docker**: `apps/agent/Dockerfile` with Python 3.11-slim, non-root user, `uvicorn` entrypoint, port 8000, health check.
2. **AWS SSM (key management)**: `apps/agent/scripts/setup_ssm.py` for parameter creation; `apps/agent/agent/config.py` loads from SSM when USE_SSM=true.
3. **CloudFront**: `docs/deploy/cloudfront.yaml` CloudFormation template with caching disabled for `/api/chat*` paths.
4. **Linux host**: Deployment guides in `docs/deploy/README.md` and `docs/DEPLOYMENT_GUIDE.md`.

---

## 13. Success Criteria

- User asks “What are Bill’s interests?” → agent uses **profile_db** and answers from data.
- User asks “What did Bill write about design?” → agent uses **profile_db** (blog metadata) and answers.
- User asks “What’s the weather in Paris?” or “Latest news on X” → agent uses **web_search** and summarizes.
- User asks “Who is Bill and what’s happening with AI this week?” → agent uses **profile_db** for “who is Bill” and **web_search** for “AI this week,” then synthesizes one answer.
- No use of Vercel AI SDK or LangChain; a single, clear **Python** agent loop with two tools (profile + web search) and room to add more tools or skills later.
- Agent **streams** the final text response; chat UI shows tokens as they arrive.
- Agent API runs in **Docker** on a Linux machine; **CloudFront** serves the site with static caching and no caching for chat/stream.

---

## 14. References & Inspiration

- **Manus**: Event analysis → Tool selection → Execution standby → Iterative processing → Result submission → Standby; Planner / Knowledge / Datasource modules.
- **ReAct (LangChain)**: Reason (think) → Act (tool call) → Observe (tool result) → repeat.
- **Anthropic tool use**: Tool definitions (name, description, input_schema), tool_use blocks, tool_result blocks, multi-step conversation.
- **OpenAI function calling**: `tools` in Chat Completions, `tool_calls` in assistant message, `tool` role for results.

**Python project layout (current monorepo structure):**

```
apps/agent/
  main.py                 # FastAPI app, POST /chat
  agent/
    runner.py             # Agent loop (reason → act → observe)
    prompts.py            # System prompts (public / private)
    memory_layer.py       # Mem0 integration
    skills.py             # Skill system
    config.py             # AWS SSM config
  tools/
    __init__.py           # Tool registry (names, schemas, execute)
    profile.py            # query_profile implementation
    web_search.py         # web_search implementation
  db/
    postgres.py           # PostgreSQL integration
    profile_management.py # Profile CRUD
  requirements.txt
  .env.example
  Dockerfile
```

This document is the single source of truth for the deep agent architecture; implementation is in **Python** and can follow the phases above and refer back to this plan.

---

## 15a. Research: Leaked system prompts and intent-following

Research into leaked system prompts (Cursor, Devin, Lovable, Manus, Replit, v0) and analyses (e.g. MindPal “5 prompting lessons”, “Key learnings”) was used to improve how the agent follows human intent.

### What makes great agents follow human intent

| Principle | Source | Application for bills.bio agent |
|-----------|--------|----------------------------------|
| **Primary goal explicit** | Cursor: “Your main goal is to follow the USER’s instructions at each message, denoted by the <<user_query>> tag.” | System prompt states that the agent’s main goal is to follow the user’s request in each turn. |
| **Role and mission upfront** | Cursor, Devin, Lovable: clear “You are X. Your mission is Y.” | “You are Bill’s AI assistant… You represent Bill.” Plus one-sentence mission. |
| **Reuse user’s wording** | Cursor: tool descriptions say “reuse the user’s exact query… with their wording unless there is a clear reason not to.” | Tool schemas / prompt instruct to prefer the user’s phrasing for queries (e.g. query_profile, web_search) when appropriate. |
| **Exact parameter values** | Cursor: “If the user provides a specific value (e.g. in quotes), use that value EXACTLY. DO NOT make up values for or ask about optional parameters. Carefully analyze descriptive terms in the request as they may indicate required parameter values.” | Prompt instructs: use user-supplied values exactly; infer required params from context; only ask when genuinely missing. |
| **Don’t expose tool names to user** | Cursor: “NEVER refer to tool names when speaking to the USER. Instead of ‘I need to use the edit_file tool’, just say ‘I will edit your file’.” | Agent speaks in natural language about actions (e.g. “checking Bill’s profile”, “searching the web”), not “calling query_profile”. |
| **Call tools only when needed** | Cursor: “Only call tools when they are necessary. If the user’s task is general or you already know the answer, just respond without calling tools.” | Prefer answering from context when sufficient; use query_profile for Bill-specific facts, web_search for external/current info. |
| **Step-by-step reasoning** | Devin, Manus, v0: plan or “think” before acting. | “Think step by step: what does the user need? Do you have it in profile or need web search?” |
| **Boundaries and guardrails** | Cursor, Lovable, Devin: output format, don’ts, length. | Be concise; don’t invent facts; say when you don’t know; optional casual conversation. |
| **Error and uncertainty handling** | Cursor, Devin, Manus: “If you can’t fix after N tries, ask the user”; “If ambiguous, ask for clarification.” | If information isn’t found or request is ambiguous, say so clearly and ask for clarification if needed. |
| **STARE-style checklist** | MindPal “5 prompting lessons”: Scope (role/goal), Tasks (steps), Assets (tools/knowledge), Rules (boundaries), Exceptions (errors). | Prompts and tool descriptions align with STARE: clear role, tool rules, boundaries, and error behavior. |

### Cursor agent prompt (excerpts)

- **Goal**: “Your main goal is to follow the USER’s instructions at each message.”
- **Tool rules**: Follow schema exactly; never call tools not provided; never name tools to the user; only call when necessary; briefly explain why before calling.
- **Parameters**: Use the user’s exact values when given; don’t invent optional values; infer required params from descriptive terms in the request; if missing or no relevant tools, ask the user.

### Devin / Lovable / Manus

- **Devin**: “Your mission is to accomplish the task using the tools at your disposal, **after you have clarified the goal**.” Plan then execute; report errors and don’t try to fix environment issues alone.
- **Lovable**: Clear role (“AI editor that creates and modifies web applications”); explicit forbidden actions and coding guidelines.
- **Manus**: Defined expertise (information gathering, data processing, writing); agent loop (analyze → select tools → execute → iterate); explicit error-handling (verify tool names/args, try alternatives, report to user).

These patterns were applied in **§6 Reasoning & tool selection** and in `apps/agent/agent/prompts.py` (see Turn 3 progress).

---

## 15. Implementation progress

**Note**: Historical implementation notes below may reference `agent/` paths. The current monorepo structure uses `apps/agent/` and `apps/web/`.

Progress is updated at the end of each implementation turn.

### Turn 1 (initial agent)

| Item | Status |
|------|--------|
| **Profile data** | Done. `agent/data/profile.json` with profile, interests, projects, blog (aligned with About, ProjectGrid, Blog). |
| **Tools** | Done. `agent/tools/profile.py` (query_profile), `agent/tools/web_search.py` (Serper), `agent/tools/__init__.py` (registry, OpenAI tool definitions, execute_tool). |
| **Prompts** | Done. `agent/agent/prompts.py` with PUBLIC_SYSTEM_PROMPT and get_system_prompt(context). |
| **Agent loop** | Done. `agent/agent/runner.py`: run_agent(messages, stream=False/True); OpenAI with tools; max 5 steps; tool_calls → execute → append tool_results → loop; final text returned or streamed. |
| **API** | Done. `apps/agent/main.py`: GET /health, POST /chat (JSON body: messages, context), POST /chat/stream (SSE: message_delta, done). |
| **Dependencies** | Done. `agent/requirements.txt`: fastapi, uvicorn, openai, httpx, pydantic. |
| **Env** | Done. `agent/.env.example` with OPENAI_API_KEY, SERPER_API_KEY. |
| **Docker** | Done. `agent/Dockerfile`: python:3.11-slim, non-root user, uvicorn :8000, HEALTHCHECK /health. |
| **.gitignore** | Done. Root .gitignore updated for agent/.env, agent/venv, __pycache__. |

**Run locally:** From repo root, `cd apps/agent && python -m venv venv && source venv/bin/activate` (or `venv\Scripts\activate` on Windows), `pip install -r requirements.txt`, set `OPENAI_API_KEY` (and optionally `SERPER_API_KEY`), `uvicorn main:app --host 0.0.0.0 --port 8000`. From `apps/agent/` directory so that `tools` and `agent` packages resolve.

**Next:** Wire Next.js chat UI to POST /chat or /chat/stream (proxy via Next.js API route or direct to agent URL). Optionally add SSM fetch at startup for production keys.

### Turn 2 (refinements and progress check)

| Item | Status |
|------|--------|
| **Streaming refactor** | Done. Agent loop split into `_run_agent_sync` (returns final text) and `_run_agent_stream` (async generator yielding chunks); `run_agent(stream=True/False)` dispatches correctly. Resolves async-generator vs return-value conflict. |
| **OpenAI tool message format** | Done. Assistant messages use `tool_calls` with `id`, `type`, `function`; user-side tool results use `tool` role with `tool_call_id` and content. |
| **Tool defaults** | Done. Defaults for `query_profile.scope` and `web_search.num_results` applied in `tools/__init__.py` so LLM args align with implementations. |
| **Docker HEALTHCHECK** | Done. HEALTHCHECK uses `http://127.0.0.1:8000/health` for in-container health checks. |
| **Phase 1** | Complete. Foundation (profile data, tools, agent loop, prompts, FastAPI /health, /chat, /chat/stream, streaming) is in place. |
| **Phase 4 (Docker)** | Complete. Dockerfile, requirements, .env.example, .gitignore; ready for Docker build/run and SSM/CloudFront when deployed. |

**Next (this turn):** Wire Next.js chat UI to agent backend (`/chat` or `/chat/stream`). Optionally implement SSM parameter fetch at startup for production.

### Turn 3 (intent-following: leaked prompts research)

| Item | Status |
|------|--------|
| **Research** | Done. §15a added: research into leaked system prompts (Cursor, Devin, Lovable, Manus, Replit, v0) and analyses (MindPal “5 prompting lessons”, “Key learnings”). Captured what makes great agents follow human intent: primary goal explicit, role/mission upfront, reuse user wording, exact parameter values, don’t expose tool names, call tools only when needed, step-by-step reasoning, boundaries, error/uncertainty handling, STARE-style checklist. |
| **Prompts** | Done. `agent/agent/prompts.py`: PUBLIC_SYSTEM_PROMPT updated with (1) explicit main goal (“Your main goal is to follow the user’s request in each message”), (2) use tools only when necessary, (3) prefer user’s wording for queries, (4) use user-supplied values exactly / don’t make up optional params / ask when genuinely missing, (5) speak in natural language about actions (no internal tool names), (6) clear handling of “can’t find” and ambiguity (say so, offer to clarify). |
| **Tool descriptions** | Done. `agent/tools/__init__.py`: query_profile and web_search descriptions and query param text updated to “Prefer reusing the user’s wording when appropriate.” |

**Next:** Wire Next.js chat UI to agent backend. Optionally add SSM fetch at startup.

### Turn 4 (detailed system prompt rewrite)

| Item | Status |
|------|--------|
| **System prompt structure** | Done. New PUBLIC_SYSTEM_PROMPT in `agent/agent/prompts.py` follows a clear sectioned structure: (1) Identity and role; (2) Primary goal; (3) Reasoning and planning; (4) Tool use — general rules (8 numbered rules); (5) Profile tool — when and how; (6) Web search tool — when and how; (7) Communication with the user; (8) Boundaries; (9) Errors and uncertainty; (10) Answer the user's request (closing block with parameter handling). |
| **Coverage** | Done. All intent-following points covered: primary goal explicit, role upfront, reuse user wording, exact parameter values, never expose tool names, tools only when necessary, step-by-step reasoning, boundaries (no invented facts, concise), error/uncertainty handling (can't find / ambiguous / don't know / casual chat), and closing "answer using relevant tools; check params; use user values exactly; don't make up optional params; infer from descriptive terms." |
| **Docstring** | Done. Module docstring references §6 and §15a only; no mention of leaked prompts in prompt text or in prompts.py. |
| **Private mode** | Done. get_system_prompt("private") appends a short "PRIVATE MODE" block. |

**Next:** Wire Next.js chat UI to agent backend. Optionally add SSM fetch at startup.

### Turn 5 (chat UI: streaming + reasoning/tool subtitles, Manus-style)

| Item | Status |
|------|--------|
| **Runner status/delta events** | Done. `agent/agent/runner.py`: _run_agent_stream now yields dicts: `{"type": "status", "subtitle": "..."}` (e.g. "Thinking...", "Checking Bill's profile", "Searching the web") and `{"type": "delta", "delta": "..."}`. TOOL_SUBTITLES maps tool names to user-facing labels. Status emitted at start of each loop step and before each tool execution. |
| **main.py SSE** | Done. Streaming endpoint emits SSE events: `status` (data: `{"subtitle": "..."}`), `message_delta` (data: `{"delta": "..."}`), `done`, `error`. |
| **Next.js stream proxy** | Done. `app/api/chat/stream/route.ts`: POST proxies to `AGENT_API_URL/chat/stream`, forwards response body as stream with SSE headers. Env: `AGENT_API_URL` (default `http://localhost:8000`). |
| **Chat.tsx streaming + subtitle** | Done. Chat uses POST `/api/chat/stream`, parses SSE (event + data per block), accumulates message_delta into assistant message, sets subtitle from status events. Subtitle shown (1) below header when loading (Manus-style) and (2) inside the loading bubble above the dots. Placeholder assistant message added at stream start; cleared on error. |

**Run with agent:** Start the Python agent (`cd apps/agent && uvicorn main:app --host 0.0.0.0 --port 8000`), then run Next.js (`npm run dev` from root or `cd apps/web && npm run dev`). Set `AGENT_API_URL` if the agent runs elsewhere.

**Next:** Optional SSM fetch at startup; rate limits (Phase 2).

### Turn 6 (subtitle implementation best practices)

| Item | Status |
|------|--------|
| **stream_events module** | Done. `agent/agent/stream_events.py`: single source of truth for stream contract. Constants: TYPE_STATUS, TYPE_DELTA, TYPE_SOURCES, PHASE_THINKING, PHASE_TOOL_START, MAX_SUBTITLE_LENGTH (120), MAX_QUERY_PREVIEW_LENGTH (50). sanitize_subtitle(text): strip control chars, normalize whitespace, truncate. build_status_event(phase, subtitle, tool=None): structured payload with phase, sanitized subtitle, tool?, ISO UTC timestamp. |
| **Runner** | Done. Runner uses stream_events constants and build_status_event; yields structured status (phase, subtitle, tool, timestamp) and delta events. No magic strings. |
| **main.py** | Done. SSE event names EV_STATUS, EV_DELTA, EV_DONE, EV_ERROR; docstring documents event types and payloads; forwards full status payload (phase, subtitle, tool, timestamp) to client. |
| **Client** | Done. Parses structured status payload; reads data.subtitle; backward compatible. |

**Next:** Phase 2 (logging, optional SSM).

### Turn 7 (Phase 2: logging, optional SSM)

| Item | Status |
|------|--------|
| **Logging** | Done. `agent/agent/runner.py`: module logger; log each tool_call (name, args) and tool_result (name, result preview truncated to 200 chars) at INFO in both sync and stream paths. |
| **Optional SSM at startup** | Done. `agent/agent/config.py`: load_env_from_ssm() when USE_SSM=true; fetches parameters by path (SSM_PARAMETER_PREFIX, default /bills-bio/agent/), maps to env vars by name; only sets vars not already set. boto3 optional (ImportError logged if USE_SSM set but boto3 missing). main.py calls load_env_from_ssm() at module load. agent/.env.example updated with USE_SSM, SSM_PARAMETER_PREFIX. |

**Run with SSM:** Set USE_SSM=true and SSM_PARAMETER_PREFIX (optional). Install boto3 for production. IAM role must have ssm:GetParametersByPath (and kms:Decrypt if SecureString).

**Next:** Rate limits (Phase 2); Phase 3 (skills, profile DB upgrade).

### Turn 8 (Phase 2: rate limits)

| Item | Status |
|------|--------|
| **Rate limiter** | Done. `agent/agent/rate_limit.py`: in-memory fixed-window limiter per (client_id, context). Public limit (default 20/hour) and private limit (default 100/hour; 0 = no limit). Config via RATE_LIMIT_PUBLIC_PER_HOUR, RATE_LIMIT_PRIVATE_PER_HOUR. Thread-safe (lock). get_limiter() singleton. |
| **Client ID** | Done. main.py: _client_id(request) uses X-Forwarded-For (first hop) when behind proxy, else request.client.host. |
| **Chat endpoints** | Done. POST /chat and POST /chat/stream call _ensure_rate_limit(http_request, body.context) before running the agent; 429 with "Rate limit exceeded. Try again later." when over limit. Endpoints take Request + ChatRequest so context comes from body. |
| **.env.example** | Done. Commented RATE_LIMIT_PUBLIC_PER_HOUR, RATE_LIMIT_PRIVATE_PER_HOUR. |

**Note:** In-memory limiter is per process; with multiple workers, each worker has its own counts. For shared limits across workers use Redis or similar (Phase 3 or later).

**Next:** Phase 3 (skills, profile DB upgrade, caching); or CloudFront/SSM deployment.

### Turn 9 (Phase 3: skills layer + Cursor skill)

| Item | Status |
|------|--------|
| **Agent skills module** | Done. `agent/agent/skills.py`: SKILLS dict with name, description (third person, WHAT + WHEN per Claude/Cursor standards), prompt_fragment, tools list. Single skill: answer_about_bill (default); unknown ids fall back to it. get_skill(), get_prompt_fragment(), get_allowed_tools(). |
| **Tool subset by skill** | Done. `agent/tools/__init__.py`: get_tool_definitions(allowed_names) returns filtered TOOLS_DEFINITIONS; runner passes get_tool_definitions(get_allowed_tools(skill)) to the LLM. |
| **Prompt by skill** | Done. `agent/agent/prompts.py`: get_system_prompt(context, skill) appends get_prompt_fragment(skill). |
| **API** | Done. ChatRequest.skill (default "answer_about_bill"); run_agent(..., skill=body.skill); main.py passes skill to run_agent for /chat and /chat/stream. |
| **Cursor project skill** | Done. `.cursor/skills/bills-bio-agent/SKILL.md`: name bills-bio-agent, description (third person, WHAT + WHEN); key files table, conventions, adding a tool/skill. Follows Claude/Cursor skill standards (frontmatter, concise, trigger terms). |

**Skill standards used:** Name lowercase-hyphens; description max 1024 chars, third person, WHAT + WHEN; prompt fragment + tool subset per skill; single source in skills.py.

**Next:** Profile DB upgrade (SQLite) or CloudFront/SSM deployment.

### Turn 10 (Phase 3: optional caching)

| Item | Status |
|------|--------|
| **TTL cache module** | Done. `agent/agent/cache.py`: TTLCache (thread-safe, per-entry TTL), get_profile_cache(), get_search_cache() singletons. |
| **Profile cache** | Done. `agent/tools/profile.py`: when PROFILE_CACHE_TTL_SECONDS > 0, cache get/set by key (query, scope); all return paths store result. |
| **Search cache** | Done. `agent/tools/web_search.py`: when SEARCH_CACHE_TTL_SECONDS > 0, cache get/set by key (query, num_results). |
| **.env.example** | Done. PROFILE_CACHE_TTL_SECONDS=300, SEARCH_CACHE_TTL_SECONDS=60 (0 = disabled). |

**Note:** Cache is in-memory and per-process; multi-worker deployments have separate caches. Use 0 to disable.

**Next:** CloudFront/SSM deployment.

### Turn 11 (Phase 3: Profile DB upgrade — SQLite)

| Item | Status |
|------|--------|
| **SQLite profile layer** | Done. `agent/tools/profile_db.py`: schema (profile, projects, blog_posts), init_from_json(json_path, db_path), load(db_path) → dict same shape as profile.json. |
| **Profile tool** | Done. `agent/tools/profile.py`: when PROFILE_DB_PATH is set, read from SQLite; if DB file does not exist, init_from_json(data/profile.json, db_path) then load. Else read from profile.json. |
| **.env.example** | Done. PROFILE_DB_PATH (optional; unset = JSON only). |

**Note:** SQLite is optional. Set PROFILE_DB_PATH to a path (e.g. `data/profile.db`) to use it; on first run the DB is created and seeded from profile.json. Mount the same path in Docker to persist or update data.

**Next:** None; Phase 4 deployment is optional and documented below.

### Turn 12 (Phase 4: AWS SSM + CloudFront deployment)

| Item | Status |
|------|--------|
| **SSM setup script** | Done. `agent/scripts/setup_ssm.py`: creates/updates SSM parameters OPENAI_API_KEY, SERPER_API_KEY under prefix (default /bills-bio/agent/). Reads from env or --env-file. Requires boto3 and AWS credentials. |
| **CloudFormation CloudFront** | Done. `deploy/cloudfront.yaml`: distribution with one custom origin; default behavior CachingOptimized; path /api/chat* CachingDisabled. Parameters: OriginDomainName, OriginPath, ViewerProtocolPolicy, ACMCertificateArn, Aliases. |
| **Deploy docs** | Done. `deploy/README.md`: how to run setup_ssm.py, deploy CloudFront stack, and Route 53 DNS. |
| **Route 53** | Done. `deploy/route53.yaml`: A (alias) records for apex and optional www pointing to CloudFront. Use existing hosted zone; deploy after CloudFront with DistributionDomainName. |

**SSM:** From agent dir with AWS creds: `export OPENAI_API_KEY=... SERPER_API_KEY=... && python3 scripts/setup_ssm.py` or `python3 scripts/setup_ssm.py --env-file .env`. Then set USE_SSM=true and SSM_PARAMETER_PREFIX in production so the agent loads keys from SSM at startup.

**CloudFront:** `aws cloudformation deploy --template-file deploy/cloudfront.yaml --stack-name bills-bio-cdn --parameter-overrides OriginDomainName=your-origin.example.com`. Point your origin (Next.js or ALB) at your app; CloudFront caches static content and does not cache /api/chat or /api/chat/stream.

### Turn 13 (Phase 3: UI — used tools / sources)

| Item | Status |
|------|--------|
| **Runner sources** | Done. `agent/agent/runner.py`: _run_agent_stream tracks tools_used set; yields _sources_event(tools_used) before every return. stream_events: TYPE_SOURCES. |
| **SSE sources event** | Done. `apps/agent/main.py`: on kind "sources" emits SSE event "sources" with { tools: string[] }. |
| **Chat UI** | Done. `apps/web/components/Chat.tsx`: Message has optional sources; on "sources" event sets sources on last assistant message; renders "From Bill's profile · Web search" below assistant messages when present (TOOL_LABELS map). |
| **Non-streaming sources** | Done. `apps/agent/agent/runner.py`: _run_agent_sync returns (text, tools_used); run_agent(stream=False) returns {"message": str, "sources": list[str]}. `apps/agent/main.py`: POST /chat ChatResponse includes sources. |

### Turn 14 (Phase 3: Memory — Mem0 OSS)

| Item | Status |
|------|--------|
| **mem0ai** | Done. `agent/requirements.txt`: mem0ai>=1.0.0. |
| **Memory layer** | Done. `agent/agent/memory_layer.py`: lazy-init Mem0 OSS Memory(); add_memory(messages, session_id), search_memory(query, session_id, top_k=5) → formatted string. Disabled when MEMORY_ENABLED=false or mem0ai not installed. |
| **Prompts / runner** | Done. get_system_prompt(..., memory=); run_agent(..., memory=). |
| **API** | Done. ChatRequest.session_id optional. Before run: search_memory(last_user_content, session_id) → memory. After run: add_memory([last_user, assistant], session_id). Stream: accumulate assistant text, add_memory before done. |
| **.env.example** | Done. MEMORY_ENABLED (default true). |
| **Chat UI session_id** | Done. `components/Chat.tsx`: getSessionId() from sessionStorage (key `CHAT_SESSION_KEY`: bills-bio-chat-session); session_id sent with each POST to `/api/chat/stream` so memory is scoped per tab. |

**Usage:** Client sends session_id (e.g. UUID per chat tab) in POST body. Same session_id across turns gives persistent memory for that session. Mem0 OSS uses Qdrant (on-disk) and SQLite (~/.mem0/history.db) by default; OPENAI_API_KEY used for extraction and embeddings.

**Next (optional):** Redis or shared store for rate limits across workers; further UI polish; or additional tools/skills as needed.

### Turn 15 (Phase 2: robustness — timeouts, max_tokens, request tracing)

| Item | Status |
|------|--------|
| **OpenAI timeout** | Done. `agent/agent/config.py`: get_openai_timeout_seconds() (default 60; OPENAI_TIMEOUT_SECONDS). Runner: AsyncOpenAI(timeout=...) and asyncio.wait_for() on non-streaming create(); timeout returns user-facing "request took too long" message. |
| **Max completion tokens** | Done. get_openai_max_tokens() (default 4096; OPENAI_MAX_TOKENS=0 for model default). Passed as max_completion_tokens to chat.completions.create. |
| **Request ID** | Done. main.py generates uuid per /chat and /chat/stream; passed to run_agent(..., request_id=). Runner logs request_id on tool_call and tool_result for trace correlation. |
| **.env.example** | Done. OPENAI_TIMEOUT_SECONDS, OPENAI_MAX_TOKENS (commented). |
