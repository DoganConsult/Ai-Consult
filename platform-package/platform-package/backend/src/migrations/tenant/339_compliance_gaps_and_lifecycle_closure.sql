-- Migration 339: Compliance Module Closure — compliance_gaps DDL + lifecycle definitions + permission seeds
-- Closes critical gap: compliance_gaps table referenced by 11+ files (AI tools, agent-runner, vendor-cross-agent, autonomous-engine, RAG pipeline) with no DDL
-- Adds obligation, assessment, finding lifecycle definitions
-- Seeds obligation/attestation permission codes

-- ============================================================
-- 1. compliance_gaps table (CRITICAL — unblocks A06/A09/A10/A11 tools)
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_gaps (
  gap_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64),
  workspace_id    UUID,
  control_id      VARCHAR(128),
  framework_id    VARCHAR(50),
  title           VARCHAR(500),
  description     TEXT,
  severity        VARCHAR(20) NOT NULL DEFAULT 'medium'
                  CHECK (severity IN ('critical','high','medium','low')),
  status          VARCHAR(30) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','remediation_planned','remediated','closed','accepted','deferred')),
  source_type     VARCHAR(50),
  source_id       VARCHAR(128),
  remediation_id  UUID,
  identified_by   VARCHAR(64),
  assigned_to     VARCHAR(64),
  owner_team_id   UUID,
  department_id   UUID,
  business_unit_id UUID,
  due_date        TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_compliance_gaps_status ON compliance_gaps (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_severity ON compliance_gaps (severity) WHERE status = 'open' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_control ON compliance_gaps (control_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_framework ON compliance_gaps (framework_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_tenant ON compliance_gaps (tenant_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. Obligation lifecycle definition
-- ============================================================
INSERT INTO module_lifecycle_definitions (module_code, statuses, initial_status, terminal_statuses)
VALUES ('obligation',
  ARRAY['draft','active','under_review','non_compliant','compliant','partially_compliant','expired','suspended','closed'],
  'draft', ARRAY['closed','expired'])
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO module_lifecycle_transitions
  (module_code, from_status, to_status, required_functional_roles, required_permission_code, sla_hours, authority_gate, sod_check)
VALUES
  ('obligation', 'draft',               'active',              ARRAY['compliance_manager','control_owner'], 'compliance.obligation.update', NULL,  'submit', FALSE),
  ('obligation', 'active',              'under_review',        ARRAY['compliance_analyst','compliance_manager'], 'compliance.obligation.update', 72, NULL, FALSE),
  ('obligation', 'under_review',        'compliant',           ARRAY['compliance_manager'], 'compliance.obligation.approve', 24, 'approve_low', TRUE),
  ('obligation', 'under_review',        'non_compliant',       ARRAY['compliance_analyst','compliance_manager'], 'compliance.obligation.update', 24, NULL, FALSE),
  ('obligation', 'under_review',        'partially_compliant', ARRAY['compliance_analyst','compliance_manager'], 'compliance.obligation.update', 24, NULL, FALSE),
  ('obligation', 'non_compliant',       'under_review',        ARRAY['control_owner','compliance_analyst'], 'compliance.obligation.update', 48, NULL, FALSE),
  ('obligation', 'partially_compliant', 'under_review',        ARRAY['control_owner','compliance_analyst'], 'compliance.obligation.update', 48, NULL, FALSE),
  ('obligation', 'compliant',           'under_review',        ARRAY['compliance_analyst'], 'compliance.obligation.update', NULL, NULL, FALSE),
  ('obligation', 'active',              'suspended',           ARRAY['compliance_manager'], 'compliance.obligation.update', NULL, NULL, FALSE),
  ('obligation', 'suspended',           'active',              ARRAY['compliance_manager'], 'compliance.obligation.update', NULL, NULL, FALSE),
  ('obligation', 'active',              'expired',             ARRAY['compliance_manager'], 'compliance.obligation.update', NULL, NULL, FALSE),
  ('obligation', 'active',              'closed',              ARRAY['compliance_manager'], 'compliance.obligation.approve', NULL, 'approve_low', FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Assessment lifecycle definition
-- ============================================================
INSERT INTO module_lifecycle_definitions (module_code, statuses, initial_status, terminal_statuses)
VALUES ('assessment',
  ARRAY['draft','in_progress','submitted','under_review','approved','rejected','closed'],
  'draft', ARRAY['closed'])
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO module_lifecycle_transitions
  (module_code, from_status, to_status, required_functional_roles, required_permission_code, sla_hours, authority_gate, sod_check)
VALUES
  ('assessment', 'draft',        'in_progress',  ARRAY['compliance_analyst','control_tester'], 'compliance.test.execute', NULL, NULL, FALSE),
  ('assessment', 'in_progress',  'submitted',    ARRAY['compliance_analyst','control_tester'], 'compliance.test.execute', 72,  'submit', FALSE),
  ('assessment', 'submitted',    'under_review', ARRAY['compliance_manager'], 'compliance.score.review', 24, NULL, FALSE),
  ('assessment', 'under_review', 'approved',     ARRAY['compliance_manager'], 'compliance.score.approve', 24, 'approve_low', TRUE),
  ('assessment', 'under_review', 'rejected',     ARRAY['compliance_manager'], 'compliance.score.review', 24, NULL, FALSE),
  ('assessment', 'rejected',     'in_progress',  ARRAY['compliance_analyst','control_tester'], 'compliance.test.execute', 48, NULL, FALSE),
  ('assessment', 'approved',     'closed',       ARRAY['compliance_manager'], 'compliance.score.approve', NULL, NULL, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Finding lifecycle definition
-- ============================================================
INSERT INTO module_lifecycle_definitions (module_code, statuses, initial_status, terminal_statuses)
VALUES ('finding',
  ARRAY['draft','confirmed','remediation_planned','in_remediation','verification_pending','verified','closed','accepted_risk'],
  'draft', ARRAY['closed','accepted_risk'])
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO module_lifecycle_transitions
  (module_code, from_status, to_status, required_functional_roles, required_permission_code, sla_hours, authority_gate, sod_check)
VALUES
  ('finding', 'draft',                 'confirmed',            ARRAY['compliance_analyst','compliance_manager'], 'compliance.control.update', NULL, NULL, FALSE),
  ('finding', 'confirmed',             'remediation_planned',  ARRAY['control_owner','compliance_analyst'], 'compliance.control.update', 72, NULL, FALSE),
  ('finding', 'confirmed',             'accepted_risk',        ARRAY['compliance_manager'], 'compliance.score.approve', NULL, 'approve_low', TRUE),
  ('finding', 'remediation_planned',   'in_remediation',       ARRAY['control_owner'], 'compliance.control.update', NULL, NULL, FALSE),
  ('finding', 'in_remediation',        'verification_pending', ARRAY['control_owner','control_tester'], 'compliance.test.execute', 48, NULL, FALSE),
  ('finding', 'verification_pending',  'verified',             ARRAY['compliance_analyst','compliance_manager'], 'compliance.score.review', 24, NULL, TRUE),
  ('finding', 'verified',              'closed',               ARRAY['compliance_manager'], 'compliance.score.approve', NULL, 'approve_low', FALSE),
  ('finding', 'verification_pending',  'in_remediation',       ARRAY['compliance_analyst'], 'compliance.control.update', 24, NULL, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Attestation lifecycle definition
-- ============================================================
INSERT INTO module_lifecycle_definitions (module_code, statuses, initial_status, terminal_statuses)
VALUES ('attestation',
  ARRAY['draft','active','in_progress','submitted','reviewed','completed','expired','cancelled'],
  'draft', ARRAY['completed','expired','cancelled'])
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO module_lifecycle_transitions
  (module_code, from_status, to_status, required_functional_roles, required_permission_code, sla_hours, authority_gate, sod_check)
VALUES
  ('attestation', 'draft',       'active',      ARRAY['compliance_manager'], 'compliance.attestation.manage', NULL, NULL, FALSE),
  ('attestation', 'active',      'in_progress', ARRAY['control_owner','compliance_analyst'], 'compliance.attestation.submit', NULL, NULL, FALSE),
  ('attestation', 'in_progress', 'submitted',   ARRAY['control_owner','compliance_analyst'], 'compliance.attestation.submit', 72, 'submit', FALSE),
  ('attestation', 'submitted',   'reviewed',    ARRAY['compliance_manager'], 'compliance.attestation.review', 24, NULL, FALSE),
  ('attestation', 'reviewed',    'completed',   ARRAY['compliance_manager'], 'compliance.attestation.manage', NULL, 'approve_low', TRUE),
  ('attestation', 'active',      'cancelled',   ARRAY['compliance_manager'], 'compliance.attestation.manage', NULL, NULL, FALSE),
  ('attestation', 'active',      'expired',     ARRAY['compliance_manager'], 'compliance.attestation.manage', NULL, NULL, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Seed obligation permission codes
-- ============================================================
INSERT INTO permissions (code, module_code, resource_code, action_code, description)
VALUES
  ('compliance.obligation.read',    'compliance', 'obligation', 'read',    'View compliance obligations'),
  ('compliance.obligation.create',  'compliance', 'obligation', 'create',  'Create compliance obligations'),
  ('compliance.obligation.update',  'compliance', 'obligation', 'update',  'Update compliance obligations'),
  ('compliance.obligation.approve', 'compliance', 'obligation', 'approve', 'Approve obligation compliance status')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 7. Seed attestation permission codes
-- ============================================================
INSERT INTO permissions (code, module_code, resource_code, action_code, description)
VALUES
  ('compliance.attestation.read',   'compliance', 'attestation', 'read',   'View attestation campaigns and records'),
  ('compliance.attestation.submit', 'compliance', 'attestation', 'submit', 'Submit attestation responses'),
  ('compliance.attestation.review', 'compliance', 'attestation', 'review', 'Review attestation submissions'),
  ('compliance.attestation.manage', 'compliance', 'attestation', 'manage', 'Manage attestation campaigns')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 8. Seed finding permission codes
-- ============================================================
INSERT INTO permissions (code, module_code, resource_code, action_code, description)
VALUES
  ('compliance.finding.read',   'compliance', 'finding', 'read',   'View compliance findings'),
  ('compliance.finding.create', 'compliance', 'finding', 'create', 'Create compliance findings'),
  ('compliance.finding.update', 'compliance', 'finding', 'update', 'Update compliance findings')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 9. Assign new permissions to existing compliance functional roles
-- ============================================================
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'compliance_analyst' AND p.code IN (
  'compliance.obligation.read', 'compliance.finding.read', 'compliance.finding.create',
  'compliance.attestation.read', 'compliance.attestation.submit'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'compliance_manager' AND p.code IN (
  'compliance.obligation.read', 'compliance.obligation.create', 'compliance.obligation.update', 'compliance.obligation.approve',
  'compliance.finding.read', 'compliance.finding.create', 'compliance.finding.update',
  'compliance.attestation.read', 'compliance.attestation.submit', 'compliance.attestation.review', 'compliance.attestation.manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'control_owner' AND p.code IN (
  'compliance.obligation.read', 'compliance.obligation.update',
  'compliance.finding.read',
  'compliance.attestation.read', 'compliance.attestation.submit'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'control_tester' AND p.code IN (
  'compliance.obligation.read',
  'compliance.finding.read', 'compliance.finding.create'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. Extend attestation_campaigns for polymorphic entity linking
-- ============================================================
DO $$
BEGIN
  -- Make policy_id nullable (was NOT NULL, restricting to policy-only attestations)
  ALTER TABLE attestation_campaigns ALTER COLUMN policy_id DROP NOT NULL;

  -- Add polymorphic entity columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attestation_campaigns' AND column_name = 'entity_type') THEN
    ALTER TABLE attestation_campaigns ADD COLUMN entity_type VARCHAR(50) DEFAULT 'policy';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attestation_campaigns' AND column_name = 'entity_id') THEN
    ALTER TABLE attestation_campaigns ADD COLUMN entity_id VARCHAR(128);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'attestation_campaigns extension skipped: %', SQLERRM;
END $$;
