-- Phase 4: Webhook endpoint management for tenant integration automation
-- Each tenant can configure outbound webhook endpoints to receive GRC events

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  webhook_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url              TEXT NOT NULL,
  event_types      JSONB NOT NULL DEFAULT '[]',
  secret_hash      TEXT,
  secret_masked    TEXT,
  active           BOOLEAN NOT NULL DEFAULT true,
  failure_count    INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_failure_at  TIMESTAMPTZ,
  created_by       UUID REFERENCES users(user_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active
  ON webhook_endpoints (active) WHERE deleted_at IS NULL;
