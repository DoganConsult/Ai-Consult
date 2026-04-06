-- Migration 142: AI Asset Inventory — Governance Catalog
-- Logical governed assets (not version rows).
--
-- Physical storage: tenant-local (lives in each tenant schema).
-- Logical scope: scope_type='global' = platform-defined asset
--   seeded/replicated into each tenant schema.
--   scope_type='tenant' = tenant-created/modified asset.
--
-- Specialized version/config tables (agent_prompt_versions,
-- agent_model_config) remain as detailed runtime stores.
-- This table is the governance overlay / catalog anchor.

CREATE TABLE IF NOT EXISTS ai_asset_inventory (
  asset_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  asset_type        TEXT NOT NULL CHECK (asset_type IN ('agent','model','prompt','tool','provider','workflow','binding')),
  asset_key         TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  description       TEXT,

  -- Scope (physically tenant-local; logically global or tenant)
  scope_type        TEXT NOT NULL DEFAULT 'tenant' CHECK (scope_type IN ('global','tenant')),
  tenant_id         TEXT NOT NULL,

  -- Governance lifecycle
  lifecycle_status  TEXT NOT NULL DEFAULT 'draft' CHECK (lifecycle_status IN ('draft','review','approved','active','deprecated','archived')),
  status            TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','disabled','suspended')),

  -- Ownership / accountability
  business_owner    TEXT,
  technical_owner   TEXT,
  governance_owner  TEXT,

  -- Provenance
  source_type       TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('seeded','discovered','manual','system')),
  source_ref        TEXT,

  -- Metadata (extensible without schema changes)
  metadata          JSONB NOT NULL DEFAULT '{}',
  tags              TEXT[] NOT NULL DEFAULT '{}',

  -- Audit
  created_by        TEXT NOT NULL DEFAULT 'system',
  updated_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Canonical uniqueness: one logical asset per scope+type+key within a tenant
  CONSTRAINT uq_ai_asset_scope UNIQUE (scope_type, asset_type, asset_key, tenant_id)
);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_ai_asset_type ON ai_asset_inventory(asset_type);
CREATE INDEX IF NOT EXISTS idx_ai_asset_lifecycle ON ai_asset_inventory(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_ai_asset_scope ON ai_asset_inventory(scope_type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_asset_key ON ai_asset_inventory(asset_key);
CREATE INDEX IF NOT EXISTS idx_ai_asset_owner ON ai_asset_inventory(business_owner);
CREATE INDEX IF NOT EXISTS idx_ai_asset_tags ON ai_asset_inventory USING GIN(tags);
