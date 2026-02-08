// Advanced tracking schema for comprehensive visitor intelligence

export interface VisitorSession {
  id: string
  sessionId: string
  
  // IP Intelligence
  ip: string
  ipType: 'ipv4' | 'ipv6'
  isProxy: boolean
  isVPN: boolean
  isTor: boolean
  isDataCenter: boolean
  threatLevel: number // 0-100
  
  // Geolocation
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
  
  // Device & Browser Fingerprint
  userAgent: string
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot'
  deviceVendor: string
  
  // Advanced Fingerprinting
  screenResolution: string
  colorDepth: number
  timezone_client: string
  languages: string[]
  platform: string
  doNotTrack: boolean
  cookiesEnabled: boolean
  webglVendor: string
  webglRenderer: string
  canvasFingerprint: string
  audioFingerprint: string
  fontsFingerprint: string
  
  // Network & Connection
  connectionType: string
  effectiveType: string // 4g, 3g, etc
  downlink: number
  rtt: number
  
  // Origin & Referrer Intelligence
  referrer: string
  referrerDomain: string
  referrerPath: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  
  // Entry & Landing
  landingPage: string
  entryUrl: string
  
  // Timestamps
  firstSeen: number
  lastSeen: number
  createdAt: number
  updatedAt: number
}

export interface PageView {
  id: string
  sessionId: string
  visitorId: string
  
  url: string
  path: string
  queryParams: Record<string, string>
  
  title: string
  referrer: string
  
  // Performance
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  timeToInteractive: number
  
  // Viewport
  viewportWidth: number
  viewportHeight: number
  scrollDepth: number
  
  timestamp: number
}

export interface UserInteraction {
  id: string
  sessionId: string
  visitorId: string
  
  type: 'click' | 'scroll' | 'input' | 'hover' | 'copy' | 'paste' | 'keypress'
  element: string
  elementId: string
  elementClass: string
  elementText: string
  
  position: { x: number; y: number }
  
  timestamp: number
}

export interface ConversationTracking {
  id: string
  sessionId: string
  visitorId: string
  conversationId: string
  
  messageCount: number
  userMessages: number
  assistantMessages: number
  
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  
  avgResponseTime: number
  totalDuration: number
  
  createdAt: number
  updatedAt: number
}

export interface SecurityEvent {
  id: string
  sessionId: string
  visitorId: string
  
  type: 'suspicious_ip' | 'bot_detected' | 'rate_limit' | 'injection_attempt' | 'unusual_pattern'
  severity: 'low' | 'medium' | 'high' | 'critical'
  
  details: Record<string, any>
  
  action: 'log' | 'block' | 'challenge'
  
  timestamp: number
}

export interface TrackingStore {
  sessions: VisitorSession[]
  pageViews: PageView[]
  interactions: UserInteraction[]
  conversations: ConversationTracking[]
  securityEvents: SecurityEvent[]
}
