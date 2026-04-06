-- ============================================
-- Tenant Migration 287
-- Phase 4 / Step 4.1: Agentic AI Governance
-- EU AI Act Art. 14 (Human Oversight),
--   Art. 9 (Risk Management)
-- ISO 42001, SDAIA, NIST AI RMF
-- ============================================

-- -------------------------------------------------
-- 1. ai_agent_authority_scopes
--    Defines the permissible scope, resource limits
--    and tool access for each AI agent per module.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_agent_authority_scopes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                    UUID NOT NULL,
  system_id                   UUID REFERENCES ai_system_registry(id),
  module_code                 VARCHAR(64) NOT NULL,

  -- Authority type
  scope_type                  TEXT NOT NULL CHECK (scope_type IN (
    'read', 'write', 'execute', 'approve', 'escalate'
  )),

  -- Resource limits
  max_actions_per_session     INT DEFAULT 100,
  max_cost_per_session        NUMERIC(10,2) DEFAULT 100.00,
  max_sub_agent_depth         INT DEFAULT 2,

  -- Oversight controls
  requires_human_approval     BOOLEAN DEFAULT FALSE,
  confidence_threshold        NUMERIC(3,2) DEFAULT 0.85,

  -- Transparency & tool access
  transparency_notice         TEXT,
  allowed_tools               TEXT[] DEFAULT '{}',

  is_active                   BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(agent_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_aas_agent   ON ai_agent_authority_scopes(agent_id);
CREATE INDEX IF NOT EXISTS idx_aas_system  ON ai_agent_authority_scopes(system_id) WHERE system_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aas_module  ON ai_agent_authority_scopes(module_code);
CREATE INDEX IF NOT EXISTS idx_aas_active  ON ai_agent_authority_scopes(is_active) WHERE is_active = TRUE;

-- -------------------------------------------------
-- 2. ai_agent_session_governance
--    Runtime tracking of each agent session,
--    including resource consumption, escalations,
--    and security detections.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_agent_session_governance (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id                    UUID REFERENCES ai_agent_authority_scopes(id),
  agent_id                    UUID NOT NULL,

  -- Session lifecycle
  session_start               TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end                 TIMESTAMPTZ,

  -- Resource consumption
  actions_taken               INT DEFAULT 0,
  cost_incurred               NUMERIC(10,2) DEFAULT 0.00,
  tokens_used                 INT DEFAULT 0,
  tool_calls                  INT DEFAULT 0,

  -- Oversight metrics
  escalations                 INT DEFAULT 0,
  human_interventions         INT DEFAULT 0,

  -- Isolation & reasoning
  session_isolation           TEXT DEFAULT 'shared' CHECK (session_isolation IN (
    'shared', 'isolated', 'sandboxed'
  )),
  reasoning_trace             JSONB DEFAULT '[]',

  -- Security detections
  prompt_injection_detected   BOOLEAN DEFAULT FALSE,
  pii_exposure_detected       BOOLEAN DEFAULT FALSE,
  output_validation_failures  INT DEFAULT 0,

  -- Confidence tracking
  confidence_scores           JSONB DEFAULT '[]',

  -- Status
  status                      TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'completed', 'terminated', 'budget_exceeded', 'escalated'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asg_scope   ON ai_agent_session_governance(scope_id) WHERE scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asg_agent   ON ai_agent_session_governance(agent_id);
CREATE INDEX IF NOT EXISTS idx_asg_status  ON ai_agent_session_governance(status);
CREATE INDEX IF NOT EXISTS idx_asg_start   ON ai_agent_session_governance(session_start);

-- -------------------------------------------------
-- 3. ai_agent_chain_of_custody
--    Records sub-agent delegation chains with
--    approval tracking and risk assessment.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_agent_chain_of_custody (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_session_id           UUID REFERENCES ai_agent_session_governance(id),
  child_session_id            UUID REFERENCES ai_agent_session_governance(id),

  -- Delegation details
  delegation_depth            INT NOT NULL DEFAULT 1,
  delegated_scope             JSONB NOT NULL DEFAULT '{}',
  delegation_reason           TEXT,

  -- Approval
  approved_by                 VARCHAR(64),
  approval_method             TEXT CHECK (approval_method IN (
    'auto', 'human', 'policy'
  )),

  -- Risk at delegation time
  risk_at_delegation          TEXT CHECK (risk_at_delegation IN (
    'low', 'medium', 'high'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acc_parent  ON ai_agent_chain_of_custody(parent_session_id) WHERE parent_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acc_child   ON ai_agent_chain_of_custody(child_session_id) WHERE child_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acc_depth   ON ai_agent_chain_of_custody(delegation_depth);
