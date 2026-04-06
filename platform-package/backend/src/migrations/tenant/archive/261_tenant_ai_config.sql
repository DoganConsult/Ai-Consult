-- AGRC-OS Tenant Migration 183
-- Tenant AI Configuration — per-tenant AI OS settings
-- Stores autonomy level, operation mode, concurrency limits, and custom AI settings.
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_ai_config (
  tenant_id             VARCHAR(64) PRIMARY KEY,
  autonomy_level        VARCHAR(10) NOT NULL DEFAULT 'L1'
    CHECK (autonomy_level IN ('L0', 'L1', 'L2', 'L3')),
  operation_mode        VARCHAR(30) NOT NULL DEFAULT 'hybrid'
    CHECK (operation_mode IN ('human', 'hybrid', 'shadow_agent', 'full_autonomous')),
  max_concurrent_llm    INT NOT NULL DEFAULT 5,
  monthly_token_budget  BIGINT DEFAULT NULL,
  monthly_cost_budget   NUMERIC(10,2) DEFAULT NULL,
  settings              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
