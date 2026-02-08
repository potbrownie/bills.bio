'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/context/ChatContext'

const TOOL_LABELS: Record<string, string> = {
  query_profile: "Bill's profile",
  web_search: 'Web search',
  schedule_meeting: 'Meeting scheduled',
  send_email: 'Message sent',
}

const CHAT_SESSION_KEY = 'bills-bio-chat-session'

type StatusType = 'active' | 'away' | 'offline'

const STATUS_COLORS: Record<StatusType, string> = {
  active: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
}

const MODES = [
  { id: 'default', name: 'Default', description: 'Balanced and helpful' },
  { id: 'funny', name: 'Funny', description: 'Humorous and lighthearted' },
  { id: 'wise', name: 'Wise', description: 'Thoughtful and insightful' },
  { id: 'annoyed', name: 'Annoyed', description: 'Direct and no-nonsense' },
]

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(CHAT_SESSION_KEY)
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `session-${Date.now()}`
    sessionStorage.setItem(CHAT_SESSION_KEY, id)
  }
  return id
}

export default function Chat() {
  const {
    messages,
    setMessages,
    isExpanded,
    setIsExpanded,
    currentConversationId,
    createNewConversation,
    addMessageToStore,
    setSidebarOpen,
  } = useChat()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [subtitle, setSubtitle] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [status, setStatus] = useState<StatusType>('active')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mode, setMode] = useState('Default')
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const modeDropdownDesktopRef = useRef<HTMLDivElement>(null)
  const modeDropdownMobileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  // Check server status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health', { 
          method: 'GET',
          cache: 'no-store'
        })
        const data = await response.json()
        
        if (data.maintenance) {
          setStatus('away')
        } else if (data.status === 'ok') {
          setStatus('active')
        } else if (data.status === 'degraded') {
          setStatus('away')
        } else {
          setStatus('offline')
        }
      } catch (error) {
        setStatus('offline')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, isExpanded])

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  // Hide body scrollbar when chat is expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isExpanded])

  // Handle click outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
      const clickedOutsideDesktop = modeDropdownDesktopRef.current && !modeDropdownDesktopRef.current.contains(event.target as Node)
      const clickedOutsideMobile = modeDropdownMobileRef.current && !modeDropdownMobileRef.current.contains(event.target as Node)
      if (clickedOutsideDesktop && clickedOutsideMobile) {
        setModeDropdownOpen(false)
      }
    }

    if (menuOpen || modeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen, modeDropdownOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userContent = input.trim()
    const userMessage = { role: 'user' as const, content: userContent }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    setSubtitle(null)
    setIsExpanded(true)

    let conversationId = currentConversationId
    if (!conversationId) {
      try {
        conversationId = await createNewConversation()
        setMessages([userMessage])
      } catch (err) {
        console.error('Create conversation:', err)
        setIsLoading(false)
        setMessages(nextMessages.slice(0, -1))
        setInput(userContent)
        return
      }
    }

    await addMessageToStore(conversationId, 'user', userContent)

    try {
      const selectedMode = MODES.find(m => m.name === mode)
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          ...(sessionId && { session_id: sessionId }),
          ...(selectedMode && { mode: selectedMode.id }),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: undefined }])

      let buffer = ''
      let assistantContent = ''
      let assistantSources: string[] | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''
        for (const block of blocks) {
          let eventType = ''
          let dataLine = ''
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            else if (line.startsWith('data: ')) dataLine = line.slice(6)
          }
          if (!eventType || !dataLine) continue
          try {
            const data = JSON.parse(dataLine)
            if (eventType === 'status') {
              const subtitleText = typeof data.subtitle === 'string' ? data.subtitle : ''
              setSubtitle(subtitleText)
            } else if (eventType === 'message_delta' && typeof data.delta === 'string') {
              assistantContent += data.delta
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), { role: 'assistant', content: last.content + data.delta, sources: last.sources }]
                }
                return [...prev, { role: 'assistant', content: data.delta }]
              })
            } else if (eventType === 'sources' && Array.isArray(data.tools)) {
              assistantSources = data.tools
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...last, sources: data.tools }]
                }
                return prev
              })
            } else if (eventType === 'error' && data.error) {
              throw new Error(data.error)
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }

      await addMessageToStore(conversationId!, 'assistant', assistantContent, assistantSources)
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        const rest = last?.role === 'assistant' && last.content === '' ? prev.slice(0, -1) : prev
        return [
          ...rest,
          {
            role: 'assistant',
            content: error instanceof Error ? error.message : "Sorry, I'm having trouble connecting right now. Please try again later.",
          },
        ]
      })
    } finally {
      setIsLoading(false)
      setSubtitle(null)
    }
  }

  const handleNewChat = async () => {
    await createNewConversation()
    setIsExpanded(true)
  }

  const renderInputBar = (showWarning = false) => (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Bill's AI"
          className="w-full px-5 py-5 pr-16 bg-warm-white border border-warm-cream rounded-full text-charcoal placeholder-taupe focus:outline-none focus:border-warm-gold transition-all shadow-lg font-light text-base"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-charcoal text-warm-white hover:bg-warm-gold transition-colors rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Send message"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
      {showWarning && (
        <p className="mt-2 text-xs text-taupe font-light text-center">
          AI responses may contain errors. Please verify important information.
        </p>
      )}
    </form>
  )

  return (
    <>
      {/* Full Screen Chat Interface */}
      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-warm-white flex flex-col">
          {/* Header */}
          <div className="flex flex-col border-b border-warm-cream">
            <div className="grid grid-cols-3 items-center p-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-taupe hover:text-charcoal rounded-md hover:bg-warm-cream transition-colors"
                  aria-label="Back to home"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="relative w-10 h-10">
                  <div className="w-full h-full rounded-full overflow-hidden border border-warm-cream">
                    <img
                      src="https://i.namu.wiki/i/djtuzk91thpExQ-G-ZGu20SJzIxyyvVUsF04bdNImmwW5pYvpDJ6vJMJni1ZiixHsbmGm2iY5wj9XPJISbYzPg.webp"
                      alt="Bill"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full bg-warm-cream flex items-center justify-center text-charcoal font-light text-sm">B</div>'
                        }
                      }}
                    />
                  </div>
                  {/* Status Indicator */}
                  <div 
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-warm-white ${STATUS_COLORS[status]}`}
                    title={
                      status === 'active' ? 'Active' :
                      status === 'away' ? 'Away - System under maintenance' :
                      'Offline'
                    }
                  />
                </div>
                <h3 className="text-sm font-medium text-charcoal">
                  Bill
                </h3>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative hidden sm:block" ref={modeDropdownDesktopRef}>
                  <button
                    onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                    className="flex items-center gap-1 text-sm text-charcoal hover:text-charcoal transition-colors font-semibold px-3 py-1.5 rounded-full border border-warm-cream hover:bg-warm-cream"
                  >
                    <span>{mode}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {modeDropdownOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-warm-white border border-warm-cream rounded-lg shadow-lg py-1 z-50">
                      {MODES.map((modeOption) => (
                        <button
                          key={modeOption.id}
                          onClick={() => {
                            setMode(modeOption.name)
                            setModeDropdownOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2 transition-colors ${
                            mode === modeOption.name
                              ? 'bg-warm-cream text-charcoal'
                              : 'text-charcoal hover:bg-warm-cream'
                          }`}
                        >
                          <div className="font-medium text-sm">{modeOption.name}</div>
                          <div className="text-xs text-taupe font-light">{modeOption.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="relative sm:hidden" ref={modeDropdownMobileRef}>
                  <button
                    onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                    className="flex items-center gap-1 text-sm text-charcoal hover:text-charcoal transition-colors font-semibold px-3 py-1.5 rounded-full border border-warm-cream hover:bg-warm-cream"
                  >
                    <span>{mode}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {modeDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-warm-white border border-warm-cream rounded-lg shadow-lg py-1 z-50">
                      {MODES.map((modeOption) => (
                        <button
                          key={modeOption.id}
                          onClick={() => {
                            setMode(modeOption.name)
                            setModeDropdownOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2 transition-colors ${
                            mode === modeOption.name
                              ? 'bg-warm-cream text-charcoal'
                              : 'text-charcoal hover:bg-warm-cream'
                          }`}
                        >
                          <div className="font-medium text-sm">{modeOption.name}</div>
                          <div className="text-xs text-taupe font-light">{modeOption.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="text-taupe hover:text-charcoal transition-colors p-1 rounded-sm hover:bg-warm-cream"
                    aria-label="Menu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-warm-white border border-warm-cream rounded-lg shadow-lg py-1 z-50">
                      <button
                        onClick={() => {
                          handleNewChat()
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-warm-cream transition-colors font-light"
                      >
                        + New chat
                      </button>
                      <button
                        onClick={() => {
                          setIsExpanded(false)
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-warm-cream transition-colors font-light"
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {messages.length === 0 ? (
              <div className="max-w-3xl mx-auto mt-20 text-center">
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-8">
                {messages.map((message, index) => {
                  // Skip empty assistant messages (loading bubble will show instead)
                  if (message.content === '' && message.role === 'assistant') return null
                  
                  return (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[85%] space-y-1">
                        <div
                          className={`rounded-[32px] p-4 ${
                            message.role === 'user'
                              ? 'bg-charcoal text-warm-white'
                              : 'bg-warm-cream text-charcoal'
                          }`}
                        >
                          <p className="text-sm font-light leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                        {message.role === 'assistant' && message.sources?.length ? (
                          <p className="text-xs text-taupe font-light px-1" aria-label="Sources">
                            From {message.sources.map((t) => TOOL_LABELS[t] ?? t).join(' · ')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
                {isLoading && messages[messages.length - 1]?.content === '' && (
                  <div className="flex justify-start">
                    <div className="bg-warm-cream rounded-[18px] px-4 py-3 inline-flex items-center gap-1">
                      <div className="w-2 h-2 bg-taupe rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-taupe rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-taupe rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Bar at Bottom */}
          <div className="border-t border-warm-cream py-4">
            <div className="max-w-2xl w-full mx-auto px-4">
              {renderInputBar(true)}
            </div>
          </div>
        </div>
      )}

      {/* Floating Centered Input Bar */}
      {!isExpanded && (
        <>
          <div className="fixed bottom-0 left-0 right-0 h-32 z-30 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-warm-white" />
          <div className="fixed bottom-0 left-0 right-0 z-40 pb-4 flex items-center justify-center pointer-events-none">
            <div className="max-w-2xl w-full mx-auto px-4 pointer-events-auto">
              {renderInputBar(true)}
            </div>
          </div>
        </>
      )}
    </>
  )
}
