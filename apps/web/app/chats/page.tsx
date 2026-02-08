'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ConversationSidebar from '@/components/ConversationSidebar'
import DashboardNavbar from '@/components/DashboardNavbar'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/context/ChatContext'

function formatMessengerTime(timestamp: number | string | Date): string {
  // Convert to number if needed
  let ts: number
  if (typeof timestamp === 'string') {
    ts = new Date(timestamp).getTime()
  } else if (timestamp instanceof Date) {
    ts = timestamp.getTime()
  } else {
    ts = timestamp
  }

  const now = Date.now()
  const diff = now - ts
  
  const minutes = Math.floor(diff / 60000) // milliseconds to minutes
  const hours = Math.floor(diff / 3600000) // milliseconds to hours
  const days = Math.floor(diff / 86400000) // milliseconds to days
  const weeks = Math.floor(days / 7)

  if (diff < 60000) return 'now' // less than 1 minute
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  if (weeks < 4) return `${weeks}w`
  
  // For older messages, show the date
  const date = new Date(ts)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

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

function ChatsPageContent() {
  const { handleLogout } = useAuth()
  const searchParams = useSearchParams()
  const conversationParam = searchParams.get('conversation')
  
  const {
    conversations,
    currentConversationId,
    messages,
    loadConversation,
    deleteConversation: deleteConv,
    refreshConversations,
  } = useChat()
  
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    // Load conversations and auto-select first one
    const initConversations = async () => {
      await refreshConversations()
      setLoading(false)
    }
    initConversations()
  }, [refreshConversations])

  useEffect(() => {
    // Load conversation from URL parameter or auto-select first one
    if (conversationParam && conversations.length > 0) {
      // Load the conversation from URL parameter
      const convExists = conversations.find(c => c.id === conversationParam)
      if (convExists) {
        loadConversation(conversationParam)
      }
    } else if (!currentConversationId && conversations.length > 0 && !conversationParam) {
      // Auto-select first conversation if none selected and no URL param
      loadConversation(conversations[0].id)
    }
  }, [conversations, currentConversationId, conversationParam, loadConversation])

  useEffect(() => {
    // Load profile and sessions when conversation changes
    const fetchProfileData = async () => {
      const selectedConv = conversations.find(c => c.id === currentConversationId)
      if (!selectedConv?.profileId) {
        setProfile(null)
        setSessions([])
        return
      }

      setLoadingProfile(true)
      try {
        const [profileRes, sessionsRes] = await Promise.all([
          fetch(`/api/profiles/${selectedConv.profileId}`),
          fetch(`/api/profiles/${selectedConv.profileId}/sessions`)
        ])
        
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData)
        }
        
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json()
          setSessions(sessionsData.sessions || [])
        }
      } catch (error) {
        console.error('Failed to fetch profile data:', error)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchProfileData()
  }, [currentConversationId, conversations])

  const sendReply = async () => {
    if (!replyText.trim() || !currentConversationId || sending) return

    setSending(true)
    try {
      // Send message through chat API
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          session_id: currentConversationId,
          conversation_id: currentConversationId,
        }),
      })
      
      // Refresh messages
      await loadConversation(currentConversationId)
      setReplyText('')
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('Failed to send reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteConversation = async (convId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return
    
    try {
      await deleteConv(convId)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('Failed to delete conversation')
    }
  }

  const selectedConv = conversations.find(c => c.id === currentConversationId)

  return (
    <AuthGuard showBackLink>
      <div className="min-h-screen bg-warm-white">
        <DashboardNavbar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-charcoal">Chats</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-gold"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-warm-white rounded-lg border border-warm-cream p-12 text-center">
            <h3 className="text-xl font-medium text-charcoal mb-2">No conversations yet</h3>
            <p className="text-taupe font-light">Conversations will appear here when visitors chat with your AI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
            {/* Conversations List */}
            <div className="bg-warm-white rounded-lg border border-warm-cream overflow-hidden">
              <div className="bg-warm-cream border-b border-warm-cream px-4 py-3">
                <h2 className="font-medium text-charcoal tracking-wide">All Conversations ({conversations.length})</h2>
              </div>
              <div className="overflow-y-auto h-full">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left px-4 py-4 border-b border-warm-cream hover:bg-warm-cream/50 transition-colors cursor-pointer ${
                      currentConversationId === conv.id ? 'bg-warm-cream' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-charcoal truncate">{conv.title}</h3>
                        {conv.profile && (
                          <p className="text-xs text-warm-gold font-light mt-0.5">
                            {conv.profile.name}
                            {conv.profile.status !== 'anonymous' && (
                              <span className="ml-1 text-taupe">· {conv.profile.status}</span>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-taupe font-light mt-1">
                          {formatMessengerTime(conv.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConversation(conv.id)
                        }}
                        className="ml-2 text-taupe hover:text-red-600 transition-colors text-sm font-light"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages View */}
            <div className="lg:col-span-2 bg-warm-white rounded-lg border border-warm-cream flex flex-col overflow-hidden">
              {selectedConv ? (
                <>
                  {/* Header */}
                  <div className="bg-warm-cream border-b border-warm-cream px-6 py-4">
                    <h2 className="font-medium text-charcoal">{selectedConv.title}</h2>
                    <p className="text-xs text-taupe font-light mt-1">
                      Started {new Date(selectedConv.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-taupe mt-20">
                        <p className="font-light">No messages in this conversation yet.</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div
                          key={msg.id || idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                msg.role === 'user'
                                  ? 'bg-charcoal text-warm-white'
                                  : 'bg-warm-cream text-charcoal'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap font-light">{msg.content}</p>
                            </div>
                            {msg.createdAt && (
                              <p className="text-xs text-taupe mt-1 px-2 font-light">
                                {new Date(msg.createdAt).toLocaleTimeString()}
                              </p>
                            )}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-2 px-2">
                                <p className="text-xs text-taupe mb-1 font-light">Sources:</p>
                                {msg.sources.map((source, idx) => (
                                  <a
                                    key={idx}
                                    href={source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-warm-gold hover:underline block truncate font-light"
                                  >
                                    {source}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Input */}
                  <div className="border-t border-warm-cream p-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                        placeholder="Type your reply..."
                        className="flex-1 px-4 py-3 border border-warm-cream rounded-lg focus:ring-2 focus:ring-warm-gold focus:border-transparent font-light text-charcoal bg-warm-white"
                        disabled={sending}
                      />
                      <button
                        onClick={sendReply}
                        disabled={sending || !replyText.trim()}
                        className="px-6 py-3 bg-charcoal text-warm-white rounded-lg font-light hover:bg-charcoal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-taupe">
                  <div className="text-center">
                    <p className="font-light">Select a conversation to view messages</p>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Panel */}
            <div className="bg-warm-white rounded-lg border border-warm-cream overflow-hidden">
              <div className="bg-warm-cream border-b border-warm-cream px-4 py-3">
                <h2 className="font-medium text-charcoal tracking-wide">Visitor Profile</h2>
              </div>
              <div className="overflow-y-auto h-full p-4">
                {!selectedConv ? (
                  <div className="text-center text-taupe mt-8">
                    <p className="text-sm font-light">Select a conversation to view profile</p>
                  </div>
                ) : loadingProfile ? (
                  <div className="flex items-center justify-center mt-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-gold"></div>
                  </div>
                ) : !profile && sessions.length === 0 ? (
                  <div className="text-center text-taupe mt-8">
                    <p className="text-sm font-light">No information available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile && (
                      <>
                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            profile.status === 'registered' ? 'bg-green-100 text-green-800' :
                            profile.status === 'identified' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                          </span>
                          <span className="text-xs text-taupe font-light">
                            {profile.type === 'visitor' ? 'Visitor' : 'Owner'}
                          </span>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-taupe font-light block mb-1">Name</label>
                            <p className="text-sm text-charcoal font-medium">{profile.name || 'Anonymous'}</p>
                          </div>

                          {profile.email && (
                            <div>
                              <label className="text-xs text-taupe font-light block mb-1">Email</label>
                              <p className="text-sm text-charcoal break-all">{profile.email}</p>
                            </div>
                          )}

                          <div>
                            <label className="text-xs text-taupe font-light block mb-1">Profile ID</label>
                            <p className="text-xs text-charcoal font-mono break-all">{profile.id}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Session Information */}
                    {sessions.length > 0 && (
                      <div className={profile ? "pt-3 border-t border-warm-cream" : ""}>
                        <label className="text-xs text-taupe font-light block mb-3">
                          {sessions.length === 1 ? 'Session Info' : `${sessions.length} Sessions`}
                        </label>
                        {sessions.slice(0, 1).map((session) => {
                          const device = session.data?.device || {}
                          const location = session.data?.location || {}
                          
                          return (
                            <div key={session.id} className="space-y-3">
                              {/* Browser & Device */}
                              {device.browser && (
                                <div>
                                  <label className="text-xs text-taupe font-light block mb-1">Browser</label>
                                  <p className="text-sm text-charcoal">
                                    {device.browser} {device.browserVersion}
                                  </p>
                                </div>
                              )}

                              {device.os && (
                                <div>
                                  <label className="text-xs text-taupe font-light block mb-1">Operating System</label>
                                  <p className="text-sm text-charcoal">
                                    {device.os} {device.osVersion}
                                  </p>
                                </div>
                              )}

                              {device.deviceType && (
                                <div>
                                  <label className="text-xs text-taupe font-light block mb-1">Device Type</label>
                                  <p className="text-sm text-charcoal capitalize">
                                    {device.deviceType}
                                  </p>
                                </div>
                              )}

                              {/* Location */}
                              {(location.city || location.country) && (
                                <div>
                                  <label className="text-xs text-taupe font-light block mb-1">Location</label>
                                  <p className="text-sm text-charcoal">
                                    {[location.city, location.region, location.country].filter(Boolean).join(', ')}
                                  </p>
                                  {location.timezone && (
                                    <p className="text-xs text-taupe mt-0.5">{location.timezone}</p>
                                  )}
                                </div>
                              )}

                              {/* IP Address */}
                              {session.data?.ip && (
                                <div>
                                  <label className="text-xs text-taupe font-light block mb-1">IP Address</label>
                                  <p className="text-xs text-charcoal font-mono">{session.data.ip}</p>
                                </div>
                              )}

                              {/* Session Times */}
                              <div>
                                <label className="text-xs text-taupe font-light block mb-1">Session Started</label>
                                <p className="text-xs text-charcoal">
                                  {new Date(session.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-taupe font-light block mb-1">Last Activity</label>
                                <p className="text-xs text-charcoal">
                                  {new Date(session.last_seen).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )
                        })}

                        {/* Show count if multiple sessions */}
                        {sessions.length > 1 && (
                          <div className="mt-3 text-xs text-taupe font-light">
                            + {sessions.length - 1} more {sessions.length - 1 === 1 ? 'session' : 'sessions'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Profile Timestamps */}
                    {profile && (
                      <div className="pt-3 border-t border-warm-cream space-y-2">
                        <div>
                          <label className="text-xs text-taupe font-light block mb-1">Profile Created</label>
                          <p className="text-xs text-charcoal">
                            {new Date(profile.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-taupe font-light block mb-1">Last Seen</label>
                          <p className="text-xs text-charcoal">
                            {new Date(profile.last_seen).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Additional Data */}
                    {profile && profile.data && Object.keys(profile.data).length > 0 && (
                      <div className="pt-3 border-t border-warm-cream">
                        <label className="text-xs text-taupe font-light block mb-2">Additional Information</label>
                        <div className="space-y-2">
                          {Object.entries(profile.data).map(([key, value]) => {
                            // Skip empty or null values
                            if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
                              return null
                            }
                            
                            return (
                              <div key={key}>
                                <label className="text-xs text-taupe font-light block mb-0.5">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </label>
                                <p className="text-xs text-charcoal">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Conversation Sidebar */}
      <ConversationSidebar />
      </div>
    </AuthGuard>
  )
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-warm-cream flex items-center justify-center"><div className="text-taupe">Loading...</div></div>}>
      <ChatsPageContent />
    </Suspense>
  )
}
