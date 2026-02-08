# Bills.bio Web App

Next.js frontend for bills.bio - a modern personal portfolio website with integrated AI chat.

## Features

- 🎨 Modern, responsive design with Tailwind CSS
- 💬 Real-time chat with AI agent (streaming responses)
- 🎛️ Admin dashboard with analytics
- 📊 Visitor tracking & intelligence
- 🗄️ PostgreSQL integration for profiles and conversations
- 🔒 Secure admin panel with password protection

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (node-postgres)
- **State**: React Context
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16+
- Python agent running (see `../agent/`)

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Edit .env.local with:
# - DATABASE_URL (PostgreSQL connection)
# - AGENT_API_URL (Python agent, default: http://localhost:8000)
# - DASHBOARD_PASSWORD (for admin access)
```

### Database Setup

```bash
# Initialize schema
npm run db:init

# Seed Bill's profile
npm run db:seed

# Or reset everything
npm run db:reset
```

### Development

```bash
# Start dev server (port 3002)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Project Structure

```
apps/web/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── api/                  # API routes
│   │   ├── chat/stream/      # Chat proxy to agent
│   │   ├── profiles/         # Profile management
│   │   ├── conversations/    # Conversation history
│   │   ├── analytics/        # Analytics queries
│   │   └── tracking/         # Visitor tracking
│   └── dashboard/            # Admin panel
│       ├── page.tsx          # Dashboard home
│       ├── analytics/        # Analytics page
│       └── chats/            # Conversations page
│
├── components/
│   ├── Chat.tsx              # Chat interface
│   ├── ConversationSidebar.tsx
│   ├── AnalyticsDashboard.tsx
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   └── Footer.tsx
│
├── lib/
│   ├── db.ts                 # PostgreSQL client
│   ├── db/                   # Database queries
│   │   ├── store.ts          # Conversations & profiles
│   │   └── schema.ts         # Type definitions
│   ├── tracking/             # Visitor tracking
│   │   ├── store.ts          # Session tracking
│   │   ├── intelligence.ts   # IP intelligence
│   │   └── client.ts         # Client-side tracker
│   └── types/
│       └── profile.ts        # Profile types
│
├── context/
│   └── ChatContext.tsx       # Chat state management
│
├── scripts/
│   ├── schema-4-tables-final.sql
│   ├── seed-bill-simple.ts
│   └── setup-database.sh
│
└── middleware.ts             # Auth middleware
```

## Key Features

### Chat Interface

Real-time chat with streaming responses from the Python agent:

```typescript
// apps/web/app/api/chat/stream/route.ts
const res = await fetch(`${AGENT_API_URL}/chat/stream`, {
  method: 'POST',
  body: JSON.stringify({ messages, session_id })
})
```

### Admin Dashboard

Protected admin panel at `/dashboard`:
- View all conversations
- Monitor visitor analytics
- Chat with the AI agent
- Manage profiles

### Visitor Tracking

Comprehensive tracking system:
- IP intelligence (geolocation, ISP, threat detection)
- Device fingerprinting
- Session tracking
- Behavioral analytics

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://localhost:5432/bills_bio

# Agent API
AGENT_API_URL=http://localhost:8000

# Dashboard
DASHBOARD_PASSWORD=your_secure_password

# Optional: IP Intelligence APIs
IPDATA_API_KEY=
IPHUB_API_KEY=
```

## API Routes

### Public

- `POST /api/chat/stream` - Streaming chat (proxies to agent)
- `POST /api/tracking/session` - Track session
- `POST /api/tracking/pageview` - Track page view

### Protected (Admin)

- `GET /api/profiles` - List profiles
- `GET /api/profiles/owner` - Get Bill's profile
- `GET /api/conversations` - List conversations
- `GET /api/analytics` - Get analytics data

## Database Schema

See `scripts/schema-4-tables-final.sql` for complete schema:

- **profiles** - User profiles (Bill + visitors)
- **conversations** - Chat threads
- **messages** - Individual messages
- **sessions** - Analytics & tracking

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual Deployment

```bash
# Build
npm run build

# Set environment variables
export DATABASE_URL=...
export AGENT_API_URL=...

# Start
npm start
```

## Common Tasks

### Update Bill's Profile

```bash
# Edit and run seed script
npm run db:seed
```

### View Database

```bash
psql $DATABASE_URL

\dt                           # List tables
SELECT * FROM profiles;       # View profiles
SELECT * FROM conversations;  # View conversations
```

### Clear Analytics

```bash
psql $DATABASE_URL -c "DELETE FROM sessions;"
```

## Troubleshooting

### Port Already in Use

```bash
# Use different port
PORT=3003 npm run dev
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL
```

### Agent Connection Failed

Make sure the Python agent is running:
```bash
cd ../agent
source venv/bin/activate
uvicorn main:app --port 8000
```

## License

Private - for personal use only.
