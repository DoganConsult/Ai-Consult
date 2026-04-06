-- AI Tool Registry — governed tool/function registration
-- GPOC §11.3: Every function or tool must declare owner scope,
-- allowed callers, execution mode, input/output schemas,
-- approval state, and observability expectations.
--
-- Completes the 4-table AI registry set:
--   ai_provider_registry (migration 323)
--   ai_model_registry    (migration 143)
--   ai_agent_registry    (migration 159)
--   ai_tool_registry     (this migration)

CREATE TABLE IF NOT EXISTS ai_tool_registry (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_code         VARCHAR(128) UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  description       TEXT,

  -- Ownership
  owner_scope       TEXT NOT NULL CHECK (owner_scope IN (
    'platform', 'product', 'module', 'tenant'
  )),
  product_code      VARCHAR(64),
  module_code       VARCHAR(64),

  -- Execution
  execution_mode    TEXT NOT NULL DEFAULT 'sync' CHECK (execution_mode IN (
    'sync', 'async', 'streaming', 'background'
  )),
  authentication_mode TEXT NOT NULL DEFAULT 'service' CHECK (authentication_mode IN (
    'none', 'service', 'user', 'agent', 'delegated'
  )),

  -- Allowed callers (JSONB array of caller identifiers)
  allowed_callers   JSONB NOT NULL DEFAULT '["*"]'::jsonb,

  -- Allowed runtimes (JSONB array: e.g. ["api","agent","workflow"])
  allowed_runtimes  JSONB NOT NULL DEFAULT '["api"]'::jsonb,

  -- Approval lifecycle
  approval_state    TEXT NOT NULL DEFAULT 'draft' CHECK (approval_state IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'deprecated'
  )),

  -- Contracts
  input_schema      JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Side effects declaration (GPOC §11.5)
  side_effects      JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Observability
  observability     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  created_by        TEXT NOT NULL DEFAULT 'system',
  updated_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tool_registry_owner
  ON ai_tool_registry (owner_scope);
CREATE INDEX IF NOT EXISTS idx_tool_registry_product
  ON ai_tool_registry (product_code);
CREATE INDEX IF NOT EXISTS idx_tool_registry_module
  ON ai_tool_registry (module_code);
CREATE INDEX IF NOT EXISTS idx_tool_registry_approval
  ON ai_tool_registry (approval_state);
CREATE INDEX IF NOT EXISTS idx_tool_registry_execution
  ON ai_tool_registry (execution_mode);
CREATE INDEX IF NOT EXISTS idx_tool_registry_created
  ON ai_tool_registry (created_at DESC);
