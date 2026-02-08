import { NextRequest, NextResponse } from 'next/server'

/**
 * API endpoint to receive client-side fingerprint data
 * This is a no-op in the 6-table architecture - fingerprint is saved with session
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, fingerprint } = await request.json()
    
    if (!sessionId || !fingerprint) {
      return NextResponse.json(
        { error: 'Missing sessionId or fingerprint' },
        { status: 400 }
      )
    }
    
    // In 6-table architecture, fingerprint is part of session data
    // and is saved via /api/tracking/session
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fingerprint tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to save fingerprint' },
      { status: 500 }
    )
  }
}
