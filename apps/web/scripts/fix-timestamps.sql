-- Fix timestamp columns to use TIMESTAMPTZ (timestamp with timezone)
-- This will properly handle timezone conversions

-- Step 1: Convert conversations table timestamps
ALTER TABLE conversations 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Australia/Sydney',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Australia/Sydney';

-- Step 2: Convert messages table timestamps  
ALTER TABLE messages
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Australia/Sydney';

-- Step 3: Convert profiles table timestamps
ALTER TABLE profiles
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Australia/Sydney',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Australia/Sydney',
  ALTER COLUMN last_seen TYPE TIMESTAMPTZ USING last_seen AT TIME ZONE 'Australia/Sydney';

-- Step 4: Convert sessions table timestamps (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    EXECUTE '
      ALTER TABLE sessions
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''Australia/Sydney'',
        ALTER COLUMN last_seen TYPE TIMESTAMPTZ USING last_seen AT TIME ZONE ''Australia/Sydney''
    ';
  END IF;
END $$;

-- Step 5: Update default timezone for new connections (optional)
-- Set this in your .env: DATABASE_URL should include timezone parameter
-- Or run this at connection time: SET TIMEZONE='UTC'

SELECT 'Timestamp migration completed successfully!' as status;
