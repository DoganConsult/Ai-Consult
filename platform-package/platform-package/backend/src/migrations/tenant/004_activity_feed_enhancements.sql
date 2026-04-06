-- Tenant migration: Activity Feed table with enhancements
-- Creates the activity_feed table for unified activity and notification hub
-- Includes read, archived, snoozed_until columns for activity management
-- Includes user_name column for denormalized display
-- Requirements: 2.1, 2.5

DO $$
BEGIN

-- Activity Feed Table (enhanced)
-- Aggregates events from all GRC modules with filtering and inline actions
CREATE TABLE IF NOT EXISTS activity_feed (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  entity_title VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user activity feed queries with timestamp ordering (Requirement 2.1)
-- Supports efficient retrieval of user's activity feed sorted by most recent
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id, created_at DESC);

-- Index for entity-based activity lookups (Requirement 2.1)
-- Supports finding all activities related to a specific entity
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON activity_feed(entity_type, entity_id);

-- Index for module-based filtering with timestamp ordering (Requirement 2.1)
-- Supports filtering activities by module (risks, controls, policies, etc.)
CREATE INDEX IF NOT EXISTS idx_activity_feed_module ON activity_feed(module, created_at DESC);

-- Index for read status filtering (Requirement 2.5)
-- Supports efficient queries for unread activities
CREATE INDEX IF NOT EXISTS idx_activity_feed_read ON activity_feed(user_id, read) WHERE read = FALSE;

-- Index for archived status filtering (Requirement 2.5)
-- Supports efficient queries for non-archived activities
CREATE INDEX IF NOT EXISTS idx_activity_feed_archived ON activity_feed(user_id, archived) WHERE archived = FALSE;

-- Index for snoozed activities (Requirement 2.5)
-- Supports efficient queries for activities that need to be un-snoozed
CREATE INDEX IF NOT EXISTS idx_activity_feed_snoozed ON activity_feed(snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Index for action type filtering
-- Supports filtering by action type (created, updated, deleted, etc.)
CREATE INDEX IF NOT EXISTS idx_activity_feed_action ON activity_feed(action, created_at DESC);

END $$;
