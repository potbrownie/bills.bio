'use client'

import DashboardNavbar from '@/components/DashboardNavbar'
import ConversationSidebar from '@/components/ConversationSidebar'
import AuthGuard from '@/components/AuthGuard'
import BillingChart from '@/components/BillingChart'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

interface BillingData {
  current_period: {
    start_date: string
    end_date: string
    openai: {
      total_tokens: number
      prompt_tokens: number
      completion_tokens: number
      estimated_cost: number
    }
    aws: {
      ses_emails_sent: number
      ses_cost: number
      other_services: { service: string; cost: number }[]
      total_cost: number
    }
    total_cost: number
  }
  previous_periods: Array<{
    period: string
    openai_cost: number
    aws_cost: number
    total_cost: number
  }>
  breakdown: {
    by_conversation: Array<{
      conversation_id: string
      title: string
      tokens: number
      cost: number
      message_count: number
      user_name?: string
      user_email?: string
      user_type?: string
    }>
  }
}

export default function BillingPage() {
  const { handleLogout } = useAuth()
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/billing')
      if (!response.ok) {
        throw new Error('Failed to fetch billing data')
      }
      const data = await response.json()
      setBillingData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <AuthGuard showBackLink>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-light text-charcoal mb-2">Billing</h1>
            <p className="text-taupe">Track your OpenAI token usage and AWS service costs</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-gold"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Error: {error}</p>
              <button
                onClick={fetchBillingData}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && billingData && (
            <div className="space-y-6">
              {/* Current Period Summary */}
              <div className="bg-white rounded-lg border border-warm-cream p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-light text-charcoal">Current Period</h2>
                    <p className="text-sm text-taupe mt-1">
                      {new Date(billingData.current_period.start_date).toLocaleDateString()} -{' '}
                      {new Date(billingData.current_period.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-taupe">Total Cost</p>
                    <p className="text-3xl font-light text-charcoal">
                      {formatCurrency(billingData.current_period.total_cost)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* OpenAI Card */}
                  <div className="bg-warm-cream/30 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-warm-gold/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-warm-gold"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-light text-charcoal">OpenAI (ChatGPT)</h3>
                        <p className="text-2xl font-light text-charcoal mt-1">
                          {formatCurrency(billingData.current_period.openai.estimated_cost)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-taupe">Total Tokens:</span>
                        <span className="text-charcoal font-medium">
                          {formatNumber(billingData.current_period.openai.total_tokens)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-taupe">Prompt Tokens:</span>
                        <span className="text-charcoal">
                          {formatNumber(billingData.current_period.openai.prompt_tokens)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-taupe">Completion Tokens:</span>
                        <span className="text-charcoal">
                          {formatNumber(billingData.current_period.openai.completion_tokens)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AWS Card */}
                  <div className="bg-warm-cream/30 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-warm-gold/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-warm-gold"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-light text-charcoal">AWS Services</h3>
                        <p className="text-2xl font-light text-charcoal mt-1">
                          {formatCurrency(billingData.current_period.aws.total_cost)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-taupe">SES Emails Sent:</span>
                        <span className="text-charcoal font-medium">
                          {formatNumber(billingData.current_period.aws.ses_emails_sent)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-taupe">SES Cost:</span>
                        <span className="text-charcoal">
                          {formatCurrency(billingData.current_period.aws.ses_cost)}
                        </span>
                      </div>
                      {billingData.current_period.aws.other_services.map((service) => (
                        <div key={service.service} className="flex justify-between">
                          <span className="text-taupe">{service.service}:</span>
                          <span className="text-charcoal">{formatCurrency(service.cost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage by Conversation */}
              <div className="bg-white rounded-lg border border-warm-cream p-6 shadow-sm">
                <h2 className="text-2xl font-light text-charcoal mb-4">Usage by Conversation</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-warm-cream">
                        <th className="text-left py-3 px-4 text-sm font-light text-taupe">
                          Conversation
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-light text-taupe">
                          User
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-light text-taupe">
                          Messages
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-light text-taupe">
                          Tokens
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-light text-taupe">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.breakdown.by_conversation.map((conv) => (
                        <tr
                          key={conv.conversation_id}
                          className="border-b border-warm-cream/50 hover:bg-warm-cream/20 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-charcoal">
                            {conv.title || 'Untitled conversation'}
                          </td>
                          <td className="py-3 px-4 text-sm text-taupe">
                            <div className="flex items-center gap-2">
                              {conv.user_type === 'owner' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warm-gold/20 text-warm-gold">
                                  Owner
                                </span>
                              )}
                              <span>{conv.user_name || 'Unknown'}</span>
                            </div>
                            {conv.user_email && (
                              <div className="text-xs text-taupe/60 mt-0.5">{conv.user_email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-taupe">
                            {conv.message_count}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-taupe">
                            {formatNumber(conv.tokens)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-charcoal font-medium">
                            {formatCurrency(conv.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical Data */}
              <div className="bg-white rounded-lg border border-warm-cream p-6 shadow-sm">
                <h2 className="text-2xl font-light text-charcoal mb-6">Historical Usage</h2>
                
                {/* Chart */}
                {billingData.previous_periods.length > 0 && (
                  <div className="mb-6">
                    <BillingChart data={billingData.previous_periods} />
                  </div>
                )}
                
                <div className="space-y-3">
                  {billingData.previous_periods.map((period) => (
                    <div
                      key={period.period}
                      className="flex items-center justify-between p-4 bg-warm-cream/20 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-charcoal">{period.period}</p>
                        <div className="flex gap-4 mt-1 text-xs text-taupe">
                          <span>OpenAI: {formatCurrency(period.openai_cost)}</span>
                          <span>AWS: {formatCurrency(period.aws_cost)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-light text-charcoal">
                          {formatCurrency(period.total_cost)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Breakdown Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Cost Calculation</p>
                    <p>
                      OpenAI costs are estimated based on token usage and current pricing (GPT-4o: $2.50/1M input tokens, $10.00/1M output tokens).
                      AWS costs are based on actual service usage. For real-time AWS billing, connect your AWS Cost Explorer API.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Conversation Sidebar */}
        <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}
