// Client-side advanced fingerprinting
// This runs in the browser to collect additional device/environment data

export interface ClientFingerprint {
  // Screen & Display
  screenResolution: string
  colorDepth: number
  pixelRatio: number
  
  // Browser Environment
  timezone: string
  timezoneOffset: number
  languages: string[]
  platform: string
  hardwareConcurrency: number
  deviceMemory: number
  
  // Privacy Settings
  doNotTrack: boolean
  cookiesEnabled: boolean
  
  // WebGL Fingerprint
  webglVendor: string
  webglRenderer: string
  webglVersion: string
  
  // Canvas Fingerprint
  canvasFingerprint: string
  
  // Audio Fingerprint
  audioFingerprint: string
  
  // Font Detection
  fontsFingerprint: string
  
  // Network Information
  connectionType: string
  effectiveType: string
  downlink: number
  rtt: number
  
  // Battery Status
  batteryLevel: number
  batteryCharging: boolean
  
  // Touch Support
  touchSupport: boolean
  maxTouchPoints: number
  
  // Storage
  localStorageEnabled: boolean
  sessionStorageEnabled: boolean
  indexedDBEnabled: boolean
}

/**
 * Collect comprehensive client-side fingerprint
 */
export async function collectFingerprint(): Promise<ClientFingerprint> {
  const fingerprint: Partial<ClientFingerprint> = {}
  
  // Screen & Display
  fingerprint.screenResolution = `${window.screen.width}x${window.screen.height}`
  fingerprint.colorDepth = window.screen.colorDepth
  fingerprint.pixelRatio = window.devicePixelRatio || 1
  
  // Browser Environment
  fingerprint.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  fingerprint.timezoneOffset = new Date().getTimezoneOffset()
  fingerprint.languages = navigator.languages ? Array.from(navigator.languages) : [navigator.language]
  fingerprint.platform = navigator.platform
  fingerprint.hardwareConcurrency = navigator.hardwareConcurrency || 0
  fingerprint.deviceMemory = (navigator as any).deviceMemory || 0
  
  // Privacy Settings
  fingerprint.doNotTrack = navigator.doNotTrack === '1'
  fingerprint.cookiesEnabled = navigator.cookieEnabled
  
  // WebGL Fingerprint
  const webgl = getWebGLFingerprint()
  fingerprint.webglVendor = webgl.vendor
  fingerprint.webglRenderer = webgl.renderer
  fingerprint.webglVersion = webgl.version
  
  // Canvas Fingerprint
  fingerprint.canvasFingerprint = getCanvasFingerprint()
  
  // Audio Fingerprint
  fingerprint.audioFingerprint = await getAudioFingerprint()
  
  // Font Detection
  fingerprint.fontsFingerprint = getFontsFingerprint()
  
  // Network Information
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (connection) {
    fingerprint.connectionType = connection.type || 'unknown'
    fingerprint.effectiveType = connection.effectiveType || 'unknown'
    fingerprint.downlink = connection.downlink || 0
    fingerprint.rtt = connection.rtt || 0
  } else {
    fingerprint.connectionType = 'unknown'
    fingerprint.effectiveType = 'unknown'
    fingerprint.downlink = 0
    fingerprint.rtt = 0
  }
  
  // Battery Status
  try {
    const battery = await (navigator as any).getBattery?.()
    if (battery) {
      fingerprint.batteryLevel = battery.level
      fingerprint.batteryCharging = battery.charging
    } else {
      fingerprint.batteryLevel = -1
      fingerprint.batteryCharging = false
    }
  } catch {
    fingerprint.batteryLevel = -1
    fingerprint.batteryCharging = false
  }
  
  // Touch Support
  fingerprint.touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  fingerprint.maxTouchPoints = navigator.maxTouchPoints || 0
  
  // Storage
  fingerprint.localStorageEnabled = testStorage('localStorage')
  fingerprint.sessionStorageEnabled = testStorage('sessionStorage')
  fingerprint.indexedDBEnabled = !!window.indexedDB
  
  return fingerprint as ClientFingerprint
}

/**
 * Get WebGL fingerprint
 */
function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext
    
    if (!gl) {
      return { vendor: 'none', renderer: 'none', version: 'none' }
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    
    return {
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
    }
  } catch {
    return { vendor: 'error', renderer: 'error', version: 'error' }
  }
}

/**
 * Get Canvas fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return 'none'
    
    // Draw complex text with colors and transforms
    ctx.textBaseline = 'top'
    ctx.font = '14px "Arial"'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('Canvas Fingerprint', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Canvas Fingerprint', 4, 17)
    
    // Get image data
    return canvas.toDataURL().slice(-50) // Last 50 chars as fingerprint
  } catch {
    return 'error'
  }
}

/**
 * Get Audio fingerprint
 */
async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return 'none'
    
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const analyser = context.createAnalyser()
    const gainNode = context.createGain()
    const scriptProcessor = context.createScriptProcessor(4096, 1, 1)
    
    gainNode.gain.value = 0 // Mute
    oscillator.type = 'triangle'
    oscillator.connect(analyser)
    analyser.connect(scriptProcessor)
    scriptProcessor.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start(0)
    
    const fingerprint = await new Promise<string>((resolve) => {
      scriptProcessor.onaudioprocess = (event) => {
        const output = event.inputBuffer.getChannelData(0)
        const hash = output.slice(0, 30).reduce((acc, val) => acc + Math.abs(val), 0)
        oscillator.stop()
        context.close()
        resolve(hash.toString())
      }
    })
    
    return fingerprint
  } catch {
    return 'error'
  }
}

/**
 * Get Fonts fingerprint
 */
function getFontsFingerprint(): string {
  const baseFonts = ['monospace', 'sans-serif', 'serif']
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
    'Arial Black', 'Impact'
  ]
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'none'
  
  ctx.font = '72px monospace'
  const baseWidths = baseFonts.map(font => {
    ctx.font = `72px ${font}`
    return ctx.measureText('mmmmmmmmmmlli').width
  })
  
  const detectedFonts = testFonts.filter((font, index) => {
    return baseFonts.some((baseFont, baseIndex) => {
      ctx.font = `72px ${font}, ${baseFont}`
      const width = ctx.measureText('mmmmmmmmmmlli').width
      return width !== baseWidths[baseIndex]
    })
  })
  
  return detectedFonts.join(',')
}

/**
 * Test storage availability
 */
function testStorage(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type]
    const test = '__storage_test__'
    storage.setItem(test, test)
    storage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Send fingerprint to server
 */
export async function sendFingerprint(sessionId: string) {
  try {
    const fingerprint = await collectFingerprint()
    
    await fetch('/api/tracking/fingerprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, fingerprint }),
    })
  } catch (error) {
    console.error('Failed to send fingerprint:', error)
  }
}

/**
 * Track page view with performance metrics
 */
export function trackPageView(sessionId: string, visitorId: string) {
  try {
    const performance = window.performance
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    
    const pageView = {
      sessionId,
      visitorId,
      url: window.location.href,
      path: window.location.pathname,
      queryParams: Object.fromEntries(new URLSearchParams(window.location.search)),
      title: document.title,
      referrer: document.referrer,
      
      // Performance metrics
      loadTime: navigation?.loadEventEnd || 0,
      domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      timeToInteractive: 0, // Would need additional calculation
      
      // Viewport
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollDepth: 0, // Will be updated on scroll
      
      timestamp: Date.now(),
    }
    
    fetch('/api/tracking/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageView),
    }).catch(err => console.error('Failed to track page view:', err))
    
  } catch (error) {
    console.error('Page view tracking error:', error)
  }
}
