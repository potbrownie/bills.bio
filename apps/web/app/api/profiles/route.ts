import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/profiles - List profiles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'owner' | 'visitor'
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = 'SELECT * FROM profiles WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (type) {
      query += ` AND type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)')
    const countResult = await db.query(countQuery, params)
    const total = parseInt(countResult.rows[0].count)

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await db.query(query, params)

    return NextResponse.json({
      profiles: result.rows,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}

// POST /api/profiles - Create new profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type = 'visitor', name, email, data = {} } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const result = await db.query(
      `INSERT INTO profiles (type, name, email, data, last_seen)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [type, name, email, JSON.stringify(data)]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error creating profile:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Profile with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}
