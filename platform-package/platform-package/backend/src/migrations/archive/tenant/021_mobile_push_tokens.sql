-- Migration 021: Mobile push notification tokens
-- Stores FCM (Android) and APNs (iOS) device tokens per user

CREATE TABLE IF NOT EXISTS mobile_push_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  token         TEXT NOT NULL,
  platform      VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_label  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)   -- one active token per user per platform
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON mobile_push_tokens (user_id);
