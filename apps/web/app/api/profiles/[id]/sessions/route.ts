import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profiles/[id]/sessions - Get sessions for profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.query(`
      SELECT 
        id,
        session_id,
        data,
        created_at,
        last_seen
      FROM sessions
      WHERE profile_id = $1
      ORDER BY last_seen DESC
      LIMIT 10
    `, [id])

    return NextResponse.json({
      profileId: id,
      sessions: result.rows
    })
  } catch (error) {
    console.error('Error fetching profile sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
