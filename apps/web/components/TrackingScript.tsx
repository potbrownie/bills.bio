'use client'

import { useEffect, useRef } from 'react'

/**
 * Client-side tracking script
 * Collects advanced fingerprinting and interaction data
 */
export default function TrackingScript() {
  const trackingInitialized = useRef(false)
  
  useEffect(() => {
    // Initialize tracking session
    async function initializeTracking() {
      // Prevent double initialization
      if (trackingInitialized.current) {
        console.log('[TRACKING] Already initialized, skipping...')
        return
      }
      
      // Check for user consent
      const consent = localStorage.getItem('tracking_consent')
      console.log('[TRACKING] Consent status:', consent)
      
      if (consent !== 'true') {
        console.log('[TRACKING] ❌ Tracking disabled - consent not given')
        return
      }
      
      trackingInitialized.current = true
      console.log('[TRACKING] ✅ Starting tracking initialization...')
      try {
        console.log('[TRACKING] Collecting fingerprint...')
        // Collect fingerprint FIRST, before creating session
        const { collectFingerprint } = await import('@/lib/tracking/client')
        const fingerprint = await collectFingerprint()
        console.log('[TRACKING] Fingerprint collected:', {
          canvas: fingerprint.canvasFingerprint?.substring(0, 20) + '...',
          audio: fingerprint.audioFingerprint?.substring(0, 10) + '...',
          fonts: fingerprint.fontsFingerprint?.substring(0, 30) + '...'
        })
        
        // Create tracking session on server WITH fingerprint data
        console.log('[TRACKING] Sending session data to server...')
        const response = await fetch('/api/tracking/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            landingPage: window.location.pathname,
            entryUrl: window.location.href,
            screenResolution: fingerprint.screenResolution,
            colorDepth: fingerprint.colorDepth,
            platform: fingerprint.platform,
            cookiesEnabled: fingerprint.cookiesEnabled,
            timezone: fingerprint.timezone,
            // Include critical fingerprints for deduplication
            canvasFingerprint: fingerprint.canvasFingerprint,
            audioFingerprint: fingerprint.audioFingerprint,
            fontsFingerprint: fingerprint.fontsFingerprint,
            webglVendor: fingerprint.webglVendor,
            webglRenderer: fingerprint.webglRenderer,
            connectionType: fingerprint.connectionType,
            effectiveType: fingerprint.effectiveType,
            downlink: fingerprint.downlink,
            rtt: fingerprint.rtt,
          }),
        })

        if (!response.ok) {
          console.error('[TRACKING] ❌ API error:', response.status, response.statusText)
          return
        }
        
        const data = await response.json()
        console.log('[TRACKING] Server response:', data)
        
        if (data.success && data.sessionId && data.visitorId) {
          const { sessionId, visitorId } = data
          console.log('[TRACKING] ✅ Session created:', { sessionId, visitorId })
          
          // Store in localStorage
          localStorage.setItem('tracking_session_id', sessionId)
          localStorage.setItem('tracking_visitor_id', visitorId)
          
          // Track page view
          import('@/lib/tracking/client').then(({ trackPageView }) => {
            trackPageView(sessionId, visitorId)
          })
        } else {
          console.warn('[TRACKING] ⚠️  Session creation failed:', data?.error || 'Unknown error')
          if (data?.details === 'Database connection required') {
            console.warn('[TRACKING] Tracking disabled - database not configured')
          }
        }
      } catch (error) {
        console.error('[TRACKING] ❌ Error initializing tracking:', error)
      }
    }

    // Start tracking immediately if consent already given
    initializeTracking()
    
    // Listen for consent events (when user grants consent without reload)
    const handleConsentGranted = () => {
      console.log('[TRACKING] Consent granted event received')
      initializeTracking()
    }
    window.addEventListener('tracking-consent-granted', handleConsentGranted)
    
    // Track scroll depth
    let maxScrollDepth = 0
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const currentScroll = window.scrollY
      const scrollPercentage = (currentScroll / scrollHeight) * 100
      
      if (scrollPercentage > maxScrollDepth) {
        maxScrollDepth = scrollPercentage
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Track interactions
    const trackInteraction = (type: string, event: any) => {
      const sessionId = localStorage.getItem('tracking_session_id')
      const visitorId = localStorage.getItem('tracking_visitor_id')
      if (!sessionId || !visitorId) return
      
      const target = event.target as HTMLElement
      
      fetch('/api/tracking/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          visitorId,
          type,
          element: target.tagName,
          elementId: target.id,
          elementClass: target.className,
          elementText: target.innerText?.slice(0, 100),
          position: { x: event.clientX, y: event.clientY },
          timestamp: Date.now(),
        }),
      }).catch(err => console.error('Failed to track interaction:', err))
    }
    
    // Track clicks
    const handleClick = (e: MouseEvent) => trackInteraction('click', e)
    document.addEventListener('click', handleClick)
    
    // Track copy events
    const handleCopy = (e: ClipboardEvent) => trackInteraction('copy', e)
    document.addEventListener('copy', handleCopy)
    
    // Cleanup
    return () => {
      window.removeEventListener('tracking-consent-granted', handleConsentGranted)
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('copy', handleCopy)
    }
  }, [])
  
  return null
}
