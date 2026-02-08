import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/blog/[id]/view - Track blog post view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { sessionId, visitorId } = body

    // Update blog post data with view count
    await db.query(
      `UPDATE blog_posts 
       SET data = jsonb_set(
         COALESCE(data, '{}'::jsonb),
         '{views}',
         COALESCE((data->>'views')::int, 0)::text::jsonb + 1,
         true
       )
       WHERE id = $1`,
      [id]
    )

    // Track the pageview in the sessions table if we have session data
    if (sessionId) {
      await db.query(
        `UPDATE sessions
         SET data = jsonb_set(
           data,
           '{page_views}',
           COALESCE(data->'page_views', '[]'::jsonb) || $1::jsonb,
           true
         )
         WHERE session_id = $2`,
        [
          JSON.stringify({
            url: `/blog/${id}`,
            timestamp: new Date().toISOString(),
            type: 'blog_post'
          }),
          sessionId
        ]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking blog view:', error)
    return NextResponse.json(
      { error: 'Failed to track blog view' },
      { status: 500 }
    )
  }
}
