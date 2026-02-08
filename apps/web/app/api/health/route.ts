import { NextRequest, NextResponse } from 'next/server'

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000'
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true'

/**
 * General health check for the chat system
 * GET /api/health
 * 
 * Returns:
 * - status: 'ok' | 'degraded' | 'down'
 * - maintenance: boolean
 */
export async function GET(request: NextRequest) {
  // Check if maintenance mode is enabled
  if (MAINTENANCE_MODE) {
    return NextResponse.json({
      status: 'ok',
      maintenance: true,
      message: 'System is under maintenance'
    })
  }

  try {
    // Check agent health
    const response = await fetch(`${AGENT_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })

    if (!response.ok) {
      return NextResponse.json({
        status: 'degraded',
        maintenance: false,
        message: 'Agent is experiencing issues'
      })
    }

    return NextResponse.json({
      status: 'ok',
      maintenance: false,
      message: 'All systems operational'
    })
    
  } catch (error: any) {
    console.error('Health check failed:', error.message)
    
    return NextResponse.json({
      status: 'down',
      maintenance: false,
      message: 'Cannot reach backend services'
    }, { status: 503 })
  }
}
