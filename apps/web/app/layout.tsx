import type { Metadata } from 'next'
import './globals.css'
import { ChatProvider } from '@/context/ChatContext'
import TrackingScript from '@/components/TrackingScript'
import CookieConsent from '@/components/CookieConsent'

export const metadata: Metadata = {
  title: 'Bill Huang',
  description: 'I write about what interests me and build things.',
  keywords: ['Bill Huang', 'Technology', 'Design', 'Writing', 'Portfolio'],
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TrackingScript />
        <CookieConsent />
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  )
}
