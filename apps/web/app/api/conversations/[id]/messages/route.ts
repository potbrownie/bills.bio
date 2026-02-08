import { NextRequest, NextResponse } from 'next/server'
import { getConversation, addMessage } from '@/lib/db/store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const conv = await getConversation(id)
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ messages: conv.messages })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const conv = await getConversation(id)
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const body = await request.json().catch(() => ({}))
  const role = body.role as 'user' | 'assistant'
  const content = (body.content as string) ?? ''
  const sources = body.sources as string[] | undefined
  if (role !== 'user' && role !== 'assistant') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  
  await addMessage(id, {
    role,
    content,
    timestamp: Date.now(),
    sources
  })
  
  return NextResponse.json({ success: true })
}
