import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profiles/[id]/conversations - Get conversations for a profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const result = await db.query(`
      SELECT 
        c.id,
        c.title,
        EXTRACT(EPOCH FROM c.created_at) * 1000 as "createdAt",
        EXTRACT(EPOCH FROM c.updated_at) * 1000 as "updatedAt",
        COUNT(m.id) as "messageCount"
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.profile_id = $1
      GROUP BY c.id, c.title, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
    `, [id])

    return NextResponse.json({
      conversations: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        createdAt: Number(row.createdAt),
        updatedAt: Number(row.updatedAt),
        messageCount: Number(row.messageCount)
      }))
    })
  } catch (error) {
    console.error('Error fetching profile conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
