import { NextRequest, NextResponse } from 'next/server'
import { saveUserInteraction } from '@/lib/tracking/store'
import { UserInteraction } from '@/lib/tracking/schema'

/**
 * API endpoint to track user interactions
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const interaction: UserInteraction = {
      id: crypto.randomUUID(),
      sessionId: data.sessionId,
      visitorId: data.visitorId || data.sessionId,
      type: data.type,
      element: data.element || data.target || '',
      elementId: data.elementId || '',
      elementClass: data.elementClass || '',
      elementText: data.elementText || data.value || '',
      position: data.position || { x: 0, y: 0 },
      timestamp: data.timestamp || Date.now(),
    }
    
    await saveUserInteraction(interaction)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Interaction API error:', error)
    return NextResponse.json(
      { error: 'Failed to save interaction' },
      { status: 500 }
    )
  }
}
