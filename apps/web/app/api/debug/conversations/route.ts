import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/debug/conversations - Check conversation-profile links
export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.title,
        c.profile_id,
        p.name as profile_name,
        p.status as profile_status
      FROM conversations c
      LEFT JOIN profiles p ON p.id = c.profile_id
      ORDER BY c.created_at DESC
      LIMIT 10
    `)

    return NextResponse.json({
      conversations: result.rows,
      summary: {
        total: result.rows.length,
        with_profile: result.rows.filter(r => r.profile_id).length,
        without_profile: result.rows.filter(r => !r.profile_id).length
      }
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Failed to debug conversations' },
      { status: 500 }
    )
  }
}
