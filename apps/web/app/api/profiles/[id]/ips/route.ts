import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profiles/[id]/ips - Get IP history for profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.query(`
      SELECT DISTINCT ON (data->>'ip')
        data->>'ip' as ip,
        data->'location' as location,
        created_at as first_seen,
        last_seen
      FROM sessions
      WHERE profile_id = $1
        AND data->>'ip' IS NOT NULL
      ORDER BY data->>'ip', last_seen DESC
      LIMIT 20
    `, [id])

    return NextResponse.json({
      profileId: id,
      ips: result.rows
    })
  } catch (error) {
    console.error('Error fetching profile IPs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile IPs' },
      { status: 500 }
    )
  }
}
