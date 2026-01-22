'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsExpanded(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setIsExpanded(false)
  }

  const renderInputBar = (showWarning = false) => (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Bill's AI..."
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
        <div className="fixed inset-0 z-50 bg-warm-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-warm-cream">
            <button
              onClick={handleNewChat}
              className="text-sm text-taupe hover:text-charcoal transition-colors font-light"
            >
              + New chat
            </button>
            <h3 className="text-sm font-medium text-charcoal">Chat with Bill's AI</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-taupe hover:text-charcoal transition-colors p-1 rounded-sm hover:bg-warm-cream"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {messages.length === 0 ? (
              <div className="max-w-3xl mx-auto mt-20 text-center">
                <h2 className="text-2xl sm:text-3xl text-charcoal mb-4 font-light">
                  Chat with Bill's AI
                </h2>
                <p className="text-taupe text-base font-light">
                  Ask me anything about Bill or just have a conversation.
                </p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-8">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-charcoal text-warm-white'
                          : 'bg-warm-cream text-charcoal'
                      }`}
                    >
                      <p className="text-sm font-light leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-warm-cream rounded-lg p-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Bar at Bottom */}
          <div className="border-t border-warm-cream p-4">
            <div className="max-w-2xl w-full mx-auto px-4">
              {renderInputBar(true)}
            </div>
          </div>
        </div>
      )}

      {/* Floating Centered Input Bar */}
      {!isExpanded && (
        <>
          {/* Gradient overlay from warning to bottom */}
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
