'use client'

import { useChat } from '@/context/ChatContext'

export default function ConversationSidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    conversations,
    loadConversation,
    createNewConversation,
    deleteConversation,
    currentConversationId,
    setIsExpanded,
  } = useChat()

  const handleNewChat = async () => {
    await createNewConversation()
    setIsExpanded(true)
    setSidebarOpen(false)
  }

  const handleSelect = (id: string) => {
    loadConversation(id)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteConversation(id)
  }

  if (!sidebarOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-charcoal/20"
        aria-hidden
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className="fixed left-0 top-0 bottom-0 z-[70] w-72 sm:w-80 bg-warm-white border-r border-warm-cream shadow-xl flex flex-col"
        aria-label="Conversations"
      >
        <div className="flex items-center justify-between p-4 border-b border-warm-cream">
          <h2 className="text-sm font-medium text-charcoal">Chats</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-taupe hover:text-charcoal rounded-md hover:bg-warm-cream transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-warm-cream text-sm text-charcoal hover:bg-warm-cream hover:border-warm-gold transition-colors font-light"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {conversations.length === 0 ? (
            <p className="px-3 py-4 text-xs text-taupe font-light">No conversations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelect(c.id)
                      }
                    }}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-light transition-colors cursor-pointer ${
                      currentConversationId === c.id
                        ? 'bg-warm-cream text-charcoal'
                        : 'text-taupe hover:bg-warm-cream/70 hover:text-charcoal'
                    }`}
                  >
                    <span className="flex-1 min-w-0 truncate" title={c.title}>
                      {c.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-taupe hover:text-charcoal hover:bg-warm-cream transition-all flex-shrink-0"
                      aria-label={`Delete ${c.title}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
