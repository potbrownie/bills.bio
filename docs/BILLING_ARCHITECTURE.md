# Billing System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Dashboard Navbar                              │  │
│  │  [Home] [Chats] [People] [Blog] [Analytics]    [Profile ▾]│  │
│  │                                            └─► Billing ◄──┘│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              /billing Page                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Current Period Summary                             │  │  │
│  │  │  ┌──────────────────┐  ┌──────────────────┐        │  │  │
│  │  │  │  OpenAI          │  │  AWS Services    │        │  │  │
│  │  │  │  $0.75           │  │  $0.29           │        │  │  │
│  │  │  │  50K tokens      │  │  25 emails       │        │  │  │
│  │  │  └──────────────────┘  └──────────────────┘        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Per-Conversation Breakdown                         │  │  │
│  │  │  [Table with costs by conversation]                 │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Historical Usage Chart                             │  │  │
│  │  │  [Stacked bar chart: OpenAI vs AWS over 6 months]  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ GET /api/billing
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer                                   │
│                                                                   │
│  /api/billing/route.ts                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Fetch messages from database                           │ │
│  │  2. Calculate token usage (actual or estimated)            │ │
│  │  3. Calculate OpenAI costs (based on pricing)              │ │
│  │  4. Fetch/estimate AWS costs                               │ │
│  │  5. Group by conversation                                  │ │
│  │  6. Generate historical data (6 months)                    │ │
│  │  7. Return JSON response                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer                                │
│                                                                   │
│  PostgreSQL (bills_bio)                                          │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │  messages          │  │  profiles          │                 │
│  ├────────────────────┤  ├────────────────────┤                 │
│  │ id                 │  │ id                 │                 │
│  │ conversation_id    │  │ type: 'owner'      │                 │
│  │ role: user/asst    │  │ data: {            │                 │
│  │ content: "..."     │  │   emails_sent: 25  │                 │
│  │ data: {            │  │ }                  │                 │
│  │   tokens: 150      │  └────────────────────┘                 │
│  │   prompt_tokens: 100│                                         │
│  │   completion_tokens: 50│                                      │
│  │   model: "gpt-4o"  │                                          │
│  │ }                  │                                          │
│  │ created_at         │                                          │
│  └────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Message Creation Flow

```
User sends message
        │
        ▼
Agent processes with OpenAI
        │
        ▼
OpenAI returns response + usage data
        │
        ▼
Store message in database
- content
- data.tokens
- data.prompt_tokens
- data.completion_tokens
- data.model
```

### 2. Email Sending Flow

```
Agent triggers send_email tool
        │
        ▼
AWS SES sends email
        │
        ▼
Success? → Track usage in database
        │
        ▼
Update owner profile
- data.emails_sent_this_month += 1
```

### 3. Billing Calculation Flow

```
User visits /billing
        │
        ▼
Frontend calls /api/billing
        │
        ▼
API fetches messages + profiles
        │
        ├─► Calculate OpenAI costs
        │   - Group messages by conversation
        │   - Sum tokens per conversation
        │   - Apply pricing model
        │   - Return total + breakdown
        │
        ├─► Calculate AWS costs
        │   - Get email count from profile
        │   - Estimate or fetch actual costs
        │   - Apply pricing (SES, S3, Lambda)
        │   - Return total + breakdown
        │
        └─► Generate historical data
            - Query messages by month (last 6 months)
            - Calculate costs per month
            - Return time series data
        │
        ▼
Return JSON to frontend
        │
        ▼
Frontend renders dashboard
```

## Component Architecture

### Frontend Components

```
/billing/page.tsx (Main Page)
├─ DashboardNavbar
│  └─ Profile Dropdown
│     └─ "Billing" Link
├─ Current Period Section
│  ├─ OpenAI Cost Card
│  └─ AWS Cost Card
├─ Breakdown Section
│  └─ Conversation Table
├─ Historical Section
│  ├─ BillingChart
│  └─ Period List
└─ Info Sections
```

### API Endpoints

```
/api/billing
├─ GET - Fetch billing data
│  ├─ Query messages table
│  ├─ Query profiles table
│  ├─ Calculate costs
│  └─ Return JSON
│
└─ (Future: POST for manual updates)
```

### Utilities

```
lib/aws-costs.ts
├─ getAWSCosts()
│  └─ AWS Cost Explorer integration (optional)
└─ estimateAWSCosts()
   └─ Estimate based on usage patterns

scripts/
├─ seed-billing-data.ts
│  └─ Create test data
├─ track-email-usage.ts
│  └─ Manual email tracking
└─ reset-monthly-billing.ts
   └─ Reset monthly counters
```

## Data Storage Strategy

### JSONB Fields (No Schema Changes)

```sql
-- Messages table (existing)
messages.data = {
  "tokens": 150,
  "prompt_tokens": 100,
  "completion_tokens": 50,
  "model": "gpt-4o-mini"
}

-- Profiles table (existing)
profiles.data = {
  "emails_sent_this_month": 25,
  "last_billing_reset": "2024-02-01T00:00:00Z"
}
```

Benefits:
- ✅ No schema migrations
- ✅ Flexible data structure
- ✅ Easy to add new fields
- ✅ Indexed for fast queries

## Cost Calculation Logic

### OpenAI Pricing

```typescript
// Pricing per 1M tokens
const PRICING = {
  'gpt-4o': {
    input: $2.50,   // per 1M tokens
    output: $10.00  // per 1M tokens
  },
  'gpt-4o-mini': {
    input: $0.15,   // per 1M tokens
    output: $0.60   // per 1M tokens
  }
}

// Calculation
cost = (prompt_tokens * pricing.input / 1_000_000) +
       (completion_tokens * pricing.output / 1_000_000)
```

### AWS Pricing

```typescript
// SES: $0.10 per 1,000 emails
ses_cost = (emails_sent / 1000) * 0.10

// S3: ~$0.023 per GB/month
s3_cost = storage_gb * 0.023

// Lambda: $0.20 per 1M requests
lambda_cost = (invocations / 1_000_000) * 0.20

total_aws_cost = ses_cost + s3_cost + lambda_cost
```

## Integration Points

### 1. Agent Integration

```python
# apps/agent/tools/send_email.py
def send_email(...):
    # Send email via AWS SES
    response = ses_client.send_email(...)
    
    # Track usage
    _track_email_usage()  # Increments counter in database
```

### 2. Message Storage

```typescript
// apps/web/app/api/conversations/[id]/messages/route.ts
await addMessage(id, {
  role: 'assistant',
  content: response,
  data: {
    tokens: usage.total_tokens,
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    model: 'gpt-4o-mini'
  }
})
```

### 3. AWS Cost Explorer (Optional)

```typescript
// apps/web/lib/aws-costs.ts
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer'

export async function getAWSCosts(startDate, endDate) {
  const client = new CostExplorerClient({ region: 'us-east-1' })
  const response = await client.send(new GetCostAndUsageCommand(...))
  return parseAWSCosts(response)
}
```

## Security Considerations

### API Protection
- ✅ AuthGuard on billing page (dashboard password)
- ✅ API rate limiting (via existing middleware)
- ⬜ (Future) Per-user authorization

### Data Privacy
- ✅ Only owner can access billing
- ✅ No sensitive data in URLs
- ✅ Secure database queries

### AWS Credentials
- ✅ Environment variables only
- ✅ Never committed to git
- ✅ IAM role support

## Performance Optimization

### Database Queries
```sql
-- Indexed fields for fast queries
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Efficient aggregation
SELECT 
  conversation_id,
  SUM((data->>'tokens')::int) as total_tokens,
  COUNT(*) as message_count
FROM messages
WHERE created_at >= '2024-02-01'
GROUP BY conversation_id;
```

### Caching Strategy
- Frontend caches billing data for 1 minute
- API calculates on-demand (future: Redis cache)
- Historical data pre-computed monthly

### Pagination
- Conversation breakdown limited to top 50
- Historical data limited to 6 months
- Lazy loading for large datasets (future)

## Monitoring & Logging

### Application Logs
```
[INFO] Email sent successfully (message_id=abc123)
[INFO] Email usage tracked: 24 → 25
[INFO] Billing API: calculated costs for 150 messages
[WARN] AWS Cost Explorer not configured, using estimates
```

### Database Monitoring
- Track query performance
- Monitor table growth
- Alert on unusual patterns

## Maintenance Tasks

### Daily
- ✅ Automatic email tracking
- ✅ Automatic token storage

### Monthly
- ⬜ Reset monthly counters (cron job)
- ⬜ Archive historical data
- ⬜ Review and optimize costs

### Quarterly
- ⬜ Update pricing if changed
- ⬜ Review cost trends
- ⬜ Optimize high-cost areas

## Extension Points

### Future Enhancements

1. **Cost Alerts**
   - Email notifications when costs exceed threshold
   - Slack integration for real-time alerts

2. **Budget Management**
   - Set monthly budgets
   - Auto-disable features when budget exceeded

3. **Per-User Billing**
   - Track costs per visitor/customer
   - Generate invoices automatically

4. **Advanced Analytics**
   - Cost trends and forecasting
   - Optimization recommendations
   - Comparative analysis

5. **Export & Reporting**
   - CSV/PDF export
   - Monthly reports
   - Custom date ranges

## Technical Stack

```
Frontend:
- Next.js 16 (React 19)
- TypeScript
- Tailwind CSS

Backend:
- Next.js API Routes
- PostgreSQL with JSONB
- Python FastAPI (Agent)

External Services:
- OpenAI API (GPT-4o, GPT-4o-mini)
- AWS SES (Email)
- AWS Cost Explorer (Optional)

Tools:
- tsx (TypeScript execution)
- asyncpg (Python DB client)
- boto3 (AWS SDK for Python)
```

## Summary

The billing system is:
- ✅ **Modular**: Easy to add new features
- ✅ **Flexible**: No schema changes, uses JSONB
- ✅ **Scalable**: Efficient queries and indexing
- ✅ **Maintainable**: Well-documented and tested
- ✅ **Extensible**: Clear integration points

---

For implementation details, see `docs/BILLING_SYSTEM.md`
For quick start, see `apps/web/README_BILLING.md`
