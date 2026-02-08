'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

export interface ConversationItem {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  profileId?: string
  profile?: {
    id: string
    name: string
    email?: string
    status: string
    type: string
  }
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  createdAt?: number
}

interface ChatContextValue {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  conversations: ConversationItem[]
  refreshConversations: () => Promise<void>
  currentConversationId: string | null
  setCurrentConversationId: (id: string | null) => void
  messages: ChatMessage[]
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
  loadConversation: (id: string) => Promise<void>
  createNewConversation: () => Promise<string>
  addMessageToStore: (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    sources?: string[]
  ) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  isExpanded: boolean
  setIsExpanded: (v: boolean) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (e) {
      console.error('Refresh conversations:', e)
    }
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setCurrentConversationId(id)
      setMessages(
        (data.messages ?? []).map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sources: m.sources,
          createdAt: m.createdAt,
        }))
      )
      setIsExpanded(true)
      setSidebarOpen(false)
    } catch (e) {
      console.error('Load conversation:', e)
    }
  }, [])

  const createNewConversation = useCallback(async (): Promise<string> => {
    // Get tracking session ID to link conversation to profile
    const trackingSessionId = typeof window !== 'undefined' 
      ? localStorage.getItem('tracking_session_id') 
      : null
    
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: 'New chat',
        sessionId: trackingSessionId 
      }),
    })
    if (!res.ok) throw new Error('Failed to create conversation')
    const data = await res.json()
    const conversationId = data.id
    setCurrentConversationId(conversationId)
    setMessages([])
    await refreshConversations()
    return conversationId
  }, [refreshConversations])

  const addMessageToStore = useCallback(
    async (
      conversationId: string,
      role: 'user' | 'assistant',
      content: string,
      sources?: string[]
    ) => {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, sources, timestamp: Date.now() }),
      })
      
      // Auto-title from first user message
      if (role === 'user') {
        const conv = conversations.find(c => c.id === conversationId)
        if (conv && conv.title === 'New chat') {
          const title = content.trim().slice(0, 50) + (content.length > 50 ? '...' : '')
          // Update title asynchronously (non-blocking)
          fetch(`/api/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          }).catch(() => {}) // Silent fail, don't block
        }
      }
      
      await refreshConversations()
    },
    [refreshConversations, conversations]
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (currentConversationId === id) {
        setCurrentConversationId(null)
        setMessages([])
        setIsExpanded(false)
      }
      await refreshConversations()
    },
    [currentConversationId, refreshConversations]
  )

  const value: ChatContextValue = {
    sidebarOpen,
    setSidebarOpen,
    conversations,
    refreshConversations,
    currentConversationId,
    setCurrentConversationId,
    messages,
    setMessages,
    loadConversation,
    createNewConversation,
    addMessageToStore,
    deleteConversation,
    isExpanded,
    setIsExpanded,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
