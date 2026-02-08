'use client'

import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import ConversationSidebar from '@/components/ConversationSidebar'
import DashboardNavbar from '@/components/DashboardNavbar'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/hooks/useAuth'

export default function AnalyticsPage() {
  const { handleLogout } = useAuth()

  return (
    <AuthGuard showBackLink>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-light text-charcoal">Analytics</h1>
          </div>
          <AnalyticsDashboard />
        </main>
        
        {/* Conversation Sidebar */}
        <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}
