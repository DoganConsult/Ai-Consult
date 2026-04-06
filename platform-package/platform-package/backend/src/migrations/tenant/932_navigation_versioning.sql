-- ============================================
-- 904: Navigation Versioning & Enterprise Schema
-- Adds versioning, lifecycle status, section
-- classification, and version history table
-- to navigation_registry per Patch 10 §2.5
-- ============================================

-- Add versioning and lifecycle columns to navigation_registry
ALTER TABLE navigation_registry
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by TEXT,
  ADD COLUMN IF NOT EXISTS permission_code TEXT,
  ADD COLUMN IF NOT EXISTS product_key TEXT;

-- Add check constraints for valid enum values
DO $$ BEGIN
  ALTER TABLE navigation_registry
    ADD CONSTRAINT chk_nav_status CHECK (status IN ('draft','in_review','approved','published','suspended','archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE navigation_registry
    ADD CONSTRAINT chk_nav_section CHECK (section IN ('primary','secondary','utility'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE navigation_registry
    ADD CONSTRAINT chk_nav_item_type CHECK (item_type IN ('link','group','divider'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for status-filtered queries (composition engine hot path)
CREATE INDEX IF NOT EXISTS idx_nav_registry_status ON navigation_registry (status) WHERE is_active = true;

-- Index for product-scoped queries
CREATE INDEX IF NOT EXISTS idx_nav_registry_product ON navigation_registry (product_key) WHERE product_key IS NOT NULL;

-- Index for section-based queries
CREATE INDEX IF NOT EXISTS idx_nav_registry_section ON navigation_registry (section);

-- Navigation version history — stores snapshots for rollback and audit
CREATE TABLE IF NOT EXISTS navigation_version_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_nav_version UNIQUE (nav_key, version)
);

CREATE INDEX IF NOT EXISTS idx_nav_version_history_key ON navigation_version_history (nav_key);
CREATE INDEX IF NOT EXISTS idx_nav_version_history_actor ON navigation_version_history (actor_id);
CREATE INDEX IF NOT EXISTS idx_nav_version_history_created ON navigation_version_history (created_at DESC);

-- Navigation audit log — domain-specific audit (supplements generic audit_trail)
CREATE TABLE IF NOT EXISTS navigation_audit_log (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nav_audit_tenant ON navigation_audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_nav_audit_entity ON navigation_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_nav_audit_created ON navigation_audit_log (created_at DESC);

-- Backfill existing published entries with published_at
UPDATE navigation_registry
  SET published_at = updated_at,
      published_by = 'system'
  WHERE status = 'published' AND published_at IS NULL;
