'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const AUTH_KEY = 'dashboard_auth'
const PASSWORD = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || 'admin123'

interface UseAuthReturn {
  authenticated: boolean
  loading: boolean
  password: string
  error: string
  setPassword: (password: string) => void
  handleLogin: (e: React.FormEvent) => void
  handleLogout: () => void
  checkAuth: () => boolean
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Check authentication status on mount
  useEffect(() => {
    const auth = sessionStorage.getItem(AUTH_KEY)
    if (auth === 'true') {
      setAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const checkAuth = (): boolean => {
    return sessionStorage.getItem(AUTH_KEY) === 'true'
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, 'true')
      setAuthenticated(true)
      setError('')
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY)
    setAuthenticated(false)
    router.push('/')
  }

  return {
    authenticated,
    loading,
    password,
    error,
    setPassword,
    handleLogin,
    handleLogout,
    checkAuth,
  }
}
