-- ============================================================
-- Migration 951: AI Module — Missing Tables (MP-03)
-- Owner: Module:AI / AI Layer
-- Tables: 16 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_agents (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code VARCHAR(100) NOT NULL UNIQUE, agent_name VARCHAR(500) NOT NULL,
  agent_type VARCHAR(50) DEFAULT 'assistant' CHECK (agent_type IN ('assistant','analyst','executor','monitor','orchestrator')),
  model_id VARCHAR(200), prompt_template_id UUID,
  capabilities JSONB DEFAULT '[]', autonomy_level VARCHAR(30) DEFAULT 'assisted',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_model_configs (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(100) NOT NULL, provider VARCHAR(100) NOT NULL,
  model_name VARCHAR(200) NOT NULL, version VARCHAR(50),
  parameters JSONB DEFAULT '{}', cost_per_1k_tokens NUMERIC(10,6),
  max_tokens INT DEFAULT 4096, temperature NUMERIC(3,2) DEFAULT 0.7,
  is_default BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) NOT NULL UNIQUE, template_name VARCHAR(500) NOT NULL,
  system_prompt TEXT, user_prompt_template TEXT,
  variables JSONB DEFAULT '[]', version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ai_context_sources (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(agent_id),
  source_type VARCHAR(50) CHECK (source_type IN ('database','document','api','knowledge_base','real_time','user_input')),
  source_config JSONB NOT NULL DEFAULT '{}', priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_autonomy_levels (
  level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(agent_id),
  module_code VARCHAR(100), action_type VARCHAR(100),
  autonomy VARCHAR(30) NOT NULL DEFAULT 'assisted' CHECK (autonomy IN ('manual','assisted','supervised','autonomous')),
  requires_approval BOOLEAN DEFAULT TRUE, max_actions_per_hour INT DEFAULT 10,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_boundaries (
  boundary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(agent_id),
  boundary_type VARCHAR(50) CHECK (boundary_type IN ('forbidden_action','data_access','cost_limit','scope_limit','time_limit')),
  boundary_rule JSONB NOT NULL DEFAULT '{}',
  enforcement VARCHAR(20) DEFAULT 'block' CHECK (enforcement IN ('block','warn','log')),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_budgets (
  budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(agent_id),
  period VARCHAR(30) DEFAULT 'monthly' CHECK (period IN ('daily','weekly','monthly','quarterly')),
  max_calls INT DEFAULT 1000, max_cost NUMERIC(10,2) DEFAULT 50.00,
  current_calls INT DEFAULT 0, current_cost NUMERIC(10,2) DEFAULT 0,
  period_start DATE, period_end DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_execution_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID, session_id UUID, step_id UUID,
  action_type VARCHAR(100), input JSONB DEFAULT '{}', output JSONB DEFAULT '{}',
  model_used VARCHAR(200), tokens_used INT, cost NUMERIC(10,6),
  latency_ms INT, status VARCHAR(30) DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_interventions (
  intervention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID, session_id UUID,
  intervention_type VARCHAR(50) CHECK (intervention_type IN ('override','correction','halt','redirect','approval','rejection')),
  reason TEXT NOT NULL, intervened_by VARCHAR(64) NOT NULL,
  original_action JSONB DEFAULT '{}', corrected_action JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100), entity_id UUID,
  agent_id UUID, note_type VARCHAR(50) DEFAULT 'insight',
  content TEXT NOT NULL, confidence NUMERIC(5,2),
  accepted BOOLEAN, accepted_by VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_drafts (
  draft_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100), entity_id UUID,
  agent_id UUID, draft_type VARCHAR(50) DEFAULT 'content',
  content TEXT NOT NULL, version INT DEFAULT 1,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','revised')),
  accepted_by VARCHAR(64), accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hitl_gates (
  gate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID, session_id UUID, step_id UUID,
  gate_type VARCHAR(50) DEFAULT 'approval' CHECK (gate_type IN ('approval','review','confirmation','escalation')),
  prompt TEXT NOT NULL, options JSONB DEFAULT '[]',
  decision VARCHAR(30), decided_by VARCHAR(64), decided_at TIMESTAMPTZ,
  timeout_hours INT DEFAULT 24, auto_action VARCHAR(30) DEFAULT 'escalate',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_tool_permissions (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL, tool_code VARCHAR(100) NOT NULL,
  permission_level VARCHAR(30) DEFAULT 'execute' CHECK (permission_level IN ('read','execute','full')),
  conditions JSONB DEFAULT '{}', granted_by VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, tool_code)
);

CREATE TABLE IF NOT EXISTS agent_discoveries (
  discovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID, session_id UUID,
  discovery_type VARCHAR(50) DEFAULT 'insight' CHECK (discovery_type IN ('insight','anomaly','pattern','risk','opportunity','correlation')),
  title VARCHAR(500) NOT NULL, description TEXT,
  confidence NUMERIC(5,2), severity VARCHAR(20),
  entity_refs JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new','reviewed','accepted','dismissed','actioned')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_handoffs (
  handoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id UUID, to_agent_id UUID, to_user_id VARCHAR(64),
  handoff_type VARCHAR(50) DEFAULT 'escalation' CHECK (handoff_type IN ('escalation','delegation','collaboration','completion')),
  context JSONB NOT NULL DEFAULT '{}', reason TEXT,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_cycle_summaries (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID, cycle_start TIMESTAMPTZ, cycle_end TIMESTAMPTZ,
  actions_taken INT DEFAULT 0, decisions_made INT DEFAULT 0,
  interventions_count INT DEFAULT 0, cost_total NUMERIC(10,2) DEFAULT 0,
  discoveries_count INT DEFAULT 0,
  summary JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_code ON ai_agents (agent_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_configs_code ON ai_model_configs (model_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_prompt_tpl_code ON ai_prompt_templates (template_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_exec_log_agent ON ai_execution_log (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_exec_log_session ON ai_execution_log (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_interventions_agent ON ai_interventions (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_notes_entity ON ai_notes (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_entity ON ai_drafts (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_hitl_gates_status ON hitl_gates (decision) WHERE decision IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_discoveries_agent ON agent_discoveries (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_discoveries_status ON agent_discoveries (status);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_from ON agent_handoffs (from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_cycle_agent ON agent_cycle_summaries (agent_id);
