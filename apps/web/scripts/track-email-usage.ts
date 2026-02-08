#!/usr/bin/env tsx
/**
 * Track email usage for AWS SES billing
 * 
 * This script updates the owner profile with email usage data
 * to be used in billing calculations.
 * 
 * Usage:
 *   tsx scripts/track-email-usage.ts --increment
 *   tsx scripts/track-email-usage.ts --set 100
 *   tsx scripts/track-email-usage.ts --reset
 */

import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/bills_bio'

async function main() {
  const args = process.argv.slice(2)
  const action = args[0]
  const value = args[1] ? parseInt(args[1], 10) : 1

  const pool = new Pool({
    connectionString: DATABASE_URL,
  })

  try {
    const client = await pool.connect()

    try {
      // Get the owner profile
      const ownerResult = await client.query(
        `SELECT id, data FROM profiles WHERE type = 'owner' LIMIT 1`
      )

      if (ownerResult.rows.length === 0) {
        console.error('No owner profile found')
        process.exit(1)
      }

      const owner = ownerResult.rows[0]
      const currentData = owner.data || {}
      const currentEmailCount = currentData.emails_sent_this_month || 0

      let newEmailCount = currentEmailCount

      switch (action) {
        case '--increment':
          newEmailCount = currentEmailCount + value
          console.log(`Incrementing email count by ${value}`)
          break

        case '--set':
          newEmailCount = value
          console.log(`Setting email count to ${value}`)
          break

        case '--reset':
          newEmailCount = 0
          console.log('Resetting email count to 0')
          break

        case '--show':
          console.log(`Current email count: ${currentEmailCount}`)
          process.exit(0)

        default:
          console.error('Usage:')
          console.error('  tsx scripts/track-email-usage.ts --increment [count]')
          console.error('  tsx scripts/track-email-usage.ts --set <count>')
          console.error('  tsx scripts/track-email-usage.ts --reset')
          console.error('  tsx scripts/track-email-usage.ts --show')
          process.exit(1)
      }

      // Update the profile
      await client.query(
        `UPDATE profiles 
         SET data = jsonb_set(
           COALESCE(data, '{}'::jsonb),
           '{emails_sent_this_month}',
           $1::text::jsonb
         )
         WHERE id = $2`,
        [newEmailCount, owner.id]
      )

      console.log(`✓ Email usage updated: ${currentEmailCount} → ${newEmailCount}`)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
