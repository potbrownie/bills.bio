// IP Intelligence & Enrichment Services

import { headers } from 'next/headers'

export interface IPIntelligence {
  ip: string
  type: 'ipv4' | 'ipv6'
  isProxy: boolean
  isVPN: boolean
  isTor: boolean
  isDataCenter: boolean
  threatLevel: number
  country: string
  countryCode: string
  region: string
  city: string
  postalCode: string
  latitude: number
  longitude: number
  timezone: string
  asn: string
  asnOrg: string
  isp: string
}

export interface DeviceFingerprint {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot'
  deviceVendor: string
}

/**
 * Extract real IP from request, handling proxies and CDNs
 */
export function extractRealIP(request: Request | Headers): string {
  const headersList = request instanceof Request ? request.headers : request
  
  // Priority order for IP extraction
  const ipHeaders = [
    'cf-connecting-ip',      // Cloudflare
    'x-real-ip',             // Nginx
    'x-forwarded-for',       // Standard proxy
    'x-client-ip',           // Apache
    'x-cluster-client-ip',   // Load balancers
    'forwarded',             // RFC 7239
    'true-client-ip',        // Akamai/Cloudflare
    'fastly-client-ip',      // Fastly CDN
  ]
  
  for (const header of ipHeaders) {
    const value = headersList.get(header)
    if (value) {
      // Handle comma-separated IPs (take first one)
      const ip = value.split(',')[0].trim()
      if (ip) return ip
    }
  }
  
  return 'unknown'
}

/**
 * Get comprehensive IP intelligence using multiple services
 */
export async function getIPIntelligence(ip: string): Promise<IPIntelligence> {
  // Use multiple services for redundancy and accuracy
  const results = await Promise.allSettled([
    getIPInfoFromIPAPI(ip),
    getIPInfoFromIPData(ip),
    getIPInfoFromIPHub(ip),
  ])
  
  // Merge results with priority
  let intelligence: Partial<IPIntelligence> = { ip }
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      intelligence = { ...intelligence, ...result.value }
    }
  }
  
  return intelligence as IPIntelligence
}

/**
 * IP-API.com - Free, no key required (150 req/min)
 */
async function getIPInfoFromIPAPI(ip: string): Promise<Partial<IPIntelligence>> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,mobile,query`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )
    
    if (!response.ok) return {}
    
    const data = await response.json()
    
    if (data.status === 'fail') return {}
    
    return {
      type: ip.includes(':') ? 'ipv6' : 'ipv4',
      country: data.country,
      countryCode: data.countryCode,
      region: data.regionName,
      city: data.city,
      postalCode: data.zip,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      asnOrg: data.org,
      asn: data.as,
      isProxy: data.proxy || false,
      isDataCenter: data.hosting || false,
      threatLevel: (data.proxy ? 50 : 0) + (data.hosting ? 30 : 0),
    }
  } catch (error) {
    console.error('IP-API error:', error)
    return {}
  }
}

/**
 * IPData.co - Free tier 1500 req/day with API key
 */
async function getIPInfoFromIPData(ip: string): Promise<Partial<IPIntelligence>> {
  const apiKey = process.env.IPDATA_API_KEY
  if (!apiKey) return {}
  
  try {
    const response = await fetch(
      `https://api.ipdata.co/${ip}?api-key=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return {}
    
    const data = await response.json()
    
    return {
      type: ip.includes(':') ? 'ipv6' : 'ipv4',
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      postalCode: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.time_zone?.name,
      asn: data.asn?.asn,
      asnOrg: data.asn?.name,
      isp: data.asn?.domain,
      isProxy: data.threat?.is_proxy || false,
      isVPN: data.threat?.is_vpn || false,
      isTor: data.threat?.is_tor || false,
      isDataCenter: data.threat?.is_datacenter || false,
      threatLevel: data.threat?.threat_score || 0,
    }
  } catch (error) {
    console.error('IPData error:', error)
    return {}
  }
}

/**
 * IPHub.info - Proxy/VPN detection specialist
 */
async function getIPInfoFromIPHub(ip: string): Promise<Partial<IPIntelligence>> {
  const apiKey = process.env.IPHUB_API_KEY
  if (!apiKey) return {}
  
  try {
    const response = await fetch(
      `https://v2.api.iphub.info/ip/${ip}`,
      {
        headers: { 'X-Key': apiKey },
        next: { revalidate: 3600 }
      }
    )
    
    if (!response.ok) return {}
    
    const data = await response.json()
    
    return {
      country: data.countryName,
      countryCode: data.countryCode,
      asn: data.asn.toString(),
      isp: data.isp,
      isProxy: data.block === 1,
      isDataCenter: data.block === 2,
      threatLevel: data.block * 50,
    }
  } catch (error) {
    console.error('IPHub error:', error)
    return {}
  }
}

/**
 * Parse User-Agent for device fingerprinting
 */
export function parseUserAgent(userAgent: string): DeviceFingerprint {
  const ua = userAgent.toLowerCase()
  
  // Detect browser
  let browser = 'Unknown'
  let browserVersion = 'Unknown'
  
  if (ua.includes('edg/')) {
    browser = 'Edge'
    browserVersion = ua.match(/edg\/([0-9.]+)/)?.[1] || 'Unknown'
  } else if (ua.includes('chrome/') && !ua.includes('edg')) {
    browser = 'Chrome'
    browserVersion = ua.match(/chrome\/([0-9.]+)/)?.[1] || 'Unknown'
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox'
    browserVersion = ua.match(/firefox\/([0-9.]+)/)?.[1] || 'Unknown'
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser = 'Safari'
    browserVersion = ua.match(/version\/([0-9.]+)/)?.[1] || 'Unknown'
  }
  
  // Detect OS
  let os = 'Unknown'
  let osVersion = 'Unknown'
  
  if (ua.includes('windows')) {
    os = 'Windows'
    if (ua.includes('windows nt 10.0')) osVersion = '10/11'
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1'
    else if (ua.includes('windows nt 6.2')) osVersion = '8'
  } else if (ua.includes('mac os x')) {
    os = 'macOS'
    osVersion = ua.match(/mac os x ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown'
  } else if (ua.includes('linux')) {
    os = 'Linux'
  } else if (ua.includes('android')) {
    os = 'Android'
    osVersion = ua.match(/android ([0-9.]+)/)?.[1] || 'Unknown'
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS'
    osVersion = ua.match(/os ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown'
  }
  
  // Detect device
  let device = 'Unknown'
  let deviceType: DeviceFingerprint['deviceType'] = 'desktop'
  let deviceVendor = 'Unknown'
  
  if (ua.includes('iphone')) {
    device = 'iPhone'
    deviceType = 'mobile'
    deviceVendor = 'Apple'
  } else if (ua.includes('ipad')) {
    device = 'iPad'
    deviceType = 'tablet'
    deviceVendor = 'Apple'
  } else if (ua.includes('android')) {
    deviceType = ua.includes('mobile') ? 'mobile' : 'tablet'
    if (ua.includes('samsung')) {
      deviceVendor = 'Samsung'
      device = 'Samsung Device'
    } else if (ua.includes('pixel')) {
      deviceVendor = 'Google'
      device = 'Google Pixel'
    } else {
      device = 'Android Device'
    }
  } else if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    deviceType = 'bot'
    device = 'Bot'
  }
  
  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device,
    deviceType,
    deviceVendor,
  }
}

/**
 * Detect if request is from a bot
 */
export function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot',
    'baiduspider', 'yandexbot', 'facebookexternalhit',
    'linkedinbot', 'twitterbot', 'whatsapp',
    'curl', 'wget', 'python-requests', 'axios',
    'postman', 'insomnia', 'httpie'
  ]
  
  return botPatterns.some(pattern => ua.includes(pattern))
}

/**
 * Generate session ID from fingerprint components
 */
export function generateSessionId(components: {
  ip: string
  userAgent: string
  acceptLanguage: string
  acceptEncoding: string
}): string {
  const data = JSON.stringify(components)
  // Simple hash function
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `sess_${Date.now()}_${Math.abs(hash).toString(36)}`
}
