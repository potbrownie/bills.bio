import { NextRequest, NextResponse } from 'next/server'
import {
  getConversation,
  updateConversationTitle,
  deleteConversation,
} from '@/lib/db/store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const conv = await getConversation(id)
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(conv)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const conv = await getConversation(id)
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const body = await request.json().catch(() => ({}))
  const title = body.title as string | undefined
  if (typeof title === 'string') {
    await updateConversationTitle(id, title)
  }
  const updated = await getConversation(id)
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const conv = await getConversation(id)
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await deleteConversation(id)
  return new NextResponse(null, { status: 204 })
}
