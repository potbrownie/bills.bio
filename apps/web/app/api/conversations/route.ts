import { NextRequest, NextResponse } from 'next/server'
import { getConversations, createConversation } from '@/lib/db/store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const includeMessages = searchParams.get('includeMessages') !== 'false'
    
    const conversations = await getConversations({ limit, includeMessages })
    return NextResponse.json({ conversations })
  } catch (e) {
    console.error('List conversations error:', e)
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const title = (body.title as string) || 'New chat'
    let profileId = body.profileId as string | undefined
    const sessionId = body.sessionId as string | undefined
    
    // If no profileId but sessionId provided, look up profile from tracking session
    if (!profileId && sessionId) {
      const { db } = await import('@/lib/db')
      const result = await db.query(
        'SELECT profile_id FROM sessions WHERE session_id = $1 LIMIT 1',
        [sessionId]
      )
      if (result.rows.length > 0) {
        profileId = result.rows[0].profile_id
        console.log('[CONVERSATIONS] Linked conversation to profile:', profileId, 'from session:', sessionId)
      }
    }
    
    const conversationId = await createConversation(title, profileId)
    return NextResponse.json({ id: conversationId })
  } catch (e) {
    console.error('Create conversation error:', e)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
