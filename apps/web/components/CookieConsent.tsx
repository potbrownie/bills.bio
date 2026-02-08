'use client'

import { useEffect, useState } from 'react'

/**
 * Cookie consent banner for GDPR/CCPA compliance
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const consent = localStorage.getItem('tracking_consent')
    if (!consent) {
      setShow(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem('tracking_consent', 'true')
    setShow(false)
    // Trigger tracking initialization without reload
    window.dispatchEvent(new CustomEvent('tracking-consent-granted'))
  }

  const decline = () => {
    localStorage.setItem('tracking_consent', 'false')
    setShow(false)
  }

  if (!mounted || !show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 text-white border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm">
              We use cookies and tracking technologies to analyze site traffic, understand user behavior, 
              and improve your experience. This includes collecting IP addresses, device information, 
              and usage patterns.
              {' '}
              <a href="/privacy" className="underline hover:text-gray-300">
                Learn more
              </a>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={decline}
              className="px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-800 transition"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="px-4 py-2 text-sm bg-white text-black rounded hover:bg-gray-200 transition font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
