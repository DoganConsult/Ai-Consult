-- AI Prompt Registry — versioned prompt governance
-- Specialized version-level registry on top of ai_asset_inventory.
--
-- Each row = one version of a logical prompt asset.
-- The parent ai_asset_inventory row (asset_type='prompt') is the catalog anchor.
-- This table tracks: version lifecycle, approval, activation, rollback lineage,
-- template content, variable slots, linked model asset, and diff/change tracking.

CREATE TABLE IF NOT EXISTS ai_prompt_registry (
  prompt_version_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to logical prompt asset
  asset_id               UUID NOT NULL
                         REFERENCES ai_asset_inventory(asset_id)
                         ON DELETE RESTRICT,

  -- Version identity
  version_number         INT NOT NULL CHECK (version_number > 0),

  -- Prompt template body
  template_text          TEXT NOT NULL,

  -- Variable/slot definitions (array of {name, type, required, default})
  variables              JSONB NOT NULL DEFAULT '[]',

  -- Optional link to a governed model asset this prompt is designed for
  linked_model_asset_id  UUID
                         REFERENCES ai_asset_inventory(asset_id)
                         ON DELETE SET NULL,

  -- Version-level approval workflow
  approval_status        TEXT NOT NULL DEFAULT 'draft'
                         CHECK (approval_status IN (
                           'draft',
                           'pending_approval',
                           'approved',
                           'rejected'
                         )),

  -- Deployment lifecycle (separate from approval)
  deployment_status      TEXT NOT NULL DEFAULT 'inactive'
                         CHECK (deployment_status IN (
                           'inactive',
                           'active',
                           'suspended',
                           'retired'
                         )),

  submitted_by           TEXT,
  submitted_at           TIMESTAMPTZ,
  approved_by            TEXT,
  approved_at            TIMESTAMPTZ,

  -- Activation (only one active version per logical prompt asset)
  is_active              BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rollback lineage
  rollback_from_version_id UUID
                         REFERENCES ai_prompt_registry(prompt_version_id)
                         ON DELETE SET NULL,

  -- Diff summary between this version and the previous
  diff_summary           TEXT,

  -- Change documentation
  change_summary         TEXT,
  notes                  TEXT,

  -- Audit
  created_by             TEXT NOT NULL DEFAULT 'system',
  updated_by             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique version number per logical prompt asset
  CONSTRAINT uq_prompt_version UNIQUE (asset_id, version_number)
);

-- Only one active version per logical prompt asset (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_registry_active
  ON ai_prompt_registry (asset_id)
  WHERE is_active = TRUE;

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_prompt_registry_asset
  ON ai_prompt_registry (asset_id);
CREATE INDEX IF NOT EXISTS idx_prompt_registry_approval
  ON ai_prompt_registry (approval_status);
CREATE INDEX IF NOT EXISTS idx_prompt_registry_deployment
  ON ai_prompt_registry (deployment_status);
CREATE INDEX IF NOT EXISTS idx_prompt_registry_linked_model
  ON ai_prompt_registry (linked_model_asset_id);
CREATE INDEX IF NOT EXISTS idx_prompt_registry_created
  ON ai_prompt_registry (created_at DESC);
