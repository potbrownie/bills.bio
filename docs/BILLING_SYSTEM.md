# Billing System

The billing system tracks OpenAI token usage and AWS service costs for the bills.bio platform.

## Features

- **Token Usage Tracking**: Monitor OpenAI API token consumption (prompt and completion tokens)
- **Cost Estimation**: Automatic cost calculation based on OpenAI pricing
- **AWS Cost Integration**: Track AWS services like SES, S3, Lambda
- **Per-Conversation Breakdown**: See token usage and costs by conversation
- **Historical Data**: View past months' usage and costs
- **Real-time Updates**: Fetch current period costs on demand

## Accessing the Billing Page

Visit `/billing` in the dashboard (accessible from the profile dropdown menu).

## How It Works

### Token Tracking

The system tracks tokens in two ways:

1. **Estimated** (default): Calculates tokens based on message content (~1 token per 4 characters)
2. **Actual** (recommended): Stores real token counts from OpenAI API responses

Token data is stored in the `messages` table in the `data` JSONB column:

```json
{
  "tokens": 150,
  "prompt_tokens": 100,
  "completion_tokens": 50,
  "model": "gpt-4o-mini"
}
```

### Cost Calculation

Costs are calculated using current OpenAI pricing:

- **GPT-4o**: $2.50/1M input tokens, $10.00/1M output tokens
- **GPT-4o-mini**: $0.15/1M input tokens, $0.60/1M output tokens

### AWS Cost Tracking

AWS costs can be tracked in two ways:

#### Option 1: Estimation (Default)

The system estimates AWS costs based on usage patterns:
- **SES**: $0.10 per 1,000 emails
- **S3**: ~$0.023 per GB/month
- **Lambda**: $0.20 per 1M requests

#### Option 2: Real-time via AWS Cost Explorer API

For accurate AWS billing data, configure AWS Cost Explorer integration:

1. Install the AWS SDK:
   ```bash
   cd apps/web
   npm install @aws-sdk/client-cost-explorer
   ```

2. Set environment variables in `apps/web/.env`:
   ```bash
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   ```

3. Ensure your IAM user has these permissions:
   - `ce:GetCostAndUsage`
   - `ce:GetCostForecast`

4. Uncomment the implementation in `apps/web/lib/aws-costs.ts`

## Improving Token Tracking Accuracy

To store actual token counts from OpenAI (recommended):

### Agent-side (Python)

Update `apps/agent/agent/runner.py` to capture and return usage data:

```python
# In _run_agent_sync function, after getting response:
usage = getattr(response, 'usage', None)
if usage:
    tokens_used = {
        'prompt_tokens': usage.prompt_tokens,
        'completion_tokens': usage.completion_tokens,
        'total_tokens': usage.total_tokens
    }
    # Return this with the response
```

### Web-side (TypeScript)

Update the conversation API to accept and store token data:

```typescript
// In apps/web/app/api/conversations/[id]/messages/route.ts
await addMessage(id, {
  role,
  content,
  timestamp: Date.now(),
  sources,
  data: {
    tokens: body.tokens,
    prompt_tokens: body.prompt_tokens,
    completion_tokens: body.completion_tokens,
    model: body.model
  }
})
```

## Database Schema

Token usage is stored in the existing `messages` table:

```sql
-- No schema changes needed!
-- Uses the existing data JSONB column:
SELECT 
  id,
  conversation_id,
  role,
  content,
  data->>'tokens' as tokens,
  data->>'prompt_tokens' as prompt_tokens,
  data->>'completion_tokens' as completion_tokens,
  created_at
FROM messages;
```

## API Endpoints

### GET /api/billing

Returns billing data for the current period and historical data.

**Response:**

```json
{
  "current_period": {
    "start_date": "2024-02-01T00:00:00.000Z",
    "end_date": "2024-02-29T23:59:59.000Z",
    "openai": {
      "total_tokens": 50000,
      "prompt_tokens": 30000,
      "completion_tokens": 20000,
      "estimated_cost": 0.75
    },
    "aws": {
      "ses_emails_sent": 100,
      "ses_cost": 0.01,
      "other_services": [
        { "service": "S3", "cost": 0.23 },
        { "service": "Lambda", "cost": 0.05 }
      ],
      "total_cost": 0.29
    },
    "total_cost": 1.04
  },
  "previous_periods": [
    {
      "period": "January 2024",
      "openai_cost": 0.65,
      "aws_cost": 0.25,
      "total_cost": 0.90
    }
  ],
  "breakdown": {
    "by_conversation": [
      {
        "conversation_id": "uuid",
        "title": "Chat about AI",
        "tokens": 15000,
        "cost": 0.25,
        "message_count": 10
      }
    ]
  }
}
```

## Cost Monitoring Best Practices

1. **Set up alerts**: Monitor when costs exceed thresholds
2. **Review regularly**: Check the billing page weekly
3. **Optimize prompts**: Reduce token usage with concise prompts
4. **Use cheaper models**: Use `gpt-4o-mini` for simple tasks
5. **Cache responses**: Implement caching for repeated queries
6. **Track per-user**: Monitor individual conversation costs

## Troubleshooting

### Token counts seem inaccurate

- **Problem**: Estimated token counts are rough approximations
- **Solution**: Implement actual token tracking from OpenAI responses (see "Improving Token Tracking Accuracy")

### AWS costs show $0.00

- **Problem**: AWS Cost Explorer not configured
- **Solution**: Either configure AWS Cost Explorer API or use estimation based on tracked usage

### Historical data missing

- **Problem**: System only tracks data from messages in the database
- **Solution**: Historical data will build up over time as conversations are created

## Future Enhancements

- [ ] Set up cost alerts via email
- [ ] Add cost forecasting based on usage trends
- [ ] Per-user cost allocation
- [ ] Budget limits and warnings
- [ ] Export billing data to CSV
- [ ] Integration with Stripe for customer billing
- [ ] Real-time cost dashboard with charts
- [ ] Cost optimization suggestions

## Support

For issues or questions about the billing system:
1. Check the logs: `apps/web` console and API logs
2. Verify database connection and queries
3. Check OpenAI API status
4. Verify AWS credentials (if using Cost Explorer)
