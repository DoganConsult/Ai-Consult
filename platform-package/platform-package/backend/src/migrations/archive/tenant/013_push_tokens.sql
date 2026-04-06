-- Tenant migration: Mobile Push Token Registration
-- Stores device push tokens (APNs/FCM) for native mobile push notifications
-- Used by the Capacitor mobile app to receive GRC alerts when the app is closed

DO $
BEGIN

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One token per user per platform (handles device replacement)
  UNIQUE(user_id, platform)
);

-- Index for looking up tokens by user (send push to specific user)
CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON push_tokens(user_id);

-- Index for platform-specific batch sends
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform
  ON push_tokens(platform);

END $;
