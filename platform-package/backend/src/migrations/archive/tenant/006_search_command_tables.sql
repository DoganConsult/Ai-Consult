-- Tenant migration: Search and Command tables
-- Creates recent_searches, saved_searches, command_history, and user_favorites tables
-- Supports global search history, saved searches, command palette usage tracking, and user favorites
-- Requirements: 3.5, 6.3, 6.8

DO $$
BEGIN

-- Recent Searches Table (Requirement 3.5)
-- Stores user's recent search queries for quick access
-- Ordered by searched_at descending to show most recent first
CREATE TABLE IF NOT EXISTS recent_searches (
  search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query VARCHAR(500) NOT NULL,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user recent searches lookup (Requirement 3.5)
-- Supports efficient retrieval of recent searches ordered by time
CREATE INDEX IF NOT EXISTS idx_recent_searches_user 
  ON recent_searches(user_id, searched_at DESC);

-- Saved Searches Table (Requirement 3.5)
-- Stores user's saved search queries with optional filters
-- Allows users to save frequently used searches for quick access
CREATE TABLE IF NOT EXISTS saved_searches (
  search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  query VARCHAR(500) NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user saved searches lookup (Requirement 3.5)
-- Supports efficient retrieval of all saved searches for a user
CREATE INDEX IF NOT EXISTS idx_saved_searches_user 
  ON saved_searches(user_id);

-- Command History Table (Requirement 6.8)
-- Tracks command usage frequency for prioritization in command palette
-- Stores usage count and last used timestamp per user/command combination
CREATE TABLE IF NOT EXISTS command_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  command_id VARCHAR(100) NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint ensures one record per user/command combination
  -- Allows incrementing usage_count on repeated use
  UNIQUE(user_id, command_id)
);

-- Index for user command history lookup (Requirement 6.8)
-- Supports efficient retrieval of commands ordered by usage frequency
CREATE INDEX IF NOT EXISTS idx_command_history_user 
  ON command_history(user_id, usage_count DESC);

-- User Favorites Table (Requirement 6.3)
-- Stores user's favorite items (commands, entities, searches)
-- Supports quick access to frequently used items in command palette
CREATE TABLE IF NOT EXISTS user_favorites (
  favorite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- 'command', 'entity', 'search'
  item_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint prevents duplicate favorites
  -- Each user can only favorite an item once
  UNIQUE(user_id, item_type, item_id)
);

-- Index for user favorites lookup (Requirement 6.3)
-- Supports efficient retrieval of favorites filtered by type
CREATE INDEX IF NOT EXISTS idx_user_favorites_user 
  ON user_favorites(user_id, item_type);

END $$;
