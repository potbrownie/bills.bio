import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const client = await db.getClient()

    try {
      // Get the owner profile settings
      const result = await client.query(
        `SELECT data FROM profiles WHERE type = 'owner' LIMIT 1`
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }

      const data = result.rows[0].data || {}
      const settings = data.settings || {}

      return NextResponse.json({
        agent_enabled: settings.agent_enabled !== false,
        analytics_enabled: settings.analytics_enabled !== false,
        email_notifications: settings.email_notifications === true,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent_enabled, analytics_enabled, email_notifications } = body

    const client = await db.getClient()

    try {
      // Update settings in the data JSONB field
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
          agent_enabled,
          analytics_enabled,
          email_notifications,
        })]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }

      const data = result.rows[0].data || {}
      const settings = data.settings || {}

      return NextResponse.json({
        agent_enabled: settings.agent_enabled,
        analytics_enabled: settings.analytics_enabled,
        email_notifications: settings.email_notifications,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
