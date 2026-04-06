-- Migration 108: Data-driven workflow configuration tables
-- Replaces hardcoded AGENT_MODULE_BINDING, MODULE_SLA_CONFIG,
-- MODULE_COMPENSATION_REGISTRY with DB tables.
-- Law 3: Data-driven security — config from DB, not code.

BEGIN;

-- ═══ Agent-Module Bindings ═══
-- Which AI agent handles which module(s). Replaces AGENT_MODULE_BINDING constant.
CREATE TABLE IF NOT EXISTS public.agent_module_bindings (
  id            SERIAL PRIMARY KEY,
  agent_id      VARCHAR(10) NOT NULL,
  module_code   VARCHAR(50) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, module_code)
);

-- Seed from previous hardcoded values
INSERT INTO public.agent_module_bindings (agent_id, module_code) VALUES
  ('A01', 'risk'),
  ('A02', 'compliance'),
  ('A03', 'policy'),
  ('A03', 'governance'),
  ('A03', 'exception'),
  ('A04', 'evidence'),
  ('A05', 'audit'),
  ('A06', 'incident'),
  ('A06', 'bcp'),
  ('A07', 'vendor'),
  ('A07', 'asset'),
  ('A08', 'remediation'),
  ('A08', 'action'),
  ('A09', 'training'),
  ('A09', 'qiyas'),
  ('A10', 'ai-governance')
ON CONFLICT (agent_id, module_code) DO NOTHING;

-- ═══ Module SLA Configurations ═══
-- Per-module SLA settings. Replaces MODULE_SLA_CONFIG constant.
CREATE TABLE IF NOT EXISTS public.module_sla_configs (
  id                      SERIAL PRIMARY KEY,
  module_code             VARCHAR(50) NOT NULL UNIQUE,
  warning_pct             NUMERIC(4,2) NOT NULL DEFAULT 0.75,
  breach_action           VARCHAR(20) NOT NULL DEFAULT 'escalate',
  escalation_roles        TEXT[] NOT NULL DEFAULT '{}',
  auto_reassign_on_breach BOOLEAN NOT NULL DEFAULT FALSE,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.module_sla_configs (module_code, warning_pct, breach_action, escalation_roles, auto_reassign_on_breach) VALUES
  ('risk',           0.75, 'escalate', '{risk_manager,ciso}',            FALSE),
  ('compliance',     0.75, 'escalate', '{compliance_officer,ciso}',      FALSE),
  ('policy',         0.80, 'escalate', '{policy_owner,governance_lead}', FALSE),
  ('evidence',       0.70, 'reassign', '{evidence_lead,auditor}',        TRUE),
  ('audit',          0.75, 'escalate', '{audit_lead,ciso}',              FALSE),
  ('incident',       0.50, 'escalate', '{incident_commander,ciso}',      FALSE),
  ('exception',      0.75, 'escalate', '{exception_approver,ciso}',      FALSE),
  ('governance',     0.80, 'escalate', '{governance_lead,board_sec}',    FALSE),
  ('vendor',         0.75, 'escalate', '{vendor_manager,procurement}',   FALSE),
  ('bcp',            0.75, 'escalate', '{bcp_coordinator,ciso}',         FALSE),
  ('asset',          0.75, 'escalate', '{asset_owner,it_manager}',       FALSE),
  ('remediation',    0.70, 'reassign', '{remediation_lead,risk_mgr}',    TRUE),
  ('action',         0.70, 'reassign', '{action_owner,project_mgr}',     TRUE),
  ('training',       0.80, 'escalate', '{training_lead,hr_manager}',     FALSE),
  ('qiyas',          0.80, 'escalate', '{maturity_lead,ciso}',           FALSE),
  ('ai-governance',  0.75, 'escalate', '{ai_ethics_lead,ciso}',          FALSE)
ON CONFLICT (module_code) DO NOTHING;

-- ═══ Module Compensation Registry ═══
-- Maps auto-actions to their compensating (rollback) actions.
-- Replaces MODULE_COMPENSATION_REGISTRY constant.
CREATE TABLE IF NOT EXISTS public.module_compensation_registry (
  id                    SERIAL PRIMARY KEY,
  original_action       VARCHAR(80) NOT NULL UNIQUE,
  compensating_action   VARCHAR(80) NOT NULL,
  module_code           VARCHAR(50),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.module_compensation_registry (original_action, compensating_action, module_code) VALUES
  ('risk_score_auto',         'risk_score_revert',         'risk'),
  ('risk_treatment_auto',     'risk_treatment_revert',     'risk'),
  ('compliance_test_auto',    'compliance_test_revert',    'compliance'),
  ('compliance_gap_auto',     'compliance_gap_revert',     'compliance'),
  ('evidence_auto_validate',  'evidence_invalidate',       'evidence'),
  ('evidence_auto_collect',   'evidence_uncollect',        'evidence'),
  ('policy_auto_draft',       'policy_draft_discard',      'policy'),
  ('policy_section_auto',     'policy_section_revert',     'policy'),
  ('audit_finding_auto',      'audit_finding_revert',      'audit'),
  ('incident_auto_triage',    'incident_retriage',         'incident'),
  ('incident_auto_contain',   'incident_uncontain',        'incident'),
  ('exception_auto_review',   'exception_review_revert',   'exception'),
  ('vendor_auto_score',       'vendor_score_revert',       'vendor'),
  ('vendor_auto_assess',      'vendor_assess_revert',      'vendor'),
  ('bcp_auto_assess',         'bcp_assess_revert',         'bcp'),
  ('asset_auto_classify',     'asset_classify_revert',     'asset'),
  ('remediation_auto_plan',   'remediation_plan_revert',   'remediation'),
  ('remediation_auto_verify', 'remediation_verify_revert', 'remediation'),
  ('action_auto_assign',      'action_unassign',           'action'),
  ('action_auto_complete',    'action_uncomplete',         'action'),
  ('training_auto_assign',    'training_unassign',         'training'),
  ('training_auto_assess',    'training_assess_revert',    'training'),
  ('qiyas_auto_score',        'qiyas_score_revert',        'qiyas'),
  ('ai_gov_auto_assess',      'ai_gov_assess_revert',      'ai-governance')
ON CONFLICT (original_action) DO NOTHING;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_module_bindings_module ON public.agent_module_bindings(module_code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_agent_module_bindings_agent ON public.agent_module_bindings(agent_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_module_sla_configs_module ON public.module_sla_configs(module_code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_module_compensation_module ON public.module_compensation_registry(module_code) WHERE is_active = TRUE;

COMMIT;
