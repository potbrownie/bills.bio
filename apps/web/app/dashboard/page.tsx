'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Chat from '@/components/Chat'
import ConversationSidebar from '@/components/ConversationSidebar'
import { ChatProvider } from '@/context/ChatContext'

interface QuickStats {
  totalVisitors: number
  totalSessions: number
  avgThreatLevel: number
  highThreatCount: number
  totalConversations: number
  activeConversations: number
  totalMessages: number
}

interface ActivityItem {
  icon: string
  text: string
  time: string
}

interface CountryData {
  code: string
  flag: string
  name: string
  count: number
  percentage: number
}

interface SystemStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  message?: string
  details?: any
}

export default function DashboardHome() {
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [topCountries, setTopCountries] = useState<CountryData[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([])
  const [selectedSystem, setSelectedSystem] = useState<SystemStatus | null>(null)

  useEffect(() => {
    fetchQuickStats()
    checkSystemStatus()
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending states
      setStats(null)
      setRecentActivity([])
      setTopCountries([])
      setSystemStatus([])
      setSelectedSystem(null)
    }
  }, [])

  const fetchQuickStats = async () => {
    try {
      // Get analytics data (limit to 100 for dashboard)
      const analyticsRes = await fetch('/api/analytics?limit=100')
      const analyticsData = await analyticsRes.json()
      
      // Get conversations data (limit to 50, without full messages for memory efficiency)
      const conversationsRes = await fetch('/api/conversations?limit=50&includeMessages=true')
      const conversationsData = await conversationsRes.json()
      
      // Calculate today's visitors
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = today.getTime()
      
      // Limit session processing to recent data only (last 100 sessions)
      const recentSessions = (analyticsData.sessions || []).slice(0, 100)
      
      const totalSessions = analyticsData.sessions?.length || 0
      
      const highThreatCount = recentSessions.filter(
        (s: any) => s.threatLevel > 50
      ).length
      
      // Count messages from the conversations data (messages are already included)
      let totalMessages = 0
      const conversations = conversationsData.conversations || []
      for (const conv of conversations) {
        totalMessages += conv.messages?.length || 0
      }
      
      setStats({
        totalVisitors: analyticsData.stats?.total || 0,
        totalSessions,
        avgThreatLevel: analyticsData.stats?.avgThreatLevel || 0,
        highThreatCount,
        totalConversations: conversations.length,
        activeConversations: conversations.length,
        totalMessages,
      })

      // Build recent activity from LIMITED data (last 10 sessions, 5 conversations)
      buildRecentActivity(
        recentSessions.slice(0, 10), 
        conversations.slice(0, 5)
      )

      // Calculate top countries from recent sessions only
      calculateTopCountries(recentSessions, todayTimestamp)
      
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setStats({
        totalVisitors: 0,
        totalSessions: 0,
        avgThreatLevel: 0,
        highThreatCount: 0,
        totalConversations: 0,
        activeConversations: 0,
        totalMessages: 0,
      })
    }
  }

  const buildRecentActivity = (sessions: any[], conversations: any[]) => {
    const activities: ActivityItem[] = []
    
    // Get recent sessions (last 10)
    const recentSessions = [...sessions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
    
    recentSessions.forEach(session => {
      const timeAgo = getTimeAgo(session.createdAt)
      const location = session.city || session.country || 'Unknown location'
      
      // High threat visitors
      if (session.threatLevel > 70) {
        activities.push({
          icon: '',
          text: `High-threat visitor from ${location}`,
          time: timeAgo
        })
      }
      // VPN/Tor users
      else if (session.isTor) {
        activities.push({
          icon: '',
          text: `Tor user detected from ${session.country || 'Unknown'}`,
          time: timeAgo
        })
      }
      else if (session.isVPN || session.isProxy) {
        activities.push({
          icon: '',
          text: `VPN user from ${location}`,
          time: timeAgo
        })
      }
      // Regular visitors
      else {
        activities.push({
          icon: '',
          text: `New visitor from ${location}`,
          time: timeAgo
        })
      }
    })

    // Get recent conversations
    const recentConvs = [...conversations]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3)
    
    recentConvs.forEach(conv => {
      activities.push({
        icon: '',
        text: `New chat: ${conv.title}`,
        time: getTimeAgo(conv.createdAt)
      })
    })

    // Sort all activities by time and take top 5
    activities.sort((a, b) => {
      const timeA = parseTimeAgo(a.time)
      const timeB = parseTimeAgo(b.time)
      return timeA - timeB
    })

    setRecentActivity(activities.slice(0, 5))
  }

  const calculateTopCountries = (sessions: any[], todayTimestamp: number) => {
    // Filter today's sessions
    const todaySessions = sessions.filter(s => s.createdAt >= todayTimestamp)
    
    if (todaySessions.length === 0) {
      // Use all sessions if no today data
      const allSessions = sessions.slice(0, 100) // Last 100 sessions
      calculateCountryStats(allSessions)
    } else {
      calculateCountryStats(todaySessions)
    }
  }

  const calculateCountryStats = (sessions: any[]) => {
    // Count by country
    const countryMap: Record<string, { count: number; code: string; name: string }> = {}
    
    sessions.forEach(session => {
      const country = session.country || 'Unknown'
      const code = session.countryCode || 'XX'
      
      if (!countryMap[country]) {
        countryMap[country] = { count: 0, code, name: country }
      }
      countryMap[country].count++
    })

    // Sort and get top 3
    const sorted = Object.values(countryMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    const total = sessions.length || 1
    const countryData: CountryData[] = sorted.map(item => ({
      code: item.code,
      flag: getFlagEmoji(item.code),
      name: item.name,
      count: item.count,
      percentage: Math.round((item.count / total) * 100)
    }))

    setTopCountries(countryData)
  }

  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode === 'XX') return ''
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'just now'
  }

  const parseTimeAgo = (timeStr: string): number => {
    if (timeStr === 'just now') return 0
    const match = timeStr.match(/(\d+)/)
    if (!match) return 0
    const num = parseInt(match[1])
    if (timeStr.includes('day')) return num * 86400000
    if (timeStr.includes('hour')) return num * 3600000
    if (timeStr.includes('minute')) return num * 60000
    return 0
  }

  const checkSystemStatus = async () => {
    const statuses: SystemStatus[] = []

    // Check Database
    try {
      const res = await fetch('/api/tracking/test-db', {
        method: 'GET',
        cache: 'no-store'
      })
      const data = await res.json()
      
      if (res.ok && data.success && data.database?.connected) {
        statuses.push({ 
          name: 'Database', 
          status: 'operational',
          message: 'Database connection healthy'
        })
      } else {
        statuses.push({ 
          name: 'Database', 
          status: 'degraded',
          message: data.error || 'Database check failed',
          details: data
        })
      }
    } catch (err: any) {
      console.error('Database check failed:', err)
      statuses.push({ 
        name: 'Database', 
        status: 'down',
        message: err.message || 'Cannot reach database',
        details: { error: err.toString() }
      })
    }

    // Check Tracking System
    try {
      const res = await fetch('/api/analytics', {
        method: 'GET',
        cache: 'no-store'
      })
      
      if (!res.ok) {
        // API returned error status - system is degraded
        const data = await res.json().catch(() => ({}))
        statuses.push({ 
          name: 'Tracking System', 
          status: 'degraded',
          message: `API returned ${res.status}: ${res.statusText}`,
          details: data
        })
      } else {
        // API returned 200 - check if response has valid structure
        const data = await res.json()
        const hasValidStructure = data && typeof data === 'object' && 'sessions' in data && 'stats' in data
        if (hasValidStructure) {
          statuses.push({
            name: 'Tracking System',
            status: 'operational',
            message: 'Tracking system operational'
          })
        } else {
          statuses.push({
            name: 'Tracking System',
            status: 'degraded',
            message: 'Invalid response structure from tracking API',
            details: data
          })
        }
      }
    } catch (err: any) {
      console.error('Tracking system check failed:', err)
      statuses.push({ 
        name: 'Tracking System', 
        status: 'down',
        message: err.message || 'Cannot reach tracking system',
        details: { error: err.toString() }
      })
    }

    // Check AI Agent (via health proxy)
    try {
      const res = await fetch('/api/health/agent', {
        method: 'GET',
        cache: 'no-store'
      })
      
      const data = await res.json()
      
      if (res.status === 503) {
        // Service unavailable - agent is down
        statuses.push({ 
          name: 'AI Agent', 
          status: 'down',
          message: data.message || 'AI Agent is unreachable',
          details: data
        })
      } else if (data.status === 'operational') {
        statuses.push({ 
          name: 'AI Agent', 
          status: 'operational',
          message: 'AI Agent responding normally',
          details: data.agentStatus
        })
      } else {
        statuses.push({ 
          name: 'AI Agent', 
          status: 'degraded',
          message: data.message || 'AI Agent responding with errors',
          details: data
        })
      }

      // Check Mem0 status from agent response
      const mem0Status = data?.agentStatus?.services?.mem0
      if (mem0Status) {
        if (mem0Status.status === 'operational') {
          statuses.push({
            name: 'Memory (Mem0)',
            status: 'operational',
            message: mem0Status.message || 'Mem0 is operational'
          })
        } else if (mem0Status.status === 'disabled') {
          statuses.push({
            name: 'Memory (Mem0)',
            status: 'degraded',
            message: mem0Status.message || 'Memory is disabled',
            details: mem0Status
          })
        } else if (mem0Status.status === 'failed') {
          statuses.push({
            name: 'Memory (Mem0)',
            status: 'down',
            message: mem0Status.message || 'Mem0 initialization failed',
            details: mem0Status
          })
        } else {
          statuses.push({
            name: 'Memory (Mem0)',
            status: 'degraded',
            message: mem0Status.message || 'Unknown mem0 status',
            details: mem0Status
          })
        }
      }
    } catch (err: any) {
      console.error('AI Agent check failed:', err?.name)
      statuses.push({ 
        name: 'AI Agent', 
        status: 'down',
        message: err.message || 'Cannot reach AI Agent',
        details: { error: err.toString() }
      })
      statuses.push({
        name: 'Memory (Mem0)',
        status: 'down',
        message: 'Cannot check Mem0 status (agent unreachable)',
        details: { error: 'Agent unreachable' }
      })
    }

    // Check Conversations API
    try {
      const res = await fetch('/api/conversations', {
        method: 'GET',
        cache: 'no-store'
      })
      const data = await res.json()
      if (res.ok && data) {
        statuses.push({
          name: 'Conversations API',
          status: 'operational',
          message: 'Conversations API responding normally'
        })
      } else {
        statuses.push({
          name: 'Conversations API',
          status: 'degraded',
          message: `API returned ${res.status}: ${res.statusText}`,
          details: data
        })
      }
    } catch (err: any) {
      console.error('Conversations API check failed:', err)
      statuses.push({ 
        name: 'Conversations API', 
        status: 'down',
        message: err.message || 'Cannot reach Conversations API',
        details: { error: err.toString() }
      })
    }

    // Check Profiles API
    try {
      const res = await fetch('/api/profiles', {
        method: 'GET',
        cache: 'no-store'
      })
      const data = await res.json()
      if (res.ok && data) {
        statuses.push({
          name: 'Profiles API',
          status: 'operational',
          message: 'Profiles API responding normally'
        })
      } else {
        statuses.push({
          name: 'Profiles API',
          status: 'degraded',
          message: `API returned ${res.status}: ${res.statusText}`,
          details: data
        })
      }
    } catch (err: any) {
      console.error('Profiles API check failed:', err)
      statuses.push({ 
        name: 'Profiles API', 
        status: 'down',
        message: err.message || 'Cannot reach Profiles API',
        details: { error: err.toString() }
      })
    }

    // Check Chat API (test with a simple message)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'health check' }] }),
        cache: 'no-store'
      })
      const data = await res.json()
      if (res.ok && data.message) {
        statuses.push({
          name: 'Chat API',
          status: 'operational',
          message: 'Chat API responding normally'
        })
      } else {
        statuses.push({
          name: 'Chat API',
          status: 'degraded',
          message: `API returned ${res.status}: ${res.statusText}`,
          details: data
        })
      }
    } catch (err: any) {
      console.error('Chat API check failed:', err)
      statuses.push({ 
        name: 'Chat API', 
        status: 'down',
        message: err.message || 'Cannot reach Chat API',
        details: { error: err.toString() }
      })
    }

    // Check Overall System Health
    try {
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store'
      })
      const data = await res.json()
      
      if (data.maintenance) {
        statuses.push({ 
          name: 'System Health', 
          status: 'degraded',
          message: data.message || 'System is under maintenance',
          details: data
        })
      } else if (data.status === 'ok') {
        statuses.push({ 
          name: 'System Health', 
          status: 'operational',
          message: data.message || 'All systems operational'
        })
      } else {
        statuses.push({ 
          name: 'System Health', 
          status: data.status === 'down' ? 'down' : 'degraded',
          message: data.message || 'System experiencing issues',
          details: data
        })
      }
    } catch (err: any) {
      console.error('System health check failed:', err)
      statuses.push({ 
        name: 'System Health', 
        status: 'down',
        message: err.message || 'Cannot reach health endpoint',
        details: { error: err.toString() }
      })
    }

    setSystemStatus(statuses)
  }

  return (
    <ChatProvider>
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-light text-charcoal">Welcome back, Bill</h1>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-taupe font-light tracking-wide">Total Visitors</p>
              <p className="text-3xl font-light text-charcoal mt-2">
                {stats?.totalVisitors.toLocaleString() || '...'}
              </p>
              <p className="text-sm text-taupe font-light mt-1">
                {(stats?.totalSessions || 0).toLocaleString()} sessions
              </p>
            </div>
          </div>
        </div>

        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-taupe font-light tracking-wide">Conversations</p>
              <p className="text-3xl font-light text-charcoal mt-2">
                {stats?.totalConversations || '...'}
              </p>
              <p className="text-sm text-taupe font-light mt-1">
                {stats?.totalMessages || 0} messages
              </p>
            </div>
          </div>
        </div>

        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-taupe font-light tracking-wide">Avg Threat Level</p>
              <p className="text-3xl font-light text-charcoal mt-2">
                {stats?.avgThreatLevel.toFixed(1) || '...'}
              </p>
              <p className="text-sm text-taupe font-light mt-1">
                {stats?.highThreatCount || 0} high threats
              </p>
            </div>
          </div>
        </div>

        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-taupe font-light tracking-wide">Quick Actions</p>
              <div className="mt-3 space-y-2">
                <Link
                  href="/analytics"
                  className="block text-sm text-taupe hover:text-warm-gold transition-colors font-light"
                >
                  View Analytics →
                </Link>
                <Link
                  href="/chats"
                  className="block text-sm text-taupe hover:text-warm-gold transition-colors font-light"
                >
                  Manage Chats →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <h3 className="text-base font-medium text-charcoal mb-4 tracking-wide">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="flex-1">
                    <p className="text-sm font-light text-charcoal">{activity.text}</p>
                    <p className="text-xs text-taupe font-light">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-taupe text-center py-4 font-light">No recent activity</p>
          )}
          <Link
            href="/analytics"
            className="block mt-4 text-sm text-taupe hover:text-warm-gold transition-colors font-light"
          >
            View all activity →
          </Link>
        </div>

        {/* Top Countries */}
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <h3 className="text-base font-medium text-charcoal mb-4 tracking-wide">Top Countries</h3>
          {topCountries.length > 0 ? (
            <div className="space-y-3">
              {topCountries.map((country, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-charcoal font-light">{country.name}</span>
                  </div>
                  <span className="text-sm font-medium text-charcoal">
                    {country.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-taupe text-center py-4 font-light">No visitor data yet</p>
          )}
        </div>

        {/* System Status */}
        <div className="bg-warm-white rounded-lg border border-warm-cream p-6 transition-all hover:border-warm-gold">
          <h3 className="text-base font-medium text-charcoal mb-4 tracking-wide">System Status</h3>
          {systemStatus.length > 0 ? (
            <div className="space-y-2">
              {systemStatus.map((system, idx) => (
                <button
                  key={idx}
                  onClick={() => system.status !== 'operational' && setSelectedSystem(system)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    system.status !== 'operational' 
                      ? 'hover:bg-warm-cream/50 cursor-pointer' 
                      : 'cursor-default'
                  }`}
                  disabled={system.status === 'operational'}
                >
                  <span className="text-sm text-charcoal font-light">{system.name}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-light whitespace-nowrap ${
                    system.status === 'operational'
                      ? 'bg-green-100 text-green-700'
                      : system.status === 'degraded'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {system.status === 'operational' ? 'Operational' : 
                     system.status === 'degraded' ? 'Degraded' : 
                     'Down'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-taupe text-center py-4 font-light">Checking status...</p>
          )}
          <p className="text-xs text-taupe mt-3 font-light">Click on degraded/down systems for details</p>
        </div>
      </div>

      {/* Chat Component */}
      <Chat />
      <ConversationSidebar />

      {/* System Status Details Modal */}
      {selectedSystem && (
        <div 
          className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSystem(null)}
        >
          <div 
            className="bg-warm-white rounded-lg border border-warm-cream max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-warm-white border-b border-warm-cream p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-light text-charcoal">{selectedSystem.name}</h2>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-light ${
                    selectedSystem.status === 'operational'
                      ? 'bg-green-100 text-green-700'
                      : selectedSystem.status === 'degraded'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedSystem.status === 'operational' ? 'Operational' :
                     selectedSystem.status === 'degraded' ? 'Degraded' : 'Down'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSystem(null)}
                  className="text-taupe hover:text-charcoal transition-colors p-2"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Message */}
              {selectedSystem.message && (
                <div>
                  <h3 className="text-sm font-medium text-charcoal mb-2 tracking-wide">
                    {selectedSystem.status === 'operational' ? 'Status' : 'Error Message'}
                  </h3>
                  <div className="bg-warm-cream rounded-lg p-4">
                    <p className="text-sm text-charcoal font-light">{selectedSystem.message}</p>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {selectedSystem.details && (
                <div>
                  <h3 className="text-sm font-medium text-charcoal mb-2 tracking-wide">
                    {selectedSystem.status === 'operational' ? 'System Metrics' : 'Technical Details'}
                  </h3>
                  <div className="bg-warm-cream rounded-lg p-4 overflow-auto">
                    <pre className="text-xs text-charcoal font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedSystem.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Suggested Actions - Only show for degraded/down systems */}
              {selectedSystem.status !== 'operational' && (
              <div>
                <h3 className="text-sm font-medium text-charcoal mb-2 tracking-wide">Suggested Actions</h3>
                <ul className="space-y-2 text-sm text-taupe font-light">
                  {selectedSystem.name === 'Memory (Mem0)' && (
                    <>
                      <li>• Verify mem0ai is installed (pip install mem0ai)</li>
                      <li>• Check MEMORY_ENABLED environment variable (should be true)</li>
                      <li>• Verify OPENAI_API_KEY is set (mem0 uses it for embeddings)</li>
                      <li>• Check ~/.mem0/ directory exists and is writable</li>
                      <li>• Review agent logs for mem0 initialization errors</li>
                    </>
                  )}
                  {selectedSystem.name === 'Database' && (
                    <>
                      <li>• Check database connection string in environment variables</li>
                      <li>• Verify PostgreSQL service is running</li>
                      <li>• Check database credentials and permissions</li>
                    </>
                  )}
                  {selectedSystem.name === 'AI Agent' && (
                    <>
                      <li>• Verify Python agent is running on port 8000</li>
                      <li>• Check AGENT_API_URL environment variable</li>
                      <li>• Review agent logs for errors</li>
                    </>
                  )}
                  {selectedSystem.name === 'Tracking System' && (
                    <>
                      <li>• Check database connectivity</li>
                      <li>• Verify tracking tables exist and have correct schema</li>
                      <li>• Review API logs for errors</li>
                    </>
                  )}
                  {!['Memory (Mem0)', 'Database', 'AI Agent', 'Tracking System'].includes(selectedSystem.name) && (
                    <>
                      <li>• Check API endpoint is responding</li>
                      <li>• Review server logs for errors</li>
                      <li>• Verify dependencies are running</li>
                    </>
                  )}
                  <li>• Refresh the page to re-check status</li>
                </ul>
              </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedSystem(null)
                    checkSystemStatus()
                  }}
                  className="px-4 py-2 bg-warm-gold text-warm-white rounded-lg hover:bg-warm-gold/90 transition-colors font-light"
                >
                  Recheck Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ChatProvider>
  )
}
