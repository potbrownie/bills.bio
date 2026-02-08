'use client'

import { useEffect } from 'react'

interface BlogPostTrackerProps {
  postId: string
  postSlug: string
}

export default function BlogPostTracker({ postId, postSlug }: BlogPostTrackerProps) {
  useEffect(() => {
    // Only track if user has consented
    const consent = localStorage.getItem('tracking_consent')
    if (consent !== 'true') return

    // Get session info
    const sessionId = localStorage.getItem('tracking_session_id')
    const visitorId = localStorage.getItem('tracking_visitor_id')

    // Track blog post view
    fetch(`/api/blog/${postId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        visitorId,
        slug: postSlug,
      }),
    }).catch(err => console.error('Failed to track blog view:', err))

    // Track reading progress
    let readingProgress = 0
    let hasTrackedHalfway = false
    let hasTrackedComplete = false

    const trackReadingProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const currentScroll = window.scrollY
      const scrollPercentage = (currentScroll / scrollHeight) * 100

      if (scrollPercentage > readingProgress) {
        readingProgress = scrollPercentage

        // Track milestone: 50% read
        if (scrollPercentage >= 50 && !hasTrackedHalfway && sessionId) {
          hasTrackedHalfway = true
          fetch('/api/tracking/interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              visitorId,
              type: 'blog_read_halfway',
              element: 'ARTICLE',
              elementText: postSlug,
              timestamp: Date.now(),
            }),
          }).catch(err => console.error('Failed to track reading milestone:', err))
        }

        // Track milestone: 90% read (essentially finished)
        if (scrollPercentage >= 90 && !hasTrackedComplete && sessionId) {
          hasTrackedComplete = true
          fetch('/api/tracking/interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              visitorId,
              type: 'blog_read_complete',
              element: 'ARTICLE',
              elementText: postSlug,
              timestamp: Date.now(),
            }),
          }).catch(err => console.error('Failed to track reading completion:', err))
        }
      }
    }

    window.addEventListener('scroll', trackReadingProgress, { passive: true })

    return () => {
      window.removeEventListener('scroll', trackReadingProgress)
    }
  }, [postId, postSlug])

  return null
}
