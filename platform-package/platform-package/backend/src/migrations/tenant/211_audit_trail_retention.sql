-- =====================================================
-- Migration 211: Audit trail archive table for retention
-- Same schema as audit_trail but without immutability triggers.
-- Old entries are copied here before being purged from
-- the main table during archival jobs.
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_trail_archive (
  entry_id    UUID PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  module      VARCHAR(50) NOT NULL,
  action      VARCHAR(20) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   VARCHAR(100) NOT NULL DEFAULT '',
  before_state JSONB,
  after_state  JSONB,
  ip_address  INET,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_hash  VARCHAR(64),
  previous_hash VARCHAR(64),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_archive_timestamp ON audit_trail_archive (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_archive_module ON audit_trail_archive (module);
