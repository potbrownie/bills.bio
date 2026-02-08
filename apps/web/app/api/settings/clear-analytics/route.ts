import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const client = await db.getClient()

    try {
      // Clear sessions data (keep sessions but clear tracking data)
      await client.query(
        `UPDATE sessions
         SET data = jsonb_set(
           data,
           '{page_views}',
           '[]'::jsonb
         )
         WHERE data IS NOT NULL`
      )

      await client.query(
        `UPDATE sessions
         SET data = jsonb_set(
           data,
           '{interactions}',
           '[]'::jsonb
         )
         WHERE data IS NOT NULL`
      )

      return NextResponse.json({ success: true })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Clear analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to clear analytics' },
      { status: 500 }
    )
  }
}
