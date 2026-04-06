-- AI Model Registry — versioned model governance
-- Specialized version-level registry on top of ai_asset_inventory.
--
-- Each row = one version of a logical model asset.
-- The parent ai_asset_inventory row (asset_type='model') is the catalog anchor.
-- This table tracks: version lifecycle, approval, activation, rollback lineage,
-- runtime config, and ownership/accountability per version.

CREATE TABLE IF NOT EXISTS ai_model_registry (
  model_version_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to logical model asset
  asset_id               UUID NOT NULL
                         REFERENCES ai_asset_inventory(asset_id)
                         ON DELETE RESTRICT,

  -- Version identity
  version_number         INT NOT NULL CHECK (version_number > 0),

  -- Provider + runtime model identifier
  provider               TEXT NOT NULL,
  provider_model_id      TEXT NOT NULL,

  -- Runtime configuration (temperature, max_tokens, top_p, etc.)
  config                 JSONB NOT NULL DEFAULT '{}',

  -- Version-level approval workflow
  approval_status        TEXT NOT NULL DEFAULT 'draft'
                         CHECK (approval_status IN (
                           'draft',
                           'pending_approval',
                           'approved',
                           'rejected'
                         )),
  submitted_by           TEXT,
  submitted_at           TIMESTAMPTZ,
  approved_by            TEXT,
  approved_at            TIMESTAMPTZ,

  -- Activation (only one active version per logical model asset)
  is_active              BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rollback lineage
  rollback_from_version_id UUID
                         REFERENCES ai_model_registry(model_version_id)
                         ON DELETE SET NULL,

  -- Change documentation
  change_summary         TEXT,
  notes                  TEXT,

  -- Audit
  created_by             TEXT NOT NULL DEFAULT 'system',
  updated_by             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique version number per logical model asset
  CONSTRAINT uq_model_version UNIQUE (asset_id, version_number)
);

-- Only one active version per logical model asset (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_registry_active
  ON ai_model_registry (asset_id)
  WHERE is_active = TRUE;

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_model_registry_asset
  ON ai_model_registry (asset_id);
CREATE INDEX IF NOT EXISTS idx_model_registry_approval
  ON ai_model_registry (approval_status);
CREATE INDEX IF NOT EXISTS idx_model_registry_provider
  ON ai_model_registry (provider);
CREATE INDEX IF NOT EXISTS idx_model_registry_created
  ON ai_model_registry (created_at DESC);
