import { NextRequest, NextResponse } from 'next/server'

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000'

/**
 * Health check proxy for the Python AI agent
 * GET /api/health/agent
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${AGENT_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })

    if (!response.ok) {
      return NextResponse.json(
        { status: 'degraded', message: 'Agent responded but with error' },
        { status: 200 } // Return 200 to indicate API is reachable
      )
    }

    const data = await response.json()
    return NextResponse.json({ 
      status: 'operational',
      agentStatus: data 
    })
    
  } catch (error: any) {
    console.error('Agent health check failed:', error.message)
    
    return NextResponse.json(
      { 
        status: 'down', 
        message: 'Cannot reach agent',
        error: error.message 
      },
      { status: 503 }
    )
  }
}
