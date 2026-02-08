'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useChat } from '@/context/ChatContext'
import { useState, useEffect, useRef } from 'react'

interface DashboardNavbarProps {
  onLogout: () => void
}

export default function DashboardNavbar({ onLogout }: DashboardNavbarProps) {
  const pathname = usePathname()
  const { setSidebarOpen } = useChat()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openMenu = () => {
    setSidebarOpen(true)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  return (
    <nav className="bg-warm-white border-b border-warm-cream sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center h-20 relative">
          {/* Menu Button */}
          <button
            onClick={openMenu}
            className="text-taupe hover:text-warm-gold transition-colors duration-300 p-1"
            aria-label="Open menu and conversations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 14h12" />
            </svg>
          </button>
          
          {/* Centered Menu Items */}
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 space-x-1">
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-lg text-sm font-light tracking-wide transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-warm-cream text-charcoal'
                  : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
              }`}
            >
              Home
            </Link>
            <Link
              href="/chats"
              className={`px-4 py-2 rounded-lg text-sm font-light tracking-wide transition-colors ${
                pathname === '/chats'
                  ? 'bg-warm-cream text-charcoal'
                  : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
              }`}
            >
              Chats
            </Link>
            <Link
              href="/people"
              className={`px-4 py-2 rounded-lg text-sm font-light tracking-wide transition-colors ${
                pathname === '/people'
                  ? 'bg-warm-cream text-charcoal'
                  : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
              }`}
            >
              People
            </Link>
            <Link
              href="/blogs"
              className={`px-4 py-2 rounded-lg text-sm font-light tracking-wide transition-colors ${
                pathname === '/blogs'
                  ? 'bg-warm-cream text-charcoal'
                  : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
              }`}
            >
              Blog
            </Link>
            <Link
              href="/analytics"
              className={`px-4 py-2 rounded-lg text-sm font-light tracking-wide transition-colors ${
                pathname === '/analytics'
                  ? 'bg-warm-cream text-charcoal'
                  : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
              }`}
            >
              Analytics
            </Link>
          </div>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-warm-gold hover:bg-warm-gold/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-warm-gold/50"
                aria-label="Profile menu"
              >
                <span className="text-warm-white font-medium text-sm">BH</span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-warm-white border border-warm-cream rounded-lg shadow-lg py-2 z-50">
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm font-light text-taupe hover:bg-warm-cream hover:text-charcoal transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    href="/billing"
                    className="flex items-center px-4 py-2 text-sm font-light text-taupe hover:bg-warm-cream hover:text-charcoal transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Billing
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm font-light text-taupe hover:bg-warm-cream hover:text-charcoal transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <div className="border-t border-warm-cream my-1"></div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      onLogout()
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm font-light text-taupe hover:bg-warm-cream hover:text-charcoal transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden px-6 pb-3 space-y-1">
        <Link
          href="/dashboard"
          className={`block px-4 py-2 rounded-lg text-sm font-light ${
            pathname === '/dashboard'
              ? 'bg-warm-cream text-charcoal'
              : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
          }`}
        >
          Home
        </Link>
        <Link
          href="/chats"
          className={`block px-4 py-2 rounded-lg text-sm font-light ${
            pathname === '/chats'
              ? 'bg-warm-cream text-charcoal'
              : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
          }`}
        >
          Chats
        </Link>
        <Link
          href="/people"
          className={`block px-4 py-2 rounded-lg text-sm font-light ${
            pathname === '/people'
              ? 'bg-warm-cream text-charcoal'
              : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
          }`}
        >
          People
        </Link>
        <Link
          href="/blogs"
          className={`block px-4 py-2 rounded-lg text-sm font-light ${
            pathname === '/blogs'
              ? 'bg-warm-cream text-charcoal'
              : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
          }`}
        >
          Blog
        </Link>
        <Link
          href="/analytics"
          className={`block px-4 py-2 rounded-lg text-sm font-light ${
            pathname === '/analytics'
              ? 'bg-warm-cream text-charcoal'
              : 'text-taupe hover:text-charcoal hover:bg-warm-cream/50'
          }`}
        >
          Analytics
        </Link>
      </div>
    </nav>
  )
}
