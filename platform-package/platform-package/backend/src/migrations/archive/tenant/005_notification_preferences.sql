-- Tenant migration: Notification Preferences table
-- Creates the notification_preferences table for user-configurable notification settings
-- Includes unique constraint on user_id, activity_type, and module combination
-- Requirements: 2.6

DO $$
BEGIN

-- Notification Preferences Table
-- Stores user-configurable settings for activity type notifications
-- Users can enable/disable notifications per activity type and module
-- Supports multiple notification channels (in_app, email, push)
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  channels TEXT[] DEFAULT ARRAY['in_app'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint on user_id, activity_type, and module (Requirement 2.6)
  -- Ensures each user has only one preference setting per activity type per module
  UNIQUE(user_id, activity_type, module)
);

-- Index for user preference lookups (Requirement 2.6)
-- Supports efficient retrieval of all notification preferences for a user
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user 
  ON notification_preferences(user_id);

-- Index for activity type lookups
-- Supports finding all users with preferences for a specific activity type
CREATE INDEX IF NOT EXISTS idx_notification_preferences_activity_type 
  ON notification_preferences(activity_type);

-- Index for module-based lookups
-- Supports finding all preferences for a specific module
CREATE INDEX IF NOT EXISTS idx_notification_preferences_module 
  ON notification_preferences(module);

-- Index for enabled preferences
-- Supports efficient queries for enabled notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled 
  ON notification_preferences(user_id, enabled) WHERE enabled = TRUE;

END $$;
