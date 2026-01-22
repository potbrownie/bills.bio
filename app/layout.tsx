import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bill - UI/UX Designer',
  description: 'Crafting beautiful digital experiences through thoughtful design',
  keywords: ['UI Designer', 'UX Designer', 'Portfolio', 'Web Design'],
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
      <body className="antialiased">{children}</body>
    </html>
  )
}
