import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const client = await db.getClient()

    try {
      // Reset settings to defaults
      const result = await client.query(
        `UPDATE profiles
         SET data = jsonb_set(
           COALESCE(data, '{}'::jsonb),
           '{settings}',
           $1::jsonb
         ),
         updated_at = NOW()
         WHERE type = 'owner'
         RETURNING data`,
        [JSON.stringify({
          agent_enabled: true,
          analytics_enabled: true,
          email_notifications: false,
        })]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Reset settings error:', error)
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    )
  }
}
