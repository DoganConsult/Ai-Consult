-- Migration 162: AI Binding Governance — Agent-Tool Bindings + Tenant AI Allowlist
--
-- ai_agent_tool_bindings: governs which tool assets are allowed for which agent assets per tenant.
-- tenant_ai_allowlist: governs which provider/model combinations are allowed per tenant.
--
-- Workflow-agent bindings are deferred — no concrete workflow registry exists yet,
-- and adding speculative FK targets would create schema debt.

-- ============================================================
-- 1. ai_agent_tool_bindings
-- ============================================================
-- Governs which tool assets an agent asset is allowed to use.
-- Each row binds one agent asset to one tool asset within a tenant.
-- Duplicates are prevented by a unique constraint on (agent_asset_id, tool_asset_id).

CREATE TABLE IF NOT EXISTS ai_agent_tool_bindings (
  binding_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_asset_id     UUID NOT NULL
                     REFERENCES ai_asset_inventory(asset_id)
                     ON DELETE CASCADE,

  tool_asset_id      UUID NOT NULL
                     REFERENCES ai_asset_inventory(asset_id)
                     ON DELETE CASCADE,

  tenant_id          TEXT NOT NULL,

  is_enabled         BOOLEAN NOT NULL DEFAULT TRUE,

  notes              TEXT,

  created_by         TEXT NOT NULL DEFAULT 'system',
  updated_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_agent_tool_binding UNIQUE (agent_asset_id, tool_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_binding_agent
  ON ai_agent_tool_bindings (agent_asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_binding_tool
  ON ai_agent_tool_bindings (tool_asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_binding_tenant
  ON ai_agent_tool_bindings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_binding_enabled
  ON ai_agent_tool_bindings (agent_asset_id)
  WHERE is_enabled = TRUE;

-- ============================================================
-- 2. tenant_ai_allowlist
-- ============================================================
-- Governs which provider/model combinations a tenant is allowed to use.
-- Each row represents one allowed provider+model pair.
-- Duplicates are prevented by a unique constraint on (tenant_id, provider, model_id).

CREATE TABLE IF NOT EXISTS tenant_ai_allowlist (
  allowlist_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id          TEXT NOT NULL,

  provider           TEXT NOT NULL,
  model_id           TEXT NOT NULL,

  is_enabled         BOOLEAN NOT NULL DEFAULT TRUE,

  max_tokens_limit   INT,
  temperature_limit  NUMERIC(3,2),

  notes              TEXT,

  created_by         TEXT NOT NULL DEFAULT 'system',
  updated_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_tenant_allowlist_entry UNIQUE (tenant_id, provider, model_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_allowlist_tenant
  ON tenant_ai_allowlist (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_allowlist_provider
  ON tenant_ai_allowlist (provider);
CREATE INDEX IF NOT EXISTS idx_tenant_allowlist_enabled
  ON tenant_ai_allowlist (tenant_id)
  WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenant_allowlist_provider_model
  ON tenant_ai_allowlist (tenant_id, provider, model_id);
