-- Migration 074: Platform Configuration Table (public schema)
-- Stores tunable platform-wide constants that were previously hardcoded:
-- backpressure limits, cache TTLs, DLQ settings, WebSocket config.

CREATE TABLE IF NOT EXISTS platform_config (
  config_key    TEXT PRIMARY KEY,
  config_value  JSONB NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_config (config_key, config_value, description) VALUES
  ('event_bus.max_in_flight',          '200',     'Global event backpressure limit'),
  ('event_bus.per_tenant_max_per_second', '50',   'Per-tenant events/sec rate limit'),
  ('cache.descriptor_ttl_ms',          '300000',  'Module descriptor cache TTL (ms)'),
  ('cache.widget_ttl_ms',              '60000',   'Dashboard widget cache TTL (ms)'),
  ('cache.allowlist_ttl_ms',           '300000',  'Module allowlist cache TTL (ms)'),
  ('dlq.max_retries',                  '3',       'Dead letter queue max retry count'),
  ('websocket.max_missed_events',      '100',     'Missed event queue limit per user')
ON CONFLICT (config_key) DO NOTHING;
