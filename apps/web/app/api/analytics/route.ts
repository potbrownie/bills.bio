import { NextRequest, NextResponse } from 'next/server'
import { queryAnalytics, getAnalyticsSummary } from '@/lib/tracking/store'

/**
 * API endpoint to query analytics data
 * GET /api/analytics?startDate=2026-01-01&country=US
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Add limit parameter with default of 100 for dashboard (was 1000)
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100'),
      1000 // Max 1000 even if requested
    )
    
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      country: searchParams.get('country') || undefined,
      threatLevel: searchParams.get('threatLevel') ? parseInt(searchParams.get('threatLevel')!) : undefined,
      sessionId: searchParams.get('sessionId') || undefined,
      limit
    }
    
    const sessions = await queryAnalytics(filters)
    const summary = await getAnalyticsSummary()
    
    // Generate statistics from sessions (memory efficient - single pass)
    const stats = {
      total: summary.uniqueVisitors || 0, // Use unique visitors from summary
      totalSessions: sessions.length, // Keep session count for reference
      byCountry: {} as Record<string, number>,
      byCity: {} as Record<string, number>,
      byBrowser: {} as Record<string, number>,
      byDevice: {} as Record<string, number>,
      byOS: {} as Record<string, number>,
      avgThreatLevel: 0,
      proxyCount: 0,
      vpnCount: 0,
      torCount: 0,
      datacenterCount: 0,
      botCount: 0,
    }
    
    // Single pass through sessions for all stats
    let threatSum = 0
    for (const s of sessions) {
      stats.byCountry[s.country] = (stats.byCountry[s.country] || 0) + 1
      stats.byCity[s.city] = (stats.byCity[s.city] || 0) + 1
      stats.byBrowser[s.browser] = (stats.byBrowser[s.browser] || 0) + 1
      stats.byDevice[s.deviceType] = (stats.byDevice[s.deviceType] || 0) + 1
      stats.byOS[s.os] = (stats.byOS[s.os] || 0) + 1
      threatSum += s.threatLevel
      if (s.isProxy) stats.proxyCount++
      if (s.isVPN) stats.vpnCount++
      if (s.isTor) stats.torCount++
      if (s.isDataCenter) stats.datacenterCount++
    }
    stats.avgThreatLevel = sessions.length > 0 ? threatSum / sessions.length : 0
    
    return NextResponse.json({
      sessions,
      stats,
      summary
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
