/**
 * Tracking Debug Helper
 * Run this in browser console to debug tracking issues
 */

window.trackingDebug = {
  // Check consent status
  checkConsent() {
    const consent = localStorage.getItem('tracking_consent')
    console.log('Tracking consent:', consent)
    return consent
  },
  
  // Enable tracking
  enable() {
    localStorage.setItem('tracking_consent', 'true')
    console.log('✅ Tracking enabled - refresh the page')
  },
  
  // Disable tracking
  disable() {
    localStorage.setItem('tracking_consent', 'false')
    console.log('❌ Tracking disabled')
  },
  
  // Check current session
  checkSession() {
    const sessionId = localStorage.getItem('tracking_session_id')
    const visitorId = localStorage.getItem('tracking_visitor_id')
    console.log('Current session:', { sessionId, visitorId })
    return { sessionId, visitorId }
  },
  
  // Clear session (force new session on next page load)
  clearSession() {
    localStorage.removeItem('tracking_session_id')
    localStorage.removeItem('tracking_visitor_id')
    console.log('🔄 Session cleared - refresh to create new session')
  },
  
  // Full status
  status() {
    console.log('=== Tracking Status ===')
    this.checkConsent()
    this.checkSession()
  }
}

console.log('Tracking debug helper loaded. Try:')
console.log('  trackingDebug.status()    - Check current status')
console.log('  trackingDebug.enable()    - Enable tracking')
console.log('  trackingDebug.disable()   - Disable tracking')
console.log('  trackingDebug.clearSession() - Clear session')
