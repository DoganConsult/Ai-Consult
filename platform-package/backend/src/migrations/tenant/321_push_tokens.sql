-- Tenant migration: Mobile Push Token Registration
-- Stores device push tokens (APNs/FCM) for native mobile push notifications
-- Used by the Capacitor mobile app to receive GRC alerts when the app is closed

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON push_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_push_tokens_platform
  ON push_tokens(platform);
