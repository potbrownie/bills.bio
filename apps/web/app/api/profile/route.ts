import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const client = await db.getClient()

    try {
      // Get the owner profile
      const result = await client.query(
        `SELECT 
          id,
          name,
          email,
          data
        FROM profiles
        WHERE type = 'owner'
        LIMIT 1`
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Owner profile not found' },
          { status: 404 }
        )
      }

      const profile = result.rows[0]
      const data = profile.data || {}

      // Handle location as object or string
      let locationString = ''
      if (typeof data.location === 'object' && data.location !== null) {
        const loc = data.location as any
        locationString = [loc.city, loc.country].filter(Boolean).join(', ')
      } else if (typeof data.location === 'string') {
        locationString = data.location
      }

      return NextResponse.json({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        bio: data.bio || '',
        location: locationString,
        website: data.website || '',
        twitter: data.twitter || '',
        linkedin: data.linkedin || '',
        github: data.github || '',
        company: data.company || '',
        job_title: data.job_title || '',
        phone: data.phone || '',
        interests: data.interests || [],
        expertise: data.expertise || [],
        values: data.values || [],
        projects: data.projects || [],
        response_style: data.response_style || {},
        communication_preferences: data.communication_preferences || {},
        knowledge_base: data.knowledge_base || {},
        // Include raw data for debugging if needed
        raw_data: data,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, email, bio, location, website, twitter, linkedin, github, company, job_title, phone,
      interests, expertise, values, projects,
      response_style, communication_preferences, knowledge_base
    } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const client = await db.getClient()

    try {
      // Build the complete data object
      const updatedData = {
        bio: bio || '',
        location: location || '',
        website: website || '',
        twitter: twitter || '',
        linkedin: linkedin || '',
        github: github || '',
        company: company || '',
        job_title: job_title || '',
        phone: phone || '',
        interests: interests || [],
        expertise: expertise || [],
        values: values || [],
        projects: projects || [],
        response_style: response_style || {},
        communication_preferences: communication_preferences || {},
        knowledge_base: knowledge_base || {},
      }

      // Update the owner profile
      const result = await client.query(
        `UPDATE profiles
         SET 
           name = $1,
           email = $2,
           data = $3::jsonb,
           updated_at = NOW()
         WHERE type = 'owner'
         RETURNING id, name, email, data`,
        [
          name.trim(),
          email.trim(),
          JSON.stringify(updatedData),
        ]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Owner profile not found' },
          { status: 404 }
        )
      }

      const profile = result.rows[0]
      const data = profile.data || {}

      // Handle location as object or string for response
      let locationString = ''
      if (typeof data.location === 'object' && data.location !== null) {
        const loc = data.location as any
        locationString = [loc.city, loc.country].filter(Boolean).join(', ')
      } else if (typeof data.location === 'string') {
        locationString = data.location
      }

      return NextResponse.json({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        bio: data.bio || '',
        location: locationString,
        website: data.website || '',
        twitter: data.twitter || '',
        linkedin: data.linkedin || '',
        github: data.github || '',
        company: data.company || '',
        job_title: data.job_title || '',
        phone: data.phone || '',
        interests: data.interests || [],
        expertise: data.expertise || [],
        values: data.values || [],
        projects: data.projects || [],
        response_style: data.response_style || {},
        communication_preferences: data.communication_preferences || {},
        knowledge_base: data.knowledge_base || {},
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
