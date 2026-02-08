#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get DATABASE_URL from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/bills_bio';

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });
  
  console.log('📊 Using database:', DATABASE_URL.replace(/:\/\/.*@/, '://***@'));

  try {
    console.log('🔄 Running timestamp migration...\n');

    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, 'fix-timestamps.sql'),
      'utf8'
    );

    // Execute the migration
    const result = await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    if (result && result.rows && result.rows.length > 0) {
      console.log('\nResult:', result.rows[result.rows.length - 1]);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
