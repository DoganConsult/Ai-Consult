-- Migration 111: AI Layer Enhancements (E1-E20)
-- Per-agent model routing, token tracking, prompt versioning,
-- LLM tracing, eval scores, budget caps, canary deployments,
-- cycle memory, prompt injection log

-- E1+E10: Per-agent model routing config
CREATE TABLE IF NOT EXISTS agent_model_config (
  agent_id        TEXT PRIMARY KEY,
  preferred_model TEXT NOT NULL DEFAULT 'auto',
  preferred_provider TEXT NOT NULL DEFAULT 'auto',
  max_tokens      INT NOT NULL DEFAULT 4096,
  temperature     REAL NOT NULL DEFAULT 0.3,
  complexity_tier TEXT NOT NULL DEFAULT 'medium' CHECK (complexity_tier IN ('low','medium','high','critical')),
  fallback_model  TEXT,
  fallback_provider TEXT,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E2: Persistent LLM usage/cost tracking
CREATE TABLE IF NOT EXISTS llm_usage_log (
  usage_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  user_id         TEXT,
  agent_id        TEXT,
  run_id          TEXT,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  input_tokens    INT NOT NULL DEFAULT 0,
  output_tokens   INT NOT NULL DEFAULT 0,
  total_tokens    INT NOT NULL DEFAULT 0,
  cost_usd        REAL NOT NULL DEFAULT 0,
  latency_ms      INT NOT NULL DEFAULT 0,
  cache_hit       BOOLEAN NOT NULL DEFAULT FALSE,
  endpoint_type   TEXT DEFAULT 'chat',
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_usage_tenant ON llm_usage_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_agent ON llm_usage_log(agent_id, created_at DESC);

-- E3+E20: Prompt versioning + canary deployments
CREATE TABLE IF NOT EXISTS agent_prompt_versions (
  prompt_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        TEXT NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  system_prompt   TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  is_canary       BOOLEAN NOT NULL DEFAULT FALSE,
  canary_pct      INT NOT NULL DEFAULT 0,
  eval_score_avg  REAL,
  auto_promoted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      TEXT NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, version)
);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON agent_prompt_versions(agent_id, is_active);

-- E6: LLM observability traces
CREATE TABLE IF NOT EXISTS llm_traces (
  trace_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          TEXT,
  span_id         TEXT,
  parent_span_id  TEXT,
  agent_id        TEXT,
  tenant_id       TEXT NOT NULL,
  user_id         TEXT,
  operation       TEXT NOT NULL DEFAULT 'chat',
  provider        TEXT,
  model           TEXT,
  input_preview   TEXT,
  output_preview  TEXT,
  input_tokens    INT DEFAULT 0,
  output_tokens   INT DEFAULT 0,
  latency_ms      INT DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error','timeout','circuit_break')),
  error_message   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  prompt_version  INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_traces_tenant ON llm_traces(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_traces_run ON llm_traces(run_id);

-- E11: Agent eval scores
CREATE TABLE IF NOT EXISTS agent_eval_scores (
  eval_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  run_id          TEXT,
  eval_type       TEXT NOT NULL DEFAULT 'quality' CHECK (eval_type IN ('quality','relevance','accuracy','hallucination','safety')),
  score           REAL NOT NULL CHECK (score >= 0 AND score <= 1),
  judge_model     TEXT,
  sample_input    TEXT,
  sample_output   TEXT,
  reasoning       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eval_scores_agent ON agent_eval_scores(agent_id, created_at DESC);

-- E12: Prompt injection log
CREATE TABLE IF NOT EXISTS prompt_injection_log (
  log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  user_id         TEXT,
  agent_id        TEXT,
  input_preview   TEXT NOT NULL,
  detection_type  TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  blocked         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E14: Tenant-level LLM budget caps
CREATE TABLE IF NOT EXISTS tenant_llm_budgets (
  tenant_id           TEXT PRIMARY KEY,
  monthly_token_limit BIGINT NOT NULL DEFAULT 10000000,
  monthly_cost_limit  REAL NOT NULL DEFAULT 100.0,
  tokens_used_month   BIGINT NOT NULL DEFAULT 0,
  cost_used_month     REAL NOT NULL DEFAULT 0,
  budget_reset_at     TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  soft_limit_pct      INT NOT NULL DEFAULT 80,
  hard_limit_action   TEXT NOT NULL DEFAULT 'throttle' CHECK (hard_limit_action IN ('throttle','block','notify')),
  notified_soft       BOOLEAN NOT NULL DEFAULT FALSE,
  notified_hard       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E17: Multi-agent conversation/cycle memory
CREATE TABLE IF NOT EXISTS agent_cycle_memory (
  cycle_memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  cycle_id        TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  memory_type     TEXT NOT NULL DEFAULT 'cycle_finding',
  content         TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cycle_memory_tenant ON agent_cycle_memory(tenant_id, cycle_id);

-- Seed default agent model configs (E1)
INSERT INTO agent_model_config (agent_id, preferred_model, preferred_provider, complexity_tier, temperature) VALUES
  ('A01', 'auto', 'auto', 'medium', 0.3),
  ('A02', 'auto', 'auto', 'medium', 0.2),
  ('A03', 'auto', 'auto', 'high', 0.2),
  ('A04', 'claude-sonnet-4-20250514', 'claude', 'critical', 0.4),
  ('A05', 'auto', 'auto', 'medium', 0.2),
  ('A06', 'claude-sonnet-4-20250514', 'claude', 'high', 0.3),
  ('A07', 'claude-sonnet-4-20250514', 'claude', 'high', 0.3),
  ('A08', 'claude-sonnet-4-20250514', 'claude', 'critical', 0.4),
  ('A09', 'auto', 'auto', 'medium', 0.2),
  ('A10', 'auto', 'auto', 'low', 0.2)
ON CONFLICT (agent_id) DO NOTHING;
