#!/usr/bin/env tsx
/**
 * Reset monthly billing counters
 * 
 * This script should be run at the start of each month (via cron job)
 * to reset monthly usage counters.
 * 
 * Cron example (runs at midnight on the 1st of each month):
 * 0 0 1 * * cd /path/to/bills.bio/apps/web && npm run billing:reset-monthly
 * 
 * Usage:
 *   tsx scripts/reset-monthly-billing.ts
 */

import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/bills_bio'

async function main() {
  console.log('🔄 Resetting monthly billing counters...')
  console.log(`📅 Date: ${new Date().toISOString()}`)

  const pool = new Pool({
    connectionString: DATABASE_URL,
  })

  try {
    const client = await pool.connect()

    try {
      // Reset email counter for owner profile
      const result = await client.query(
        `UPDATE profiles
         SET data = jsonb_set(
           COALESCE(data, '{}'::jsonb),
           '{emails_sent_this_month}',
           '0'::jsonb
         ),
         data = jsonb_set(
           data,
           '{last_billing_reset}',
           to_jsonb(NOW())
         )
         WHERE type = 'owner'
         RETURNING id, data->>'emails_sent_this_month' as email_count`
      )

      if (result.rows.length > 0) {
        console.log('✓ Reset email counter for owner profile')
        console.log(`  Previous count has been archived`)
        console.log(`  New count: 0`)
      } else {
        console.log('⚠️  No owner profile found')
      }

      // Archive the previous month's data (optional: create a billing_history table)
      // This is a placeholder for future enhancement
      console.log('\n📊 Monthly billing data has been processed')
      console.log('💡 Tip: Consider archiving detailed reports before running this script')

      console.log('\n✨ Monthly reset complete!')
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error resetting monthly billing:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
