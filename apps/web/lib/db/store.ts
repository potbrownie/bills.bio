// Conversation storage - 6-table PostgreSQL schema

import { db } from '@/lib/db'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  sources?: string[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
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

/**
 * Get all conversations
 */
export async function getConversations(options?: {
  limit?: number
  includeMessages?: boolean
}): Promise<Conversation[]> {
  try {
    const limit = Math.min(options?.limit || 100, 500) // Default 100, max 500
    const includeMessages = options?.includeMessages !== false // Default true for backward compatibility
    
    const result = await db.query(`
      SELECT 
        c.id,
        c.title,
        c.profile_id as "profileId",
        EXTRACT(EPOCH FROM c.created_at) * 1000 as "createdAt",
        EXTRACT(EPOCH FROM c.updated_at) * 1000 as "updatedAt",
        CASE 
          WHEN p.id IS NOT NULL THEN json_build_object(
            'id', p.id,
            'name', p.name,
            'email', p.email,
            'status', p.status,
            'type', p.type
          )
          ELSE NULL
        END as profile,
        ${includeMessages ? `
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'role', m.role,
              'content', m.content,
              'createdAt', EXTRACT(EPOCH FROM m.created_at) * 1000,
              'sources', COALESCE(m.data->'sources', '[]'::jsonb)
            )
            ORDER BY m.created_at ASC
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as messages
        ` : `'[]'::json as messages`}
      FROM conversations c
      ${includeMessages ? 'LEFT JOIN messages m ON m.conversation_id = c.id' : ''}
      LEFT JOIN profiles p ON p.id = c.profile_id
      GROUP BY c.id, c.title, c.profile_id, c.created_at, c.updated_at, p.id, p.name, p.email, p.status, p.type
      ORDER BY c.updated_at DESC
      LIMIT $1
    `, [limit])

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      profileId: row.profileId,
      profile: row.profile,
      messages: row.messages,
      createdAt: Math.floor(Number(row.createdAt)),
      updatedAt: Math.floor(Number(row.updatedAt))
    }))
  } catch (error) {
    console.error('Error getting conversations:', error)
    return []
  }
}

/**
 * Get single conversation with messages
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.title,
        c.profile_id as "profileId",
        EXTRACT(EPOCH FROM c.created_at) * 1000 as "createdAt",
        EXTRACT(EPOCH FROM c.updated_at) * 1000 as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'role', m.role,
              'content', m.content,
              'createdAt', EXTRACT(EPOCH FROM m.created_at) * 1000,
              'sources', COALESCE(m.data->'sources', '[]'::jsonb)
            )
            ORDER BY m.created_at ASC
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as messages
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, c.title, c.profile_id, c.created_at, c.updated_at
    `, [id])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      title: row.title,
      profileId: row.profileId,
      messages: row.messages,
      createdAt: Math.floor(Number(row.createdAt)),
      updatedAt: Math.floor(Number(row.updatedAt))
    }
  } catch (error) {
    console.error('Error getting conversation:', error)
    return null
  }
}

/**
 * Create new conversation
 */
export async function createConversation(
  title: string = 'New chat',
  profileId?: string
): Promise<string> {
  try {
    const data = {
      title,
      channel: 'website'
    }

    const result = await db.query(`
      INSERT INTO conversations (title, profile_id, data)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [title, profileId, JSON.stringify(data)])

    return result.rows[0].id
  } catch (error) {
    console.error('Error creating conversation:', error)
    throw error
  }
}

/**
 * Add message to conversation
 */
export async function addMessage(
  conversationId: string,
  message: Message
): Promise<void> {
  try {
    const data = {
      role: message.role,
      content: message.content,
      sources: message.sources || []
    }

    await db.query(`
      INSERT INTO messages (conversation_id, role, content, data, created_at)
      VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))
    `, [
      conversationId,
      message.role,
      message.content,
      JSON.stringify(data),
      message.timestamp
    ])

    // Update conversation's updated_at
    await db.query(`
      UPDATE conversations
      SET updated_at = to_timestamp($2 / 1000.0)
      WHERE id = $1
    `, [conversationId, message.timestamp])
  } catch (error) {
    console.error('Error adding message:', error)
    throw error
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<void> {
  try {
    await db.query(`
      UPDATE conversations
      SET title = $2, updated_at = NOW()
      WHERE id = $1
    `, [id, title])
  } catch (error) {
    console.error('Error updating conversation title:', error)
    throw error
  }
}

/**
 * Delete conversation (cascade deletes messages)
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    await db.query(`
      DELETE FROM conversations WHERE id = $1
    `, [id])
  } catch (error) {
    console.error('Error deleting conversation:', error)
    throw error
  }
}

/**
 * Link conversation to profile
 */
export async function linkConversationToProfile(
  conversationId: string,
  profileId: string
): Promise<void> {
  try {
    await db.query(`
      UPDATE conversations
      SET profile_id = $2
      WHERE id = $1
    `, [conversationId, profileId])
  } catch (error) {
    console.error('Error linking conversation to profile:', error)
    throw error
  }
}
