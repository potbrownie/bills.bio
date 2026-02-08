// Types for conversation storage (file-based or DB)

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  createdAt: number
}

export interface ConversationStore {
  conversations: Conversation[]
  messages: Message[]
}
