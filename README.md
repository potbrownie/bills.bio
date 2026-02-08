# Bills.bio Monorepo

A clean, modern personal website monorepo featuring a Next.js frontend and Python FastAPI agent backend.

## 📁 Project Structure

```
bills.bio/
├── apps/
│   ├── web/              # Next.js frontend (TypeScript)
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities & database
│   │   └── scripts/      # Database scripts
│   │
│   └── agent/            # Python FastAPI backend
│       ├── agent/        # Agent logic (runner, memory, tools)
│       ├── db/           # PostgreSQL integration
│       ├── extractors/   # Profile extraction
│       ├── tools/        # Agent tools (search, profile)
│       └── main.py       # FastAPI server
│
├── docs/                 # Documentation
│   ├── archive/          # Historical docs
│   └── deploy/           # Deployment configs
│
└── .github/              # CI/CD workflows
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 16+

### Installation

1. **Install dependencies**

```bash
# Install all workspace dependencies
npm install

# Install Python agent dependencies
cd apps/agent
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

2. **Set up database**

```bash
# Create PostgreSQL database
createdb bills_bio

# Initialize schema and seed data
npm run db:init
npm run db:seed
```

3. **Configure environment**

```bash
# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/agent/.env.example apps/agent/.env

# Edit with your API keys:
# - OPENAI_API_KEY (required for agent)
# - DATABASE_URL (PostgreSQL connection)
# - SERPER_API_KEY (optional, for web search)
```

### Development

Run both frontend and agent in separate terminals:

```bash
# Terminal 1: Next.js frontend (port 3002)
npm run dev

# Terminal 2: Python agent (port 8000)
cd apps/agent
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Visit:
- **Website**: http://localhost:3002
- **Dashboard**: http://localhost:3002/dashboard (password: `admin123`)
- **Agent API**: http://localhost:8000/docs

## 🏗️ Architecture

### Frontend (apps/web)

**Tech Stack:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL (via node-postgres)

**Features:**
- Modern portfolio website
- Real-time chat with AI agent
- Admin dashboard with analytics
- Visitor tracking & intelligence
- Conversation history

**Key Routes:**
- `/` - Public landing page
- `/dashboard` - Admin panel
- `/api/chat/stream` - Chat proxy to agent
- `/api/profiles` - Profile management
- `/api/analytics` - Visitor analytics

### Backend (apps/agent)

**Tech Stack:**
- FastAPI
- Python 3.12
- OpenAI GPT-4
- Mem0 (memory layer)
- PostgreSQL

**Features:**
- Conversational AI agent
- Memory persistence across sessions
- Web search capability
- Profile extraction & management
- Tool-based architecture

**Endpoints:**
- `GET /health` - Health check
- `POST /chat` - Non-streaming chat
- `POST /chat/stream` - SSE streaming chat

## 📦 Workspaces

This monorepo uses npm workspaces. Run commands in specific apps:

```bash
# Run in web app
npm run <script> --workspace=apps/web

# Run in agent app
npm run <script> --workspace=apps/agent
```

Or use the root shortcuts:

```bash
npm run dev        # Start web dev server
npm run build      # Build web app
npm run db:init    # Initialize database
npm run db:seed    # Seed database
```

## 🗄️ Database

**Schema**: 4-table simplified architecture

1. **profiles** - Bill + all visitors (JSONB data)
2. **conversations** - Chat threads
3. **messages** - Individual messages
4. **sessions** - Analytics & tracking

See `apps/web/scripts/schema-4-tables-final.sql` for complete schema.

## 🔧 Development Scripts

### Frontend (apps/web)

```bash
cd apps/web

npm run dev           # Start Next.js dev server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint

npm run db:init       # Initialize database schema
npm run db:seed       # Seed Bill's profile
npm run db:reset      # Drop, recreate, and seed
```

### Backend (apps/agent)

```bash
cd apps/agent
source venv/bin/activate

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Run tests (if available)
pytest

# Type checking
mypy .
```

## 📖 Documentation

- **Agent Architecture**: `docs/AGENT_ARCHITECTURE.md`
- **Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **Tracking System**: `docs/TRACKING_README.md`, `docs/TRACKING_ARCHITECTURE.md`
- **Code Guidelines**: `docs/CODE_GUIDELINES.md`

## 🚢 Deployment

### Quick Deploy

**Frontend (Vercel):**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this repository
3. Add environment variables (see `DEPLOY_TO_VERCEL.md`)
4. Deploy

**Backend (AWS EC2):**
1. Set up infrastructure: `docs/DEPLOYMENT_GUIDE.md`
2. Add GitHub secrets for CI/CD
3. Push to `main` → auto-deploys via GitHub Actions

### CI/CD Status

- ✅ **Frontend**: Vercel auto-deploys on push to `main`
- ✅ **Backend**: GitHub Actions deploys to EC2 on push to `main`
- 💰 **Cost**: ~$24-44/month

### Documentation

- **🚀 Quick Start**: `DEPLOY_TO_VERCEL.md` - Deploy frontend in 5 minutes
- **📋 Full Guide**: `CICD_STATUS.md` - Complete deployment overview
- **⚙️ CI/CD Setup**: `docs/CICD.md` - GitHub Actions workflows
- **☁️ AWS Infrastructure**: `docs/DEPLOYMENT_GUIDE.md` - Backend setup
- **🛠️ Manual Deploy**: `docs/deploy/README.md` - Manual scripts

**Production checklist:**
- [ ] Deploy to Vercel ([guide](DEPLOY_TO_VERCEL.md))
- [ ] Set up GitHub secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- [ ] Configure SSM parameters (`OPENAI_API_KEY`)
- [ ] Set environment variables in Vercel
- [ ] Update `DASHBOARD_PASSWORD`
- [ ] Configure PostgreSQL with connection pooling
- [ ] Add custom domain in Vercel
- [ ] Set up monitoring

## 🤝 Contributing

This is a personal project, but feel free to fork and adapt for your own use!

## 📝 License

Private - for personal use only.

---

**Built with:**
- Next.js for the frontend
- FastAPI for the agent backend
- PostgreSQL for data persistence
- Mem0 for memory management
- OpenAI for AI capabilities
