'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: ReactNode
  showBackLink?: boolean
}

export default function AuthGuard({ children, showBackLink = false }: AuthGuardProps) {
  const { authenticated, loading, password, error, setPassword, handleLogin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-gold"></div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-warm-white">
        <div className="max-w-md w-full">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-light text-charcoal mb-2">Authentication Required</h1>
            <p className="text-taupe font-light">Enter password to access</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 text-lg border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent transition-all font-light text-charcoal bg-warm-white"
              placeholder="Enter password"
              autoFocus
            />
            
            {error && (
              <p className="text-center text-sm text-red-600 font-light">{error}</p>
            )}
          </form>
          
          {showBackLink && (
            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-taupe hover:text-warm-gold font-light transition-colors">
                ← Back to home
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
