import { NextRequest, NextResponse } from 'next/server'
import { savePageView } from '@/lib/tracking/store'
import { PageView } from '@/lib/tracking/schema'

/**
 * API endpoint to track page views
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const pageView: PageView = {
      id: crypto.randomUUID(),
      sessionId: data.sessionId,
      visitorId: data.visitorId || data.sessionId,
      url: data.url || '',
      path: data.path,
      queryParams: data.queryParams || {},
      title: data.title || '',
      referrer: data.referrer || '',
      loadTime: data.loadTime || 0,
      domContentLoaded: data.domContentLoaded || 0,
      firstContentfulPaint: data.firstContentfulPaint || 0,
      timeToInteractive: data.timeToInteractive || 0,
      viewportWidth: data.viewportWidth || 0,
      viewportHeight: data.viewportHeight || 0,
      scrollDepth: data.scrollDepth || 0,
      timestamp: data.timestamp || Date.now(),
    }
    
    await savePageView(pageView)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Page view tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to save page view' },
      { status: 500 }
    )
  }
}
