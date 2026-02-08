import { NextRequest, NextResponse } from 'next/server'

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000'

/**
 * Proxy POST /api/chat/stream to the Python agent's /chat/stream.
 * Streams SSE events (status, message_delta, done) to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const res = await fetch(`${AGENT_API_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: text || 'Agent stream failed' },
        { status: res.status }
      )
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('Chat stream proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to the agent. Is it running?' },
      { status: 502 }
    )
  }
}
