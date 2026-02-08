import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    console.log('[TEST-DB] Testing database connection...')
    
    // Test basic connection
    const testResult = await db.query('SELECT NOW() as current_time')
    console.log('[TEST-DB] Connection successful, current time:', testResult.rows[0])
    
    // Check if sessions table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
      )
    `)
    console.log('[TEST-DB] Sessions table exists:', tableCheck.rows[0].exists)
    
    // Get table structure
    const structureCheck = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'sessions'
      ORDER BY ordinal_position
    `)
    console.log('[TEST-DB] Sessions table structure:', structureCheck.rows)
    
    // Try a simple insert/delete test
    const testSessionId = `test_${Date.now()}`
    try {
      await db.query(`
        INSERT INTO sessions (session_id, profile_id, data, created_at, last_seen)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [testSessionId, null, JSON.stringify({ test: true })])
      console.log('[TEST-DB] Test insert successful')
      
      await db.query('DELETE FROM sessions WHERE session_id = $1', [testSessionId])
      console.log('[TEST-DB] Test delete successful')
    } catch (insertError: any) {
      console.error('[TEST-DB] Insert/delete test failed:', insertError.message)
      return NextResponse.json({
        success: false,
        error: 'Insert test failed',
        details: insertError.message,
        code: insertError.code
      })
    }
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        currentTime: testResult.rows[0].current_time,
        sessionsTableExists: tableCheck.rows[0].exists,
        tableStructure: structureCheck.rows
      }
    })
    
  } catch (error: any) {
    console.error('[TEST-DB] Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 })
  }
}
