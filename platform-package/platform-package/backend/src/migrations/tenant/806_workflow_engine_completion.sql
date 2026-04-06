-- Migration 367: Workflow Engine Completion
-- Entity lifecycle log, expanded trigger config, role-scoped workflow access

-- 1. Entity lifecycle transition log (used by module-lifecycle-state-machine)
CREATE TABLE IF NOT EXISTS entity_lifecycle_log (
  id                   BIGSERIAL PRIMARY KEY,
  entity_type          TEXT NOT NULL,
  entity_id            TEXT NOT NULL,
  module_code          TEXT NOT NULL,
  previous_status      TEXT NOT NULL,
  new_status           TEXT NOT NULL,
  transitioned_by      VARCHAR(64),
  transitioned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requires_approval    BOOLEAN NOT NULL DEFAULT FALSE,
  approval_id          UUID,
  metadata             JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ellog_entity ON entity_lifecycle_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ellog_module ON entity_lifecycle_log(module_code);
CREATE INDEX IF NOT EXISTS idx_ellog_at ON entity_lifecycle_log(transitioned_at);

-- 2. Expanded AI trigger configuration (all modules, not just risk/compliance/incident)
ALTER TABLE ai_trigger_config
  ADD COLUMN IF NOT EXISTS module_triggers JSONB DEFAULT '{}';

-- module_triggers schema:
-- { "vendor": { "threshold_field": "risk_score", "threshold_value": 70, "template_key": "vendor_due_diligence" },
--   "audit": { "threshold_field": "finding_count", "threshold_value": 5, "template_key": "audit_remediation" },
--   ... }

-- 3. Workflow role visibility (which roles see which workflow definitions)
CREATE TABLE IF NOT EXISTS workflow_role_access (
  id                   BIGSERIAL PRIMARY KEY,
  workflow_id          UUID,
  template_id          UUID,
  role_code            TEXT NOT NULL,
  access_level         TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'execute', 'manage')),
  module_code          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, role_code),
  UNIQUE(template_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_wra_role ON workflow_role_access(role_code);
CREATE INDEX IF NOT EXISTS idx_wra_module ON workflow_role_access(module_code);

-- 4. Seed default role access for existing workflows
INSERT INTO workflow_role_access (role_code, access_level, module_code)
SELECT DISTINCT
  r.role_code,
  CASE
    WHEN r.role_code IN ('admin', 'grc_manager') THEN 'manage'
    WHEN r.role_code IN ('executive_owner', 'audit_manager', 'risk_manager', 'compliance_lead') THEN 'execute'
    ELSE 'view'
  END,
  NULL
FROM (VALUES ('admin'), ('executive_owner'), ('grc_manager'), ('audit_manager'),
            ('risk_manager'), ('compliance_lead'), ('data_governance_lead'),
            ('risk_lead'), ('auditor'), ('viewer')) AS r(role_code)
ON CONFLICT DO NOTHING;
