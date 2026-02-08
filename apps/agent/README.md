# Bills.bio Agent

FastAPI-based conversational AI agent with memory persistence, tool integration, and streaming responses.

## Features

- 🤖 GPT-4 powered conversational agent
- 🧠 Persistent memory across sessions (Mem0)
- 🔧 Tool-based architecture (web search, profile queries)
- 📡 Streaming SSE responses
- 🗄️ PostgreSQL integration for profiles
- ⚡ Rate limiting and caching
- 🔒 AWS SSM parameter store support

## Tech Stack

- **Framework**: FastAPI
- **Language**: Python 3.12
- **LLM**: OpenAI GPT-4
- **Memory**: Mem0 OSS (with Qdrant)
- **Database**: PostgreSQL (asyncpg)
- **Deployment**: Docker + AWS EC2

## Getting Started

### Prerequisites

- Python 3.12+
- PostgreSQL 16+
- OpenAI API key

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env

# Edit .env with:
# - OPENAI_API_KEY (required)
# - DATABASE_URL (PostgreSQL)
# - SERPER_API_KEY (optional, for web search)
```

### Development

```bash
# Activate virtual environment
source venv/bin/activate

# Start server with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or use the run script
chmod +x run.sh
./run.sh
```

API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

## Project Structure

```
apps/agent/
├── main.py                   # FastAPI app entry point
│
├── agent/
│   ├── runner.py             # Agent execution loop
│   ├── prompts.py            # System prompts
│   ├── memory_layer.py       # Mem0 integration
│   ├── stream_events.py      # SSE event types
│   ├── rate_limit.py         # Rate limiting
│   ├── cache.py              # In-memory caching
│   ├── config.py             # AWS SSM config
│   └── skills.py             # Skill system (optional)
│
├── db/
│   ├── postgres.py           # Database operations
│   └── profile_management.py # Profile CRUD
│
├── extractors/
│   └── simple_profile_extractor.py  # Profile extraction
│
├── tools/
│   ├── profile_db.py         # Profile tool
│   ├── profile.py            # Profile query tool
│   └── web_search.py         # Web search tool
│
├── scripts/
│   └── setup_ssm.py          # AWS SSM setup
│
├── Dockerfile                # Container image
├── requirements.txt          # Python dependencies
└── run.sh                    # Startup script
```

## Agent Architecture

### Core Loop

```python
# 1. Receive user message
messages = [{"role": "user", "content": "Hello!"}]

# 2. Search memories (Mem0)
memories = search_memory(user_message, user_id=session_id)

# 3. Build prompt with context
system_prompt = f"You are Bill's AI assistant.\n\nMemories: {memories}"

# 4. Run agent with tools
async for chunk in run_agent(messages, tools, system_prompt):
    yield chunk  # Stream to client

# 5. Store in memory
add_memory(messages, user_id=session_id)
```

### Tools

**profile_db** - Query Bill's profile
```python
@tool
def profile_db(query: str) -> dict:
    """Get Bill's professional info, projects, etc."""
    return query_profile_from_db(query)
```

**web_search** - Search the web
```python
@tool
def web_search(query: str, num_results: int = 5) -> list:
    """Search Google via Serper API"""
    return search(query, num_results)
```

### Memory System

Uses **Mem0** for persistent memory:
- Automatically extracts facts from conversations
- Stores with vector embeddings (Qdrant)
- Semantic search across all memories
- Scoped by `user_id` (session_id or profile_id)

## API Endpoints

### Health Check

```bash
GET /health

Response: {"status": "healthy"}
```

### Chat (Non-Streaming)

```bash
POST /chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "What is Bill working on?"}
  ],
  "session_id": "abc123",  # optional
  "context": "public"      # optional
}

Response: {
  "response": "Bill is working on...",
  "sources": ["profile_db"],
  "usage": {"prompt_tokens": 100, "completion_tokens": 50}
}
```

### Chat (Streaming)

```bash
POST /chat/stream
Content-Type: application/json

{
  "messages": [...],
  "session_id": "abc123"
}

Response: text/event-stream

event: status
data: {"status": "thinking"}

event: message_delta
data: {"delta": "Bill"}

event: message_delta
data: {"delta": " is"}

event: done
data: {"sources": ["profile_db"]}
```

## Environment Variables

```env
# LLM (required)
OPENAI_API_KEY=sk-...

# OpenAI limits (optional)
OPENAI_TIMEOUT_SECONDS=60
OPENAI_MAX_TOKENS=4096

# Web search (optional)
SERPER_API_KEY=...

# Rate limits (messages per hour per IP)
RATE_LIMIT_PUBLIC_PER_HOUR=20
RATE_LIMIT_PRIVATE_PER_HOUR=100

# Memory (Mem0)
MEMORY_ENABLED=true

# PostgreSQL (for profiles)
DATABASE_URL=postgresql://localhost:5432/bills_bio

# AWS SSM (production)
USE_SSM=false
SSM_PARAMETER_PREFIX=/bills-bio/agent/

# Caching (seconds, 0 = disabled)
SEARCH_CACHE_TTL_SECONDS=60
```

## Memory Management

### Add Memory

```python
from agent.memory_layer import add_memory

messages = [
    {"role": "user", "content": "I'm Sarah, I live in SF"},
    {"role": "assistant", "content": "Nice to meet you, Sarah!"}
]

add_memory(messages, user_id="session_123")
```

### Search Memory

```python
from agent.memory_layer import search_memory

results = search_memory(
    query="Where does Sarah live?",
    user_id="session_123",
    limit=5
)
# Returns: [{"memory": "User lives in SF", "score": 0.95}]
```

### Get All Memories

```python
from agent.memory_layer import get_all_memories

memories = get_all_memories(user_id="session_123")
```

## Profile Extraction

Automatically extract profile info from conversations:

```python
from extractors.simple_profile_extractor import SimpleProfileExtractor

extractor = SimpleProfileExtractor()
updates = extractor.extract(conversation_text)

# Returns: {
#   "name": "Sarah Chen",
#   "location": {"city": "San Francisco"},
#   "professional": {"company": "OpenAI"}
# }
```

## Rate Limiting

Configured per context:
- **Public**: 20 messages/hour per IP
- **Private**: 100 messages/hour per IP

Override in `.env`:
```env
RATE_LIMIT_PUBLIC_PER_HOUR=50
RATE_LIMIT_PRIVATE_PER_HOUR=200
```

## Deployment

### Docker

```bash
# Build image
docker build -t bills-bio-agent .

# Run container
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e DATABASE_URL=$DATABASE_URL \
  bills-bio-agent
```

### AWS EC2

See `docs/deploy/README.md` for CloudFormation templates.

### Production Checklist

- [ ] Set `OPENAI_API_KEY`
- [ ] Configure `DATABASE_URL`
- [ ] Enable `USE_SSM=true` for secrets
- [ ] Set rate limits
- [ ] Configure health check monitoring
- [ ] Enable HTTPS (via ALB)

## Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test chat (non-streaming)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Test streaming
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me about Bill"}]
  }'
```

## Troubleshooting

### Import Errors

```bash
# Make sure venv is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### OpenAI API Errors

```bash
# Verify API key
echo $OPENAI_API_KEY

# Test directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Memory Not Persisting

Mem0 stores data in `~/.mem0/`. Check:
```bash
ls -la ~/.mem0/
```

### Database Connection Failed

```bash
# Test connection
psql $DATABASE_URL

# Check if PostgreSQL is running
pg_isready
```

## Development Tips

### Add a New Tool

```python
# In tools/my_tool.py
from langchain.tools import tool

@tool
def my_tool(input: str) -> str:
    """Description for the LLM"""
    return f"Result: {input}"

# In agent/runner.py
from tools.my_tool import my_tool

tools = [profile_db, web_search, my_tool]
```

### Customize System Prompt

Edit `agent/prompts.py`:
```python
def get_system_prompt(context: str) -> str:
    return """
    You are Bill's AI assistant.
    [Your custom instructions]
    """
```

### Debug Streaming

Enable verbose logging:
```python
import logging
logging.getLogger("agent").setLevel(logging.DEBUG)
```

## License

Private - for personal use only.
# Test deployment permissions
