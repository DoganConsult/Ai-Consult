-- =====================================================
-- Migration 130: Create audit_trail table
-- Canonical schema: database.ts (UUID PK).
-- This migration is a safe no-op for fresh tenants because
-- database.ts runs first and creates the table with UUID PK.
-- For existing tenants where this already ran, table already
-- exists and CREATE TABLE IF NOT EXISTS is a no-op.
-- PK aligned to UUID to match database.ts canonical definition.
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_trail (
  entry_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(64) NOT NULL,
  module      VARCHAR(50) NOT NULL,
  action      VARCHAR(20) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   VARCHAR(100) NOT NULL DEFAULT '',
  before_state JSONB,
  after_state  JSONB,
  ip_address  INET,
  timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_module    ON audit_trail (module);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user      ON audit_trail (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity    ON audit_trail (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action    ON audit_trail (action);

-- Ensure controls.effectiveness column exists for residual score computation
ALTER TABLE controls ADD COLUMN IF NOT EXISTS effectiveness INTEGER DEFAULT 0;
