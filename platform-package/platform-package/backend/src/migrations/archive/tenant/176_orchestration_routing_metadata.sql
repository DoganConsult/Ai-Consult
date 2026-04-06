-- Migration 176: Orchestration routing metadata
-- Adds routing observability columns to process_tasks,
-- governance RACI seeds, and entity_type_routing_config table.

-- 1. Add routing columns to process_tasks
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS routing_tier TEXT;
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS routing_metadata JSONB DEFAULT '{}'::JSONB;

-- 2. Entity-type routing config (tenant-customizable domain→module→team mapping)
CREATE TABLE IF NOT EXISTS entity_type_routing_config (
  id            BIGSERIAL PRIMARY KEY,
  entity_type   TEXT NOT NULL,
  module_code   TEXT NOT NULL,
  domain_code   TEXT NOT NULL,
  default_functional_role TEXT,
  default_team_code TEXT,
  scope_type    TEXT NOT NULL DEFAULT 'tenant',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type)
);

-- 3. Seed entity_type_routing_config with all known entity types
INSERT INTO entity_type_routing_config (entity_type, module_code, domain_code, default_functional_role, default_team_code) VALUES
  ('risk',                    'risk',        'risk_management',         'risk_owner',            'ERM'),
  ('control',                 'compliance',  'compliance_monitoring',   'control_owner',         'CYBER_GOV'),
  ('policy',                  'policy',      'compliance_monitoring',   'policy_author',         'QUALITY'),
  ('evidence',                'evidence',    'audit_assurance',         'evidence_owner',        'AUDIT'),
  ('vendor',                  'vendor',      'vendor_risk_assessment',  'vendor_owner',          'VENDOR_RISK'),
  ('incident',                'incident',    'incident_response',       'incident_reporter',     'SOC_OPS'),
  ('compliance_gap',          'compliance',  'compliance_monitoring',   'compliance_analyst',    'CYBER_GOV'),
  ('finding',                 'audit',       'audit_assurance',         'auditor',               'AUDIT'),
  ('remediation_task',        'remediation', 'risk_management',         'remediation_owner',     'ERM'),
  ('assessment',              'audit',       'audit_assurance',         'auditor',               'AUDIT'),
  ('user',                    'admin',       'data_protection',         NULL,                    'IAM_GOV'),
  ('report',                  'analytics',   'audit_assurance',         'analytics_viewer',      'EXEC_STRATEGY'),
  ('bcm',                     'bcp',         'bcm_disaster_recovery',   NULL,                    'BCM_DR'),
  ('change',                  'governance',  'change_management',       'governance_manager',    'SVC_OPS'),
  ('privacy',                 'governance',  'data_protection',         NULL,                    'PRIVACY'),
  ('governance_action',       'governance',  'governance_oversight',    'governance_manager',    'CYBER_GOV'),
  ('committee',               'governance',  'governance_oversight',    'governance_manager',    'EXEC_STRATEGY'),
  ('procedure',               'governance',  'compliance_monitoring',   'governance_manager',    'QUALITY'),
  ('mandate',                 'governance',  'governance_oversight',    'governance_manager',    'EXEC_STRATEGY'),
  ('enforcement_violation',   'governance',  'compliance_monitoring',   'compliance_analyst',    'CYBER_GOV'),
  ('exception',               'exception',   'compliance_monitoring',   'compliance_analyst',    'CYBER_GOV'),
  ('asset',                   'asset',       'asset_management',        NULL,                    'SVC_OPS'),
  ('delegation',              'governance',  'governance_oversight',    'governance_manager',    'EXEC_STRATEGY'),
  ('obligation',              'governance',  'compliance_monitoring',   'compliance_analyst',    'CYBER_GOV'),
  ('responsibility',          'governance',  'governance_oversight',    'governance_manager',    'EXEC_STRATEGY'),
  ('charter',                 'governance',  'governance_oversight',    'governance_manager',    'EXEC_STRATEGY'),
  ('objective',               'governance',  'governance_oversight',    'governance_manager',    'EXEC_STRATEGY'),
  ('board_pack',              'governance',  'governance_oversight',    'governance_manager',    'EXEC_STRATEGY'),
  ('governance_auto_fire',    'governance',  'governance_oversight',    'governance_manager',    'CYBER_GOV')
ON CONFLICT (entity_type) DO NOTHING;

-- 4. Seed governance RACI entries into raci_matrix (if table has the expected columns)
DO $$
DECLARE has_scope_id BOOLEAN; scope_is_uuid BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'raci_matrix' AND column_name = 'domain_code'
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'raci_matrix' AND column_name = 'scope_id'
    ) INTO has_scope_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'raci_matrix'
        AND column_name = 'scope_id' AND data_type = 'uuid'
    ) INTO scope_is_uuid;

    IF NOT has_scope_id OR scope_is_uuid THEN
      INSERT INTO raci_matrix (domain_code, process_code, stage_code, activity_code,
        scope_type,
        responsible_role_codes, accountable_role_codes, consulted_role_codes, informed_role_codes)
      VALUES
        ('governance', 'committee_oversight',   'scheduling', 'schedule_meeting',
         'process',
         ARRAY['governance_manager'], ARRAY['executive_owner'], ARRAY['compliance_analyst'], ARRAY['analytics_viewer']),
        ('governance', 'procedure_management',  'review',     'review_procedure',
         'process',
         ARRAY['governance_manager'], ARRAY['policy_approver'], ARRAY['compliance_analyst'], ARRAY['auditor']),
        ('governance', 'mandate_management',    'renewal',    'renew_mandate',
         'process',
         ARRAY['governance_manager'], ARRAY['executive_owner'], ARRAY['compliance_analyst'], ARRAY['analytics_viewer']),
        ('governance', 'enforcement',           'remediation','enforce_action',
         'process',
         ARRAY['compliance_analyst'], ARRAY['governance_manager'], ARRAY['risk_owner'], ARRAY['auditor']),
        ('governance', 'action_tracking',       'followup',   'track_action',
         'process',
         ARRAY['governance_manager'], ARRAY['compliance_analyst'], ARRAY['risk_owner'], ARRAY['analytics_viewer'])
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO raci_matrix (domain_code, process_code, stage_code, activity_code,
        scope_type, scope_id,
        responsible_role_codes, accountable_role_codes, consulted_role_codes, informed_role_codes)
      VALUES
        ('governance', 'committee_oversight',   'scheduling', 'schedule_meeting',
         'process', 'governance_oversight',
         ARRAY['governance_manager'], ARRAY['executive_owner'], ARRAY['compliance_analyst'], ARRAY['analytics_viewer']),
        ('governance', 'procedure_management',  'review',     'review_procedure',
         'process', 'compliance_monitoring',
         ARRAY['governance_manager'], ARRAY['policy_approver'], ARRAY['compliance_analyst'], ARRAY['auditor']),
        ('governance', 'mandate_management',    'renewal',    'renew_mandate',
         'process', 'governance_oversight',
         ARRAY['governance_manager'], ARRAY['executive_owner'], ARRAY['compliance_analyst'], ARRAY['analytics_viewer']),
        ('governance', 'enforcement',           'remediation','enforce_action',
         'process', 'compliance_monitoring',
         ARRAY['compliance_analyst'], ARRAY['governance_manager'], ARRAY['risk_owner'], ARRAY['auditor']),
        ('governance', 'action_tracking',       'followup',   'track_action',
         'process', 'governance_oversight',
         ARRAY['governance_manager'], ARRAY['compliance_analyst'], ARRAY['risk_owner'], ARRAY['analytics_viewer'])
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- 5. Index for fast RACI domain lookups
CREATE INDEX IF NOT EXISTS idx_raci_matrix_domain_process ON raci_matrix (domain_code, process_code);

-- 6. Index for entity_type_routing_config
CREATE INDEX IF NOT EXISTS idx_entity_type_routing_active ON entity_type_routing_config (entity_type) WHERE active = TRUE;
