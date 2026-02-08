import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profiles/owner - Get Bill's profile
export async function GET() {
  try {
    const result = await db.query(
      `SELECT * FROM profiles WHERE type = 'owner' LIMIT 1`
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Owner profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching owner profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch owner profile' },
      { status: 500 }
    )
  }
}
