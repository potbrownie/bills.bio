/**
 * Unified Profile System Types
 * A comprehensive profile system where Bill is just a special user (type: 'owner')
 */

export interface Profile {
  // === CORE IDENTITY ===
  id: string
  type: 'owner' | 'visitor'
  
  // Basic Info
  name: string
  email?: string
  phone?: string
  avatar?: string
  bio?: string
  
  location?: {
    city?: string
    country?: string
    timezone?: string
    coordinates?: [number, number]
  }
  
  // === PROFESSIONAL ===
  professional: {
    title?: string
    company?: string
    industry?: string[]
    skills?: string[]
    interests?: string[]
    looking_for?: string[]
    website?: string
  }
  
  // === SOCIAL PRESENCE ===
  socials: {
    twitter?: string
    linkedin?: string
    instagram?: string
    snapchat?: string
    telegram?: string
    signal?: string
    whatsapp?: string
    github?: string
    youtube?: string
    tiktok?: string
    discord?: string
    wechat?: string
    threads?: string
  }
  
  // === KNOWLEDGE BASE ===
  knowledge: {
    topic_ids: string[]
    opinion_ids: string[]
    experience_ids: string[]
    project_ids: string[]
    
    communication_style?: {
      tone: string[]
      vocabulary: string[]
      sentence_patterns: string[]
      humor_style?: string
      formality_level: 1 | 2 | 3 | 4 | 5
      emoji_usage: 'never' | 'rare' | 'moderate' | 'frequent'
      response_length: 'brief' | 'moderate' | 'detailed'
    }
    
    document_ids?: string[]
    embedding_ids?: string[]
  }
  
  // === RELATIONSHIP DATA ===
  relationships: {
    connection_ids: string[]
    
    first_contact: Date
    last_interaction: Date
    total_interactions: number
    interaction_frequency: 'daily' | 'weekly' | 'monthly' | 'rare'
    
    relationship_score: number
    relationship_type?: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'collaborator'
    trust_level?: 1 | 2 | 3 | 4 | 5
    
    how_we_met?: string
    shared_interests?: string[]
    mutual_connection_ids?: string[]
    
    preferred_channel?: string
    response_time_expectation?: 'immediate' | 'hours' | 'days'
  }
  
  // === MULTI-CHANNEL PRESENCE ===
  channels: {
    [channel: string]: ChannelProfile
  }
  
  // === CONVERSATION MEMORY ===
  memory: {
    fact_ids: string[]
    topic_discussion_ids: string[]
    pending_item_ids: string[]
    conversation_summary_ids: string[]
    persistent_context?: Record<string, any>
  }
  
  // === PREFERENCES & SETTINGS ===
  preferences: {
    privacy_level: 'public' | 'contacts_only' | 'private'
    data_retention_consent: boolean
    communication_consent: boolean
    newsletter_consent?: boolean
    
    notifications?: {
      email: boolean
      sms: boolean
      push: boolean
    }
    
    language?: string
    theme?: 'light' | 'dark' | 'auto'
  }
  
  // === ANALYTICS & METADATA ===
  metadata: {
    created_at: Date
    updated_at: Date
    last_seen?: Date
    
    session_ids: string[]
    device_info?: DeviceInfo[]
    
    total_messages_sent: number
    total_messages_received: number
    avg_response_time?: number
    
    profile_completion_score: number
    missing_fields?: string[]
    
    tags?: string[]
    labels?: string[]
    
    custom_data?: Record<string, any>
  }
}

export interface Topic {
  id: string
  name: string
  category: string
  depth: 'basic' | 'intermediate' | 'expert'
  description?: string
  key_points?: string[]
  examples?: string[]
  related_topic_ids?: string[]
  created_at: Date
  updated_at: Date
}

export interface Opinion {
  id: string
  profile_id: string
  topic: string
  stance: string
  reasoning?: string
  confidence: 1 | 2 | 3 | 4 | 5
  context?: string
  sources?: string[]
  created_at: Date
  updated_at: Date
}

export interface Experience {
  id: string
  profile_id: string
  title: string
  organization?: string
  description: string
  start_date: Date
  end_date?: Date
  type: 'work' | 'education' | 'project' | 'achievement'
  highlights?: string[]
  skills_gained?: string[]
  media?: string[]
  created_at: Date
  updated_at: Date
}

export interface Project {
  id: string
  profile_id: string
  name: string
  description: string
  status: 'idea' | 'active' | 'completed' | 'paused'
  start_date?: Date
  url?: string
  github?: string
  collaborator_ids?: string[]
  technologies?: string[]
  media?: string[]
  created_at: Date
  updated_at: Date
}

export interface Connection {
  id: string
  from_profile_id: string
  to_profile_id: string
  type: 'knows' | 'worked_with' | 'friends' | 'family' | 'mentor' | 'mentee'
  strength: number
  since?: Date
  context?: string
  mutual: boolean
  created_at: Date
  updated_at: Date
}

export interface ChannelProfile {
  handle?: string
  verified: boolean
  active: boolean
  last_activity?: Date
  conversation_ids?: string[]
}

export interface Fact {
  id: string
  profile_id: string
  content: string
  source: 'conversation' | 'manual' | 'inferred'
  confidence: number
  conversation_id?: string
  verified: boolean
  extracted_at: Date
  created_at: Date
}

export interface TopicDiscussion {
  id: string
  profile_id: string
  topic: string
  times_discussed: number
  last_discussed: Date
  sentiment?: 'positive' | 'neutral' | 'negative'
  key_points?: string[]
  created_at: Date
  updated_at: Date
}

export interface PendingItem {
  id: string
  profile_id: string
  type: 'follow_up' | 'question' | 'task' | 'introduction'
  content: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: Date
  completed: boolean
  completed_at?: Date
  conversation_id?: string
  created_at: Date
  updated_at: Date
}

export interface ConversationSummary {
  id: string
  conversation_id: string
  profile_id: string
  date: Date
  channel: string
  summary: string
  key_points?: string[]
  sentiment?: string
  topics?: string[]
  action_items?: string[]
  created_at: Date
}

export interface DeviceInfo {
  id: string
  profile_id: string
  device_type: string
  browser?: string
  os?: string
  first_seen: Date
  last_seen: Date
}
