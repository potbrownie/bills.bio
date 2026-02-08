// Advanced tracking middleware for Next.js

import { NextRequest, NextResponse } from 'next/server'
import { 
  extractRealIP, 
  getIPIntelligence, 
  parseUserAgent, 
  isBot,
  generateSessionId 
} from './intelligence'
import { VisitorSession, SecurityEvent } from './schema'
import { saveSession, saveSecurityEvent } from './store'

/**
 * Comprehensive tracking middleware
 * Captures and enriches every request with intelligence data
 */
export async function trackingMiddleware(request: NextRequest) {
  const startTime = Date.now()
  
  // Extract all headers
  const ip = extractRealIP(request.headers)
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const referer = request.headers.get('referer') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  // Check if bot
  const isRequestFromBot = isBot(userAgent)
  
  // Parse URL and query params
  const url = new URL(request.url)
  const searchParams = Object.fromEntries(url.searchParams)
  
  // Extract UTM parameters
  const utmParams = {
    utmSource: searchParams.utm_source || '',
    utmMedium: searchParams.utm_medium || '',
    utmCampaign: searchParams.utm_campaign || '',
    utmTerm: searchParams.utm_term || '',
    utmContent: searchParams.utm_content || '',
  }
  
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
  
  // Generate or retrieve session ID
  const sessionId = generateSessionId({
    ip,
    userAgent,
    acceptLanguage,
    acceptEncoding,
  })
  
  try {
    // Get IP intelligence (async, don't block response)
    const ipIntel = await getIPIntelligence(ip)
    
    // Parse device fingerprint
    const deviceInfo = parseUserAgent(userAgent)
    
    // Extract language preferences
    const languages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim())
      .filter(Boolean)
    
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
      
      // Client fingerprinting (will be enriched by client-side script)
      screenResolution: '',
      colorDepth: 0,
      timezone_client: '',
      languages,
      platform: '',
      doNotTrack: request.headers.get('dnt') === '1',
      cookiesEnabled: true,
      webglVendor: '',
      webglRenderer: '',
      canvasFingerprint: '',
      audioFingerprint: '',
      fontsFingerprint: '',
      
      // Network
      connectionType: '',
      effectiveType: '',
      downlink: 0,
      rtt: 0,
      
      // Origin & Referrer
      referrer: referer,
      referrerDomain,
      referrerPath,
      ...utmParams,
      
      // Entry
      landingPage: url.pathname,
      entryUrl: url.href,
      
      // Timestamps
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    // Save session (async, don't block)
    saveSession(session).catch(err => 
      console.error('Failed to save session:', err)
    )
    
    // Security checks
    const securityChecks = checkSecurity(session, request)
    if (securityChecks.length > 0) {
      // Log security events
      for (const event of securityChecks) {
        saveSecurityEvent(event).catch(err =>
          console.error('Failed to save security event:', err)
        )
      }
      
      // Block if critical threat
      const criticalThreats = securityChecks.filter(e => e.severity === 'critical')
      if (criticalThreats.length > 0) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }
    
    // Add tracking headers to response
    const response = NextResponse.next()
    response.headers.set('X-Session-ID', sessionId)
    response.headers.set('X-Visitor-ID', session.id)
    response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`)
    
    return response
    
  } catch (error) {
    console.error('Tracking middleware error:', error)
    // Don't block on tracking errors
    return NextResponse.next()
  }
}

/**
 * Security threat detection
 */
function checkSecurity(session: VisitorSession, request: NextRequest): SecurityEvent[] {
  const events: SecurityEvent[] = []
  const now = Date.now()
  
  // Check threat level
  if (session.threatLevel > 70) {
    events.push({
      id: `sec_${now}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.sessionId,
      visitorId: session.id,
      type: 'suspicious_ip',
      severity: 'high',
      details: {
        threatLevel: session.threatLevel,
        isProxy: session.isProxy,
        isVPN: session.isVPN,
        isTor: session.isTor,
        isDataCenter: session.isDataCenter,
      },
      action: 'log',
      timestamp: now,
    })
  }
  
  // Check for bot
  if (session.deviceType === 'bot') {
    events.push({
      id: `sec_${now}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.sessionId,
      visitorId: session.id,
      type: 'bot_detected',
      severity: 'low',
      details: {
        userAgent: session.userAgent,
      },
      action: 'log',
      timestamp: now,
    })
  }
  
  // Check for SQL injection patterns in URL
  const url = request.url.toLowerCase()
  const sqlPatterns = ['union', 'select', 'insert', 'drop', 'delete', '--', ';--']
  if (sqlPatterns.some(pattern => url.includes(pattern))) {
    events.push({
      id: `sec_${now}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.sessionId,
      visitorId: session.id,
      type: 'injection_attempt',
      severity: 'critical',
      details: {
        url: request.url,
        method: request.method,
      },
      action: 'block',
      timestamp: now,
    })
  }
  
  return events
}

/**
 * Parse referrer source type
 */
export function parseReferrerType(referrer: string): string {
  if (!referrer) return 'direct'
  
  const domain = referrer.toLowerCase()
  
  // Social media
  if (domain.includes('facebook.com') || domain.includes('fb.com')) return 'social_facebook'
  if (domain.includes('twitter.com') || domain.includes('t.co')) return 'social_twitter'
  if (domain.includes('linkedin.com')) return 'social_linkedin'
  if (domain.includes('instagram.com')) return 'social_instagram'
  if (domain.includes('reddit.com')) return 'social_reddit'
  
  // Search engines
  if (domain.includes('google.com')) return 'search_google'
  if (domain.includes('bing.com')) return 'search_bing'
  if (domain.includes('yahoo.com')) return 'search_yahoo'
  if (domain.includes('duckduckgo.com')) return 'search_duckduckgo'
  
  return 'referral'
}
