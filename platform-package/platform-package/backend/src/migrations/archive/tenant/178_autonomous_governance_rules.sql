-- Migration 178: Autonomous Governance — Closed-Loop Rules
-- Task auto-resolution rules, auto-approval config, cross-agent trigger chains.

-- 1. Task auto-resolution rules (tenant-customizable)
CREATE TABLE IF NOT EXISTS task_auto_resolution_rules (
  id                    BIGSERIAL PRIMARY KEY,
  entity_type           TEXT NOT NULL,
  task_type             TEXT NOT NULL,
  trigger_event         TEXT NOT NULL,
  resolution_conditions JSONB DEFAULT '{}'::JSONB,
  auto_close            BOOLEAN NOT NULL DEFAULT TRUE,
  require_validation    BOOLEAN NOT NULL DEFAULT FALSE,
  validation_min_score  NUMERIC(5,2) DEFAULT 0.0,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, task_type, trigger_event)
);

-- 2. Auto-approval configuration
CREATE TABLE IF NOT EXISTS auto_approval_config (
  id                  BIGSERIAL PRIMARY KEY,
  entity_type         TEXT NOT NULL,
  max_priority        TEXT NOT NULL DEFAULT 'medium',
  max_risk_score      INTEGER NOT NULL DEFAULT 8,
  min_authority_level TEXT NOT NULL DEFAULT 'approve_low',
  require_audit_log   BOOLEAN NOT NULL DEFAULT TRUE,
  enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type)
);

-- 3. Cross-agent trigger chains
CREATE TABLE IF NOT EXISTS agent_trigger_chains (
  id                  BIGSERIAL PRIMARY KEY,
  source_agent_id     TEXT NOT NULL,
  source_entity_type  TEXT NOT NULL,
  source_task_type    TEXT NOT NULL,
  target_agent_id     TEXT NOT NULL,
  target_context      JSONB DEFAULT '{}'::JSONB,
  delay_seconds       INTEGER NOT NULL DEFAULT 0,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_agent_id, source_entity_type, source_task_type, target_agent_id)
);

-- 4. Add auto-resolution columns to process_tasks
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS auto_resolved BOOLEAN DEFAULT FALSE;
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS resolution_source TEXT;
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS resolution_evidence JSONB;

-- 5. Seed auto-resolution rules (full autonomous mode)
INSERT INTO task_auto_resolution_rules (entity_type, task_type, trigger_event, auto_close, require_validation, validation_min_score) VALUES
  -- Evidence: auto-close when evidence submitted
  ('evidence',         'evidence_request',   'evidence.submitted',         TRUE, FALSE, 0.0),
  ('evidence',         'evidence_request',   'evidence.validated',         TRUE, FALSE, 0.0),
  -- Control: auto-close review when all linked evidence validated
  ('control',          'control_review',     'evidence.validated',         TRUE, TRUE,  0.8),
  ('control',          'control_review',     'control.assessment_complete', TRUE, FALSE, 0.0),
  -- Policy: auto-close creation task when policy published
  ('policy',           'policy_creation',    'policy.published',           TRUE, FALSE, 0.0),
  ('policy',           'control_review',     'policy.reviewed',            TRUE, FALSE, 0.0),
  -- Risk: auto-close assessment when risk re-scored
  ('risk',             'risk_assessment',    'risk.score_updated',         TRUE, FALSE, 0.0),
  ('risk',             'remediation',        'risk.treatment_completed',   TRUE, TRUE,  0.0),
  -- Incident: auto-close response when incident resolved
  ('incident',         'incident_response',  'incident.resolved',          TRUE, FALSE, 0.0),
  -- Vendor: auto-close assessment when vendor scored
  ('vendor',           'risk_assessment',    'vendor.assessment_complete', TRUE, FALSE, 0.0),
  -- Finding: auto-close audit response when finding addressed
  ('finding',          'audit_response',     'finding.remediated',         TRUE, FALSE, 0.0),
  -- Approval: auto-close verification when approval chain completes
  ('approval',         'verification',       'approval.completed',         TRUE, FALSE, 0.0),
  -- Governance: auto-close on governance action completion
  ('governance_action','remediation',        'governance.action_completed', TRUE, FALSE, 0.0),
  ('committee',        'verification',       'governance.meeting_held',    TRUE, FALSE, 0.0),
  ('procedure',        'control_review',     'governance.procedure_reviewed', TRUE, FALSE, 0.0),
  ('mandate',          'verification',       'governance.mandate_renewed', TRUE, FALSE, 0.0)
ON CONFLICT (entity_type, task_type, trigger_event) DO NOTHING;

-- 6. Seed auto-approval config (full autonomous — all reviewable types)
INSERT INTO auto_approval_config (entity_type, max_priority, max_risk_score, min_authority_level, enabled) VALUES
  ('evidence',         'medium',   8,  'approve_low',    TRUE),
  ('control',          'medium',   5,  'approve_low',    TRUE),
  ('policy',           'low',      3,  'approve_medium', TRUE),
  ('risk',             'low',      5,  'approve_low',    TRUE),
  ('vendor',           'low',      5,  'approve_medium', TRUE),
  ('finding',          'low',      3,  'approve_low',    TRUE),
  ('compliance_gap',   'medium',   8,  'approve_low',    TRUE),
  ('governance_action','medium',   8,  'approve_low',    TRUE)
ON CONFLICT (entity_type) DO NOTHING;

-- 7. Seed cross-agent trigger chains
INSERT INTO agent_trigger_chains (source_agent_id, source_entity_type, source_task_type, target_agent_id, delay_seconds) VALUES
  -- A05 evidence collected → A06 gap remediation check
  ('A05', 'evidence',  'evidence_request', 'A06', 30),
  -- A06 gap closed → A04 control update
  ('A06', 'control',   'remediation',      'A04', 60),
  -- A07 risk flagged → A06 remediation check
  ('A07', 'risk',      'risk_assessment',  'A06', 30),
  -- A07 risk flagged (vendor-linked) → A09 vendor review
  ('A07', 'vendor',    'risk_assessment',  'A09', 60),
  -- A08 policy published → A04 control re-mapping
  ('A08', 'policy',    'policy_creation',  'A04', 60),
  -- A08 policy published → A05 evidence re-request
  ('A08', 'policy',    'policy_creation',  'A05', 120),
  -- A04 control updated → A05 evidence request
  ('A04', 'control',   'control_review',   'A05', 60),
  -- A09 vendor assessed → A07 risk re-evaluation
  ('A09', 'vendor',    'risk_assessment',  'A07', 60),
  -- A06 remediation complete → A03 framework re-mapping
  ('A06', 'compliance_gap', 'remediation', 'A03', 120),
  -- A10 audit finding → A06 remediation
  ('A10', 'finding',   'audit_response',   'A06', 30)
ON CONFLICT DO NOTHING;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_auto_resolution_lookup
  ON task_auto_resolution_rules (entity_type, task_type, trigger_event) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_auto_approval_lookup
  ON auto_approval_config (entity_type) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_agent_chains_source
  ON agent_trigger_chains (source_agent_id, source_entity_type) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_process_tasks_auto_resolved
  ON process_tasks (auto_resolved) WHERE auto_resolved = TRUE;
