// Storage layer for tracking data - 6-table PostgreSQL schema

import { db } from '@/lib/db'
import { 
  VisitorSession, 
  PageView, 
  UserInteraction, 
  SecurityEvent
} from './schema'

/**
 * Public API: Save session
 */
export async function saveSession(session: VisitorSession) {
  console.log('[STORE] saveSession called for session:', session.sessionId)
  
  try {
    // Check database connection
    console.log('[STORE] Checking database connection...')
    try {
      await db.query('SELECT 1')
      console.log('[STORE] Database connection OK')
    } catch (connError: any) {
      console.error('[STORE] Database connection failed:', connError.message)
      throw new Error(`Database connection failed: ${connError.message}`)
    }
    
    // Check if session already exists and get profile_id
    console.log('[STORE] Checking for existing session...')
    let profileId: string | null = null
    const existingSession = await db.query(
      'SELECT profile_id FROM sessions WHERE session_id = $1',
      [session.sessionId]
    )
    
    if (existingSession.rows.length > 0) {
      profileId = existingSession.rows[0].profile_id
      console.log('[STORE] Existing session found with profile_id:', profileId)
    } else {
      // Try to find existing profile by canvas fingerprint (deduplication)
      if (session.canvasFingerprint) {
        console.log('[STORE] Checking for existing profile by canvas fingerprint:', session.canvasFingerprint.substring(0, 20) + '...')
        const matchingProfile = await db.query(`
          SELECT s.profile_id 
          FROM sessions s
          JOIN profiles p ON p.id = s.profile_id
          WHERE s.data->'client'->>'canvasFingerprint' = $1
            AND p.type = 'visitor'
            AND p.status = 'anonymous'
          ORDER BY s.last_seen DESC
          LIMIT 1
        `, [session.canvasFingerprint])
        
        if (matchingProfile.rows.length > 0) {
          profileId = matchingProfile.rows[0].profile_id
          console.log('[STORE] ✅ Found existing profile by fingerprint:', profileId)
        } else {
          console.log('[STORE] ❌ No existing profile found with this fingerprint')
        }
      } else {
        console.log('[STORE] ⚠️  No canvasFingerprint provided - cannot deduplicate')
      }
      
      // Create new anonymous visitor profile if no match found
      if (!profileId) {
        console.log('[STORE] Creating new anonymous visitor profile...')
        const profileResult = await db.query(`
          INSERT INTO profiles (type, status, name, data, created_at, updated_at, last_seen)
          VALUES ('visitor', 'anonymous', 'Anonymous', '{}', NOW(), NOW(), NOW())
          RETURNING id
        `)
        profileId = profileResult.rows[0].id
        console.log('[STORE] Created new profile_id:', profileId)
      }
    }
    
    // Build JSONB data object with all tracking information
    console.log('[STORE] Building JSONB data object...')
    const data = {
      ip: session.ip,
      ip_type: session.ipType,
      user_agent: session.userAgent,
      fingerprint: session.canvasFingerprint || session.audioFingerprint || '',
      location: {
        country: session.country,
        countryCode: session.countryCode,
        city: session.city,
        region: session.region,
        timezone: session.timezone,
        latitude: session.latitude,
        longitude: session.longitude,
        postalCode: session.postalCode,
        asn: session.asn,
        asnOrg: session.asnOrg,
        isp: session.isp
      },
      device: {
        deviceType: session.deviceType,
        browser: session.browser,
        browserVersion: session.browserVersion,
        os: session.os,
        osVersion: session.osVersion,
        device: session.device,
        deviceVendor: session.deviceVendor,
        screenResolution: session.screenResolution,
        colorDepth: session.colorDepth,
        platform: session.platform
      },
      network: {
        connectionType: session.connectionType,
        effectiveType: session.effectiveType,
        downlink: session.downlink,
        rtt: session.rtt
      },
      security: {
        threatLevel: session.threatLevel,
        isProxy: session.isProxy,
        isVPN: session.isVPN,
        isTor: session.isTor,
        isDataCenter: session.isDataCenter,
        doNotTrack: session.doNotTrack
      },
      referrer: {
        url: session.referrer,
        domain: session.referrerDomain,
        path: session.referrerPath
      },
      utm: {
        source: session.utmSource,
        medium: session.utmMedium,
        campaign: session.utmCampaign,
        term: session.utmTerm,
        content: session.utmContent
      },
      entry: {
        landingPage: session.landingPage,
        entryUrl: session.entryUrl
      },
      client: {
        languages: session.languages,
        timezone: session.timezone_client,
        cookiesEnabled: session.cookiesEnabled,
        webglVendor: session.webglVendor,
        webglRenderer: session.webglRenderer,
        canvasFingerprint: session.canvasFingerprint,
        audioFingerprint: session.audioFingerprint,
        fontsFingerprint: session.fontsFingerprint
      },
      page_views: [],
      interactions: []
    }

    console.log('[STORE] Data object built, executing SQL query...')
    console.log('[STORE] Session ID:', session.sessionId)
    console.log('[STORE] Data size:', JSON.stringify(data).length, 'bytes')
    
    // Upsert session - matching actual schema (only session_id, profile_id, data, created_at, last_seen)
    try {
      const result = await db.query(`
        INSERT INTO sessions (
          session_id, profile_id, data, created_at, last_seen
        ) VALUES (
          $1, $2, $3, NOW(), NOW()
        )
        ON CONFLICT (session_id) DO UPDATE SET
          data = EXCLUDED.data,
          last_seen = NOW()
        RETURNING id
      `, [
        session.sessionId,
        profileId, // Use the created or existing profile_id
        JSON.stringify(data)
      ])
      
      console.log('[STORE] SQL query executed successfully, affected rows:', result.rowCount)
      console.log('[STORE] Returned ID:', result.rows[0]?.id)
    } catch (dbError: any) {
      console.error('[STORE] SQL Error:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        table: dbError.table,
        constraint: dbError.constraint
      })
      throw dbError
    }
  } catch (error: any) {
    console.error('[STORE] Error in saveSession:', {
      message: error.message,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Public API: Save page view
 */
export async function savePageView(pageView: PageView) {
  try {
    // Append to session's page_views array in JSONB
    const pageViewData = {
      path: pageView.path,
      referrer: pageView.referrer,
      timestamp: pageView.timestamp
    }

    await db.query(`
      UPDATE sessions
      SET data = jsonb_set(
        data,
        '{page_views}',
        COALESCE(data->'page_views', '[]'::jsonb) || $2::jsonb
      )
      WHERE session_id = $1
    `, [
      pageView.sessionId,
      JSON.stringify(pageViewData)
    ])
  } catch (error) {
    console.error('Error saving page view:', error)
    throw error
  }
}

/**
 * Public API: Save user interaction
 */
export async function saveUserInteraction(interaction: UserInteraction) {
  try {
    // Append to session's interactions array in JSONB
    const interactionData = {
      type: interaction.type,
      element: interaction.element,
      elementText: interaction.elementText,
      timestamp: interaction.timestamp
    }

    await db.query(`
      UPDATE sessions
      SET data = jsonb_set(
        data,
        '{interactions}',
        COALESCE(data->'interactions', '[]'::jsonb) || $2::jsonb
      )
      WHERE session_id = $1
    `, [
      interaction.sessionId,
      JSON.stringify(interactionData)
    ])
  } catch (error) {
    console.error('Error saving interaction:', error)
    throw error
  }
}

/**
 * Public API: Save security event
 */
export async function saveSecurityEvent(event: SecurityEvent) {
  try {
    // Append to session's security_events array in JSONB
    const eventData = {
      type: event.type,
      severity: event.severity,
      details: event.details,
      action: event.action,
      timestamp: event.timestamp
    }

    await db.query(`
      UPDATE sessions
      SET data = jsonb_set(
        data,
        '{security_events}',
        COALESCE(data->'security_events', '[]'::jsonb) || $2::jsonb
      )
      WHERE session_id = $1
    `, [
      event.sessionId,
      JSON.stringify(eventData)
    ])
  } catch (error) {
    console.error('Error saving security event:', error)
    throw error
  }
}

/**
 * No-op: Conversations are stored in separate conversations table
 */
export async function saveConversationTracking() {
  // No-op - conversations are handled by conversations/messages tables
}

/**
 * Query analytics data with filters
 */
export async function queryAnalytics(filters: {
  startDate?: string
  endDate?: string
  country?: string
  threatLevel?: number
  sessionId?: string
  limit?: number
}) {
  try {
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex}`)
      params.push(filters.startDate)
      paramIndex++
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex}`)
      params.push(filters.endDate)
      paramIndex++
    }

    if (filters.country) {
      conditions.push(`data->'location'->>'country' = $${paramIndex}`)
      params.push(filters.country)
      paramIndex++
    }

    if (filters.threatLevel !== undefined) {
      conditions.push(`(data->'security'->>'threatLevel')::int >= $${paramIndex}`)
      params.push(filters.threatLevel)
      paramIndex++
    }

    if (filters.sessionId) {
      conditions.push(`session_id = $${paramIndex}`)
      params.push(filters.sessionId)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = Math.min(filters.limit || 100, 1000) // Default 100, max 1000
    
    const result = await db.query(`
      SELECT 
        session_id as "sessionId",
        data->>'ip' as "ip",
        data->'location'->>'country' as "country",
        data->'location'->>'countryCode' as "countryCode",
        data->'location'->>'city' as "city",
        data->'location'->>'region' as "region",
        data->'location'->>'timezone' as "timezone",
        (data->'location'->>'latitude')::float as "latitude",
        (data->'location'->>'longitude')::float as "longitude",
        data->'device'->>'deviceType' as "deviceType",
        data->'device'->>'browser' as "browser",
        data->'device'->>'browserVersion' as "browserVersion",
        data->'device'->>'os' as "os",
        data->'device'->>'osVersion' as "osVersion",
        data->>'user_agent' as "userAgent",
        data->'device'->>'screenResolution' as "screenResolution",
        (data->'security'->>'threatLevel')::int as "threatLevel",
        (data->'security'->>'isProxy')::boolean as "isProxy",
        (data->'security'->>'isVPN')::boolean as "isVPN",
        (data->'security'->>'isTor')::boolean as "isTor",
        (data->'security'->>'isDataCenter')::boolean as "isDataCenter",
        data->>'fingerprint' as "fingerprint",
        EXTRACT(EPOCH FROM created_at) * 1000 as "createdAt",
        EXTRACT(EPOCH FROM last_seen) * 1000 as "lastSeen"
      FROM sessions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `, [...params, limit])

    return result.rows
  } catch (error) {
    console.error('Error querying analytics:', error)
    throw error
  }
}

/**
 * Get page views for a session
 */
export async function getPageViews(sessionId: string): Promise<PageView[]> {
  try {
    const result = await db.query(`
      SELECT 
        $1 as "sessionId",
        jsonb_array_elements(data->'page_views') as view_data
      FROM sessions
      WHERE session_id = $1
    `, [sessionId])

    return result.rows.map(row => ({
      id: crypto.randomUUID(),
      sessionId: row.sessionId,
      visitorId: row.sessionId,
      url: row.view_data.url || '',
      path: row.view_data.path,
      queryParams: row.view_data.queryParams || {},
      title: row.view_data.title || '',
      referrer: row.view_data.referrer,
      loadTime: row.view_data.loadTime || 0,
      domContentLoaded: row.view_data.domContentLoaded || 0,
      firstContentfulPaint: row.view_data.firstContentfulPaint || 0,
      timeToInteractive: row.view_data.timeToInteractive || 0,
      viewportWidth: row.view_data.viewportWidth || 0,
      viewportHeight: row.view_data.viewportHeight || 0,
      scrollDepth: row.view_data.scrollDepth || 0,
      timestamp: row.view_data.timestamp
    }))
  } catch (error) {
    console.error('Error getting page views:', error)
    return []
  }
}

/**
 * Get interactions for a session
 */
export async function getInteractions(sessionId: string): Promise<UserInteraction[]> {
  try {
    const result = await db.query(`
      SELECT 
        $1 as "sessionId",
        jsonb_array_elements(data->'interactions') as interaction_data
      FROM sessions
      WHERE session_id = $1
    `, [sessionId])

    return result.rows.map(row => ({
      id: crypto.randomUUID(),
      sessionId: row.sessionId,
      visitorId: row.sessionId,
      type: row.interaction_data.type,
      element: row.interaction_data.element || '',
      elementId: row.interaction_data.elementId || '',
      elementClass: row.interaction_data.elementClass || '',
      elementText: row.interaction_data.elementText || '',
      position: row.interaction_data.position || { x: 0, y: 0 },
      timestamp: row.interaction_data.timestamp
    }))
  } catch (error) {
    console.error('Error getting interactions:', error)
    return []
  }
}

/**
 * Get analytics summary stats
 */
export async function getAnalyticsSummary() {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT session_id) as "totalSessions",
        COUNT(DISTINCT profile_id) as "uniqueVisitors",
        COUNT(DISTINCT data->'location'->>'country') as "countriesCount",
        COUNT(DISTINCT data->'location'->>'city') as "citiesCount",
        AVG((data->'security'->>'threatLevel')::int) as "avgThreatLevel",
        COUNT(CASE WHEN (data->'security'->>'threatLevel')::int > 5 THEN 1 END) as "highThreatCount"
      FROM sessions
    `)

    return result.rows[0]
  } catch (error) {
    console.error('Error getting analytics summary:', error)
    return {
      totalSessions: 0,
      uniqueVisitors: 0,
      countriesCount: 0,
      citiesCount: 0,
      avgThreatLevel: 0,
      highThreatCount: 0
    }
  }
}
