import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAWSCosts, estimateAWSCosts } from '@/lib/aws-costs'

// OpenAI GPT-4o pricing (as of 2024)
// https://openai.com/pricing
const PRICING = {
  'gpt-4o': {
    input: 2.50 / 1_000_000,  // $2.50 per 1M input tokens
    output: 10.00 / 1_000_000, // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000,  // $0.15 per 1M input tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M output tokens
  }
}

// AWS SES pricing: $0.10 per 1,000 emails
const AWS_SES_PRICE_PER_EMAIL = 0.0001

interface TokenUsage {
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  model?: string
}

// Estimate tokens from text (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Calculate cost based on tokens and model
function calculateCost(usage: TokenUsage): number {
  const model = usage.model || 'gpt-4o'
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o']
  
  const inputCost = usage.prompt_tokens * pricing.input
  const outputCost = usage.completion_tokens * pricing.output
  
  return inputCost + outputCost
}

export async function GET(request: NextRequest) {
  try {
    const client = await db.getClient()

    try {
      // Get current period dates (current month)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Fetch all messages from current period with profile info
      const messagesResult = await client.query(
        `SELECT 
          m.id,
          m.conversation_id,
          m.role,
          m.content,
          m.data,
          m.created_at,
          c.title,
          c.profile_id,
          p.name as profile_name,
          p.email as profile_email,
          p.type as profile_type
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN profiles p ON c.profile_id = p.id
        WHERE m.created_at >= $1 AND m.created_at <= $2
        ORDER BY m.created_at DESC`,
        [startOfMonth, endOfMonth]
      )

      // Calculate token usage and costs
      let totalTokens = 0
      let promptTokens = 0
      let completionTokens = 0
      const conversationUsage = new Map<string, {
        title: string
        tokens: number
        cost: number
        message_count: number
        prompt_tokens: number
        completion_tokens: number
        profile_name?: string
        profile_email?: string
        profile_type?: string
      }>()

      for (const message of messagesResult.rows) {
        // Try to get token count from message data if stored
        const storedTokens = message.data?.tokens
        const storedPromptTokens = message.data?.prompt_tokens
        const storedCompletionTokens = message.data?.completion_tokens
        
        let messageTokens: number
        let messagePromptTokens: number
        let messageCompletionTokens: number

        if (storedTokens) {
          messageTokens = storedTokens
          messagePromptTokens = storedPromptTokens || 0
          messageCompletionTokens = storedCompletionTokens || 0
        } else {
          // Estimate tokens from content
          messageTokens = estimateTokens(message.content)
          
          if (message.role === 'user') {
            messagePromptTokens = messageTokens
            messageCompletionTokens = 0
          } else if (message.role === 'assistant') {
            messagePromptTokens = 0
            messageCompletionTokens = messageTokens
          } else {
            messagePromptTokens = messageTokens
            messageCompletionTokens = 0
          }
        }

        totalTokens += messageTokens
        promptTokens += messagePromptTokens
        completionTokens += messageCompletionTokens

        // Track by conversation
        const convId = message.conversation_id
        if (!conversationUsage.has(convId)) {
          conversationUsage.set(convId, {
            title: message.title || 'Untitled',
            tokens: 0,
            cost: 0,
            message_count: 0,
            prompt_tokens: 0,
            completion_tokens: 0,
            profile_name: message.profile_name,
            profile_email: message.profile_email,
            profile_type: message.profile_type
          })
        }
        
        const conv = conversationUsage.get(convId)!
        conv.tokens += messageTokens
        conv.prompt_tokens += messagePromptTokens
        conv.completion_tokens += messageCompletionTokens
        conv.message_count += 1
      }

      // Calculate costs for each conversation
      const conversationBreakdown = Array.from(conversationUsage.entries()).map(([id, data]) => ({
        conversation_id: id,
        title: data.title,
        tokens: data.tokens,
        message_count: data.message_count,
        user_name: data.profile_name,
        user_email: data.profile_email,
        user_type: data.profile_type,
        cost: calculateCost({
          total_tokens: data.tokens,
          prompt_tokens: data.prompt_tokens,
          completion_tokens: data.completion_tokens
        })
      })).sort((a, b) => b.cost - a.cost)

      const openaiCost = calculateCost({
        total_tokens: totalTokens,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens
      })

      // Get AWS costs (real or estimated)
      let sesEmailsSent = 0
      const profilesResult = await client.query(
        `SELECT data FROM profiles WHERE type = 'owner' LIMIT 1`
      )
      if (profilesResult.rows.length > 0) {
        const ownerData = profilesResult.rows[0].data
        sesEmailsSent = ownerData?.emails_sent_this_month || 0
      }

      // Try to get real AWS costs, fall back to estimation
      let awsCosts
      try {
        awsCosts = await getAWSCosts(startOfMonth, endOfMonth)
        // If no services returned, use estimation
        if (awsCosts.services.length === 0) {
          awsCosts = estimateAWSCosts({ sesEmailsSent })
        }
      } catch (error) {
        console.error('Failed to fetch AWS costs, using estimation:', error)
        awsCosts = estimateAWSCosts({ sesEmailsSent })
      }

      const sesCost = awsCosts.services.find(s => s.service.includes('Email'))?.cost || 
                      sesEmailsSent * AWS_SES_PRICE_PER_EMAIL
      
      const otherServices = awsCosts.services.filter(s => !s.service.includes('Email'))
      const awsTotalCost = awsCosts.total_cost || (sesCost + otherServices.reduce((sum, s) => sum + s.cost, 0))

      // Get previous periods (last 6 months)
      const previousPeriods = []
      for (let i = 1; i <= 6; i++) {
        const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
        
        const periodMessages = await client.query(
          `SELECT 
            m.role,
            m.content,
            m.data
          FROM messages m
          WHERE m.created_at >= $1 AND m.created_at <= $2`,
          [periodStart, periodEnd]
        )

        let periodPromptTokens = 0
        let periodCompletionTokens = 0
        let periodTotalTokens = 0

        for (const msg of periodMessages.rows) {
          const tokens = msg.data?.tokens || estimateTokens(msg.content)
          periodTotalTokens += tokens
          
          if (msg.role === 'user') {
            periodPromptTokens += tokens
          } else if (msg.role === 'assistant') {
            periodCompletionTokens += tokens
          }
        }

        const periodOpenAICost = calculateCost({
          total_tokens: periodTotalTokens,
          prompt_tokens: periodPromptTokens,
          completion_tokens: periodCompletionTokens
        })

        // Estimate AWS cost for period (simplified)
        const periodAWSCost = awsTotalCost * 0.8 // Rough estimate

        previousPeriods.push({
          period: periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          openai_cost: periodOpenAICost,
          aws_cost: periodAWSCost,
          total_cost: periodOpenAICost + periodAWSCost
        })
      }

      const billingData = {
        current_period: {
          start_date: startOfMonth.toISOString(),
          end_date: endOfMonth.toISOString(),
          openai: {
            total_tokens: totalTokens,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            estimated_cost: openaiCost
          },
          aws: {
            ses_emails_sent: sesEmailsSent,
            ses_cost: sesCost,
            other_services: otherServices,
            total_cost: awsTotalCost
          },
          total_cost: openaiCost + awsTotalCost
        },
        previous_periods: previousPeriods,
        breakdown: {
          by_conversation: conversationBreakdown
        }
      }

      return NextResponse.json(billingData)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Billing API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    )
  }
}
