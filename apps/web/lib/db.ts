/**
 * Database connection using PostgreSQL
 * This is a simple connection pool for the profile system
 */

import { Pool, QueryResult, QueryResultRow } from 'pg'

// Singleton pattern for connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })
  }
  return pool
}

export const db = {
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const pool = getPool()
    return pool.query<T>(text, params)
  },

  async getClient() {
    const pool = getPool()
    return pool.connect()
  },

  async end() {
    if (pool) {
      await pool.end()
      pool = null
    }
  },
}
