-- Enterprise Hardening: Tenant quota tracking
-- Stores per-tenant AI usage limits to prevent runaway costs
CREATE TABLE IF NOT EXISTS tenant_quota_config (
  tenant_id VARCHAR(100) PRIMARY KEY,
  daily_token_limit INTEGER DEFAULT 500000,
  monthly_token_limit INTEGER DEFAULT 10000000,
  max_agent_runs_per_hour INTEGER DEFAULT 120,
  max_concurrent_runs INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
