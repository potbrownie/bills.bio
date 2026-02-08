'use client'

import { useEffect, useState } from 'react'
import DashboardNavbar from '@/components/DashboardNavbar'
import AuthGuard from '@/components/AuthGuard'
import ConversationSidebar from '@/components/ConversationSidebar'
import { useAuth } from '@/hooks/useAuth'

interface Profile {
  id: string
  type: 'owner' | 'visitor'
  status: 'anonymous' | 'identified' | 'registered'
  name: string
  email?: string
  data: any
  created_at: string
  updated_at: string
  last_seen: string
}

interface Session {
  id: string
  session_id: string
  data: {
    ip?: string
    user_agent?: string
    device?: {
      browser?: string
      browserVersion?: string
      os?: string
      osVersion?: string
      device?: string
      deviceType?: string
    }
    location?: {
      country?: string
      region?: string
      city?: string
      timezone?: string
    }
    fingerprint?: string
  }
  created_at: string
  last_seen: string
}

interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount?: number
}

export default function PeoplePage() {
  const { handleLogout } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'owner' | 'visitor'>('all')

  useEffect(() => {
    fetchProfiles()
  }, [filterType])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== 'all') {
        params.append('type', filterType)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/profiles?${params.toString()}`)
      const data = await res.json()
      setProfiles(data.profiles || [])
    } catch (error) {
      console.error('Failed to fetch profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfileSessions = async (profileId: string) => {
    try {
      setLoadingSessions(true)
      const res = await fetch(`/api/profiles/${profileId}/sessions`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const fetchProfileConversations = async (profileId: string) => {
    try {
      setLoadingConversations(true)
      const res = await fetch(`/api/profiles/${profileId}/conversations`)
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      setConversations([])
    } finally {
      setLoadingConversations(false)
    }
  }

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile)
    fetchProfileSessions(profile.id)
    fetchProfileConversations(profile.id)
  }

  const filteredProfiles = profiles.filter(profile => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      profile.name?.toLowerCase().includes(search) ||
      profile.email?.toLowerCase().includes(search) ||
      profile.id.toLowerCase().includes(search)
    )
  })

  return (
    <AuthGuard showBackLink>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

        <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-light text-charcoal">People</h1>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-3 rounded-lg text-sm font-light transition-colors ${
                  filterType === 'all'
                    ? 'bg-charcoal text-warm-white'
                    : 'bg-warm-white border border-warm-cream text-taupe hover:bg-warm-cream'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('visitor')}
                className={`px-4 py-3 rounded-lg text-sm font-light transition-colors ${
                  filterType === 'visitor'
                    ? 'bg-charcoal text-warm-white'
                    : 'bg-warm-white border border-warm-cream text-taupe hover:bg-warm-cream'
                }`}
              >
                Visitors
              </button>
              <button
                onClick={() => setFilterType('owner')}
                className={`px-4 py-3 rounded-lg text-sm font-light transition-colors ${
                  filterType === 'owner'
                    ? 'bg-charcoal text-warm-white'
                    : 'bg-warm-white border border-warm-cream text-taupe hover:bg-warm-cream'
                }`}
              >
                Owners
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-gold"></div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="bg-warm-white rounded-lg border border-warm-cream p-12 text-center">
              <h3 className="text-xl font-medium text-charcoal mb-2">No profiles found</h3>
              <p className="text-taupe font-light">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Profiles will appear here as visitors interact with your site.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profiles List */}
              <div className="lg:col-span-1 bg-warm-white rounded-lg border border-warm-cream overflow-hidden">
                <div className="bg-warm-cream border-b border-warm-cream px-4 py-3">
                  <h2 className="font-medium text-charcoal tracking-wide">
                    Profiles ({filteredProfiles.length})
                  </h2>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                  {filteredProfiles.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => handleProfileClick(profile)}
                      className={`w-full text-left px-4 py-4 border-b border-warm-cream hover:bg-warm-cream/50 transition-colors ${
                        selectedProfile?.id === profile.id ? 'bg-warm-cream' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-charcoal">
                          {profile.name || 'Anonymous'}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-light ${
                            profile.type === 'owner'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {profile.type}
                        </span>
                      </div>
                      {profile.email && (
                        <p className="text-xs text-taupe font-light mb-1 truncate">
                          {profile.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-light ${
                            profile.status === 'registered'
                              ? 'bg-green-100 text-green-700'
                              : profile.status === 'identified'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {profile.status}
                        </span>
                        <span className="text-xs text-taupe font-light">
                          {new Date(profile.last_seen).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Details */}
              <div className="lg:col-span-2 bg-warm-white rounded-lg border border-warm-cream overflow-hidden">
                {!selectedProfile ? (
                  <div className="flex items-center justify-center h-full min-h-[400px] text-taupe">
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-warm-cream"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <p className="font-light">Select a profile to view details</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="bg-warm-cream border-b border-warm-cream px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-light text-charcoal mb-2">
                            {selectedProfile.name || 'Anonymous'}
                          </h2>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                selectedProfile.status === 'registered'
                                  ? 'bg-green-100 text-green-800'
                                  : selectedProfile.status === 'identified'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {selectedProfile.status.charAt(0).toUpperCase() +
                                selectedProfile.status.slice(1)}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                selectedProfile.type === 'owner'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {selectedProfile.type.charAt(0).toUpperCase() +
                                selectedProfile.type.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="p-6 overflow-y-auto max-h-[calc(100vh-300px)]">
                      <div className="space-y-6">
                        {/* Basic Information */}
                        <div>
                          <h3 className="text-sm font-medium text-charcoal mb-3 tracking-wide">
                            Basic Information
                          </h3>
                          <div className="space-y-3">
                            {selectedProfile.email && (
                              <div>
                                <label className="text-xs text-taupe font-light block mb-1">
                                  Email
                                </label>
                                <p className="text-sm text-charcoal break-all">
                                  {selectedProfile.email}
                                </p>
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-taupe font-light block mb-1">
                                Profile ID
                              </label>
                              <p className="text-xs text-charcoal font-mono break-all">
                                {selectedProfile.id}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-taupe font-light block mb-1">
                                  Created
                                </label>
                                <p className="text-xs text-charcoal">
                                  {new Date(selectedProfile.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-taupe font-light block mb-1">
                                  Last Seen
                                </label>
                                <p className="text-xs text-charcoal">
                                  {new Date(selectedProfile.last_seen).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Conversations */}
                        {loadingConversations ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-gold"></div>
                          </div>
                        ) : conversations.length > 0 ? (
                          <div>
                            <h3 className="text-sm font-medium text-charcoal mb-3 tracking-wide">
                              Conversations ({conversations.length})
                            </h3>
                            <div className="space-y-2">
                              {conversations.map((conv) => (
                                <a
                                  key={conv.id}
                                  href={`/chats?conversation=${conv.id}`}
                                  className="block bg-warm-cream rounded-lg p-4 hover:bg-warm-gold/10 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <h4 className="text-sm font-medium text-charcoal">
                                      {conv.title}
                                    </h4>
                                    <span className="text-xs text-taupe font-light">
                                      {conv.messageCount || 0} msgs
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-taupe font-light">
                                    <span>
                                      Started {new Date(conv.createdAt).toLocaleDateString()}
                                    </span>
                                    {conv.updatedAt !== conv.createdAt && (
                                      <span>
                                        • Updated {new Date(conv.updatedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Sessions */}
                        {loadingSessions ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-gold"></div>
                          </div>
                        ) : sessions.length > 0 ? (
                          <div>
                            <h3 className="text-sm font-medium text-charcoal mb-3 tracking-wide">
                              Sessions ({sessions.length})
                            </h3>
                            <div className="space-y-4">
                              {sessions.map((session, idx) => {
                                const device = session.data?.device || {}
                                const location = session.data?.location || {}

                                return (
                                  <div
                                    key={session.id}
                                    className="bg-warm-cream rounded-lg p-4 space-y-3"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-charcoal">
                                        Session {idx + 1}
                                      </span>
                                      <span className="text-xs text-taupe font-light">
                                        {new Date(session.created_at).toLocaleDateString()}
                                      </span>
                                    </div>

                                    {/* Browser & Device */}
                                    {device.browser && (
                                      <div>
                                        <label className="text-xs text-taupe font-light block mb-1">
                                          Browser
                                        </label>
                                        <p className="text-sm text-charcoal">
                                          {device.browser} {device.browserVersion}
                                        </p>
                                      </div>
                                    )}

                                    {device.os && (
                                      <div>
                                        <label className="text-xs text-taupe font-light block mb-1">
                                          Operating System
                                        </label>
                                        <p className="text-sm text-charcoal">
                                          {device.os} {device.osVersion}
                                        </p>
                                      </div>
                                    )}

                                    {device.deviceType && (
                                      <div>
                                        <label className="text-xs text-taupe font-light block mb-1">
                                          Device Type
                                        </label>
                                        <p className="text-sm text-charcoal capitalize">
                                          {device.deviceType}
                                        </p>
                                      </div>
                                    )}

                                    {/* Location */}
                                    {(location.city || location.country) && (
                                      <div>
                                        <label className="text-xs text-taupe font-light block mb-1">
                                          Location
                                        </label>
                                        <p className="text-sm text-charcoal">
                                          {[location.city, location.region, location.country]
                                            .filter(Boolean)
                                            .join(', ')}
                                        </p>
                                        {location.timezone && (
                                          <p className="text-xs text-taupe mt-0.5">
                                            {location.timezone}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* IP Address */}
                                    {session.data?.ip && (
                                      <div>
                                        <label className="text-xs text-taupe font-light block mb-1">
                                          IP Address
                                        </label>
                                        <p className="text-xs text-charcoal font-mono">
                                          {session.data.ip}
                                        </p>
                                      </div>
                                    )}

                                    {/* Session Times */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-warm-cream">
                                      <div>
                                        <label className="text-xs text-taupe font-light block mb-1">
                                          First Seen
                                        </label>
                                        <p className="text-xs text-charcoal">
                                          {new Date(session.created_at).toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-xs text-taupe font-light block mb-1">
                                          Last Activity
                                        </label>
                                        <p className="text-xs text-charcoal">
                                          {new Date(session.last_seen).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : null}

                        {/* Additional Data */}
                        {selectedProfile.data &&
                          Object.keys(selectedProfile.data).length > 0 && (
                            <div>
                              <h3 className="text-sm font-medium text-charcoal mb-3 tracking-wide">
                                Additional Information
                              </h3>
                              <div className="bg-warm-cream rounded-lg p-4 space-y-2">
                                {Object.entries(selectedProfile.data).map(([key, value]) => {
                                  // Skip empty or null values
                                  if (
                                    !value ||
                                    (typeof value === 'object' &&
                                      Object.keys(value as object).length === 0)
                                  ) {
                                    return null
                                  }

                                  return (
                                    <div key={key}>
                                      <label className="text-xs text-taupe font-light block mb-0.5">
                                        {key
                                          .replace(/_/g, ' ')
                                          .replace(/\b\w/g, l => l.toUpperCase())}
                                      </label>
                                      <p className="text-xs text-charcoal">
                                        {typeof value === 'object'
                                          ? JSON.stringify(value, null, 2)
                                          : String(value)}
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>

        <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}
