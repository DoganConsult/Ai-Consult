-- AI Agent Registry — versioned agent governance
-- Specialized version-level registry on top of ai_asset_inventory.
--
-- Each row = one version of a logical agent asset.
-- The parent ai_asset_inventory row (asset_type='agent') is the catalog anchor.
-- This table tracks: version lifecycle, approval, activation, rollback lineage,
-- agent config, capabilities, linked prompt/model assets, and diff/change tracking.

CREATE TABLE IF NOT EXISTS ai_agent_registry (
  agent_version_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to logical agent asset
  asset_id               UUID NOT NULL
                         REFERENCES ai_asset_inventory(asset_id)
                         ON DELETE RESTRICT,

  -- Version identity
  version_number         INT NOT NULL CHECK (version_number > 0),

  -- Agent configuration (system prompt ref, tool bindings, routing rules, etc.)
  agent_config           JSONB NOT NULL,

  -- Optional link to a governed prompt asset this agent uses
  linked_prompt_asset_id UUID
                         REFERENCES ai_asset_inventory(asset_id)
                         ON DELETE SET NULL,

  -- Optional link to a governed model asset this agent uses
  linked_model_asset_id  UUID
                         REFERENCES ai_asset_inventory(asset_id)
                         ON DELETE SET NULL,

  -- Agent capabilities (array of capability descriptors)
  capabilities           JSONB NOT NULL DEFAULT '[]',

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

  -- Activation (only one active version per logical agent asset)
  is_active              BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rollback lineage
  rollback_from_version_id UUID
                         REFERENCES ai_agent_registry(agent_version_id)
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

  -- Unique version number per logical agent asset
  CONSTRAINT uq_agent_version UNIQUE (asset_id, version_number)
);

-- Only one active version per logical agent asset (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_registry_active
  ON ai_agent_registry (asset_id)
  WHERE is_active = TRUE;

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_agent_registry_asset
  ON ai_agent_registry (asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_approval
  ON ai_agent_registry (approval_status);
CREATE INDEX IF NOT EXISTS idx_agent_registry_deployment
  ON ai_agent_registry (deployment_status);
CREATE INDEX IF NOT EXISTS idx_agent_registry_linked_prompt
  ON ai_agent_registry (linked_prompt_asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_linked_model
  ON ai_agent_registry (linked_model_asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_created
  ON ai_agent_registry (created_at DESC);
