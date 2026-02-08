import { NextRequest, NextResponse } from 'next/server'
import { 
  extractRealIP, 
  getIPIntelligence, 
  parseUserAgent, 
  generateSessionId 
} from '@/lib/tracking/intelligence'
import { VisitorSession } from '@/lib/tracking/schema'
import { saveSession } from '@/lib/tracking/store'

/**
 * API endpoint to track visitor sessions
 * POST /api/tracking/session
 */
export async function POST(request: NextRequest) {
  console.log('[SESSION TRACKING] Starting session tracking...')
  
  try {
    // Extract data from request
    console.log('[SESSION TRACKING] Extracting request data...')
    const ip = extractRealIP(request.headers)
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const referer = request.headers.get('referer') || ''
    const acceptLanguage = request.headers.get('accept-language') || ''
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    
    console.log('[SESSION TRACKING] Extracted:', { ip, userAgent: userAgent.substring(0, 50) })
    
    // Get any client-provided data
    const body = await request.json().catch(() => {
      console.log('[SESSION TRACKING] No JSON body provided')
      return {}
    })
    
    console.log('[SESSION TRACKING] Body keys:', Object.keys(body))
    
    // Generate session ID
    console.log('[SESSION TRACKING] Generating session ID...')
    const sessionId = generateSessionId({
      ip,
      userAgent,
      acceptLanguage,
      acceptEncoding,
    })
    console.log('[SESSION TRACKING] Session ID:', sessionId)
    
    // Get IP intelligence
    console.log('[SESSION TRACKING] Getting IP intelligence...')
    const ipIntel = await getIPIntelligence(ip)
    console.log('[SESSION TRACKING] IP Intel received:', { country: ipIntel.country, city: ipIntel.city })
    
    // Parse device info
    console.log('[SESSION TRACKING] Parsing user agent...')
    const deviceInfo = parseUserAgent(userAgent)
    console.log('[SESSION TRACKING] Device info:', { browser: deviceInfo.browser, os: deviceInfo.os })
    
    // Extract languages
    const languages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim())
      .filter(Boolean)
    
    // Parse referrer
    let referrerDomain = ''
    let referrerPath = ''
    if (referer) {
      try {
        const refUrl = new URL(referer)
        referrerDomain = refUrl.hostname
        referrerPath = refUrl.pathname
      } catch (e) {
        // Invalid referrer URL
      }
    }
    
    // Build session object
    const session: VisitorSession = {
      id: `vis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      
      // IP Intelligence
      ip,
      ipType: ipIntel.type || (ip.includes(':') ? 'ipv6' : 'ipv4'),
      isProxy: ipIntel.isProxy || false,
      isVPN: ipIntel.isVPN || false,
      isTor: ipIntel.isTor || false,
      isDataCenter: ipIntel.isDataCenter || false,
      threatLevel: ipIntel.threatLevel || 0,
      
      // Geolocation
      country: ipIntel.country || 'Unknown',
      countryCode: ipIntel.countryCode || 'XX',
      region: ipIntel.region || 'Unknown',
      city: ipIntel.city || 'Unknown',
      postalCode: ipIntel.postalCode || '',
      latitude: ipIntel.latitude || 0,
      longitude: ipIntel.longitude || 0,
      timezone: ipIntel.timezone || '',
      asn: ipIntel.asn || '',
      asnOrg: ipIntel.asnOrg || '',
      isp: ipIntel.isp || '',
      
      // Device & Browser
      userAgent,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      device: deviceInfo.device,
      deviceType: deviceInfo.deviceType,
      deviceVendor: deviceInfo.deviceVendor,
      
      // Client fingerprinting (from body if provided)
      screenResolution: body.screenResolution || '',
      colorDepth: body.colorDepth || 0,
      timezone_client: body.timezone || '',
      languages,
      platform: body.platform || '',
      doNotTrack: request.headers.get('dnt') === '1',
      cookiesEnabled: body.cookiesEnabled || true,
      webglVendor: body.webglVendor || '',
      webglRenderer: body.webglRenderer || '',
      canvasFingerprint: body.canvasFingerprint || '',
      audioFingerprint: body.audioFingerprint || '',
      fontsFingerprint: body.fontsFingerprint || '',
      
      // Network
      connectionType: body.connectionType || '',
      effectiveType: body.effectiveType || '',
      downlink: body.downlink || 0,
      rtt: body.rtt || 0,
      
      // Origin & Referrer
      referrer: referer,
      referrerDomain,
      referrerPath,
      utmSource: body.utmSource || '',
      utmMedium: body.utmMedium || '',
      utmCampaign: body.utmCampaign || '',
      utmTerm: body.utmTerm || '',
      utmContent: body.utmContent || '',
      
      // Entry
      landingPage: body.landingPage || '/',
      entryUrl: body.entryUrl || request.url,
      
      // Timestamps
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    console.log('[SESSION TRACKING] Session object built, saving to database...')
    
    // Save session
    try {
      await saveSession(session)
      console.log('[SESSION TRACKING] Session saved successfully!')
    } catch (dbError) {
      console.error('[SESSION TRACKING] Database error:', dbError)
      throw dbError
    }
    
    return NextResponse.json({ 
      success: true,
      sessionId: session.sessionId,
      visitorId: session.id
    })
    
  } catch (error: any) {
    console.error('[SESSION TRACKING] ERROR - Type:', error?.constructor?.name)
    console.error('[SESSION TRACKING] ERROR - Message:', error?.message)
    console.error('[SESSION TRACKING] ERROR - Stack:', error?.stack)
    
    // Check if it's a database connection error
    if (error?.message?.includes('DATABASE_URL') || error?.code === 'ECONNREFUSED') {
      console.error('[SESSION TRACKING] Database connection error - tracking disabled')
      // Return success anyway to prevent client errors (tracking is optional)
      return NextResponse.json({ 
        success: false,
        error: 'Tracking temporarily unavailable',
        details: 'Database connection required'
      })
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to track session',
        details: error?.message,
        type: error?.constructor?.name
      },
      { status: 500 }
    )
  }
}
