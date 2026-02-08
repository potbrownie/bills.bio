'use client'

import ConversationSidebar from '@/components/ConversationSidebar'
import DashboardNavbar from '@/components/DashboardNavbar'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { handleLogout } = useAuth()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          {children}
        </main>
        
        {/* Conversation Sidebar */}
        <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}
