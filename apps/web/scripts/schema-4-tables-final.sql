-- Final 4-Table Schema with Anonymous User Support
-- Best practice: Create profile immediately, upgrade later

-- Drop existing tables
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: PROFILES (Bill + All Visitors)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('owner', 'visitor')),
  status VARCHAR(20) NOT NULL DEFAULT 'anonymous' CHECK (status IN ('anonymous', 'identified', 'registered')),
  
  -- Core fields
  name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
  email VARCHAR(255) UNIQUE,
  
  -- Everything else in JSONB
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_type ON profiles(type);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_last_seen ON profiles(last_seen DESC);
CREATE INDEX idx_profiles_data ON profiles USING GIN(data);

-- ============================================================================
-- TABLE 2: SESSIONS (Links devices/browsers to profiles)
-- ============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session data with IP, fingerprint, device info
  data JSONB NOT NULL DEFAULT '{
    "ip": "",
    "fingerprint": "",
    "user_agent": "",
    "location": {},
    "device": {},
    "page_views": [],
    "interactions": []
  }'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX idx_sessions_ip ON sessions ((data->>'ip'));
CREATE INDEX idx_sessions_fingerprint ON sessions ((data->>'fingerprint'));
CREATE INDEX idx_sessions_last_seen ON sessions(last_seen DESC);

-- ============================================================================
-- TABLE 3: CONVERSATIONS (Chat threads)
-- ============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  title VARCHAR(500) NOT NULL DEFAULT 'New chat',
  data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_profile_id ON conversations(profile_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- ============================================================================
-- TABLE 4: MESSAGES (Individual chat messages)
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to merge profiles (when duplicate detected)
CREATE OR REPLACE FUNCTION merge_profiles(
  keep_profile_id UUID,
  merge_profile_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Move sessions
  UPDATE sessions SET profile_id = keep_profile_id WHERE profile_id = merge_profile_id;
  
  -- Move conversations
  UPDATE conversations SET profile_id = keep_profile_id WHERE profile_id = merge_profile_id;
  
  -- Merge data (keep_profile wins, merge_profile fills gaps)
  UPDATE profiles
  SET data = profiles.data || (
    SELECT data FROM profiles WHERE id = merge_profile_id
  )
  WHERE id = keep_profile_id;
  
  -- Delete merged profile
  DELETE FROM profiles WHERE id = merge_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 4 Tables:
-- 1. profiles - Bill + all visitors (anonymous or identified)
-- 2. sessions - Links devices/browsers to profiles
-- 3. conversations - Chat threads
-- 4. messages - Individual messages
--
-- Profile Status Flow:
-- anonymous → identified → registered
--
-- Best Practices:
-- - Create profile immediately on first visit
-- - Use multi-signal matching (session_id, fingerprint, IP)
-- - Upgrade anonymous → identified when user shares name
-- - Merge profiles if duplicate detected
-- ============================================================================
