-- Migration 342: Compliance feature flags + permission fixes
-- Resolves: M1 (no feature flags), M4 (permission overloading)

-- ============================================================
-- 1. Compliance feature flags
-- ============================================================
INSERT INTO feature_flags (feature_key, enabled) VALUES
  ('compliance.drift_engine', TRUE),
  ('compliance.attestation_campaigns', TRUE),
  ('compliance.ai_tools', TRUE),
  ('compliance.bulk_import', TRUE)
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- 2. Fix permission overloading — framework and assessment
--    need their own read permissions, not piggybacking on
--    control.read / test.execute
-- ============================================================
INSERT INTO permissions (code, module_code, resource_code, action_code, description)
VALUES
  ('compliance.framework.read', 'compliance', 'framework', 'read', 'View compliance frameworks'),
  ('compliance.framework.update', 'compliance', 'framework', 'update', 'Update compliance frameworks'),
  ('compliance.assessment.read', 'compliance', 'assessment', 'read', 'View compliance assessments'),
  ('compliance.assessment.create', 'compliance', 'assessment', 'create', 'Create compliance assessments')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. Assign new permissions to existing compliance roles
-- ============================================================
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'compliance_analyst' AND p.code IN (
  'compliance.framework.read', 'compliance.assessment.read'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'compliance_manager' AND p.code IN (
  'compliance.framework.read', 'compliance.framework.update',
  'compliance.assessment.read', 'compliance.assessment.create'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'control_owner' AND p.code IN (
  'compliance.framework.read', 'compliance.assessment.read'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr
CROSS JOIN permissions p
WHERE fr.code = 'control_tester' AND p.code IN (
  'compliance.framework.read', 'compliance.assessment.read'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Drift engine tables — already created by DDL seeding.
--    Only add missing indexes if the tables exist.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_drift_events_status ON compliance_drift_events (status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_drift_events_rule ON compliance_drift_events (rule_id);
CREATE INDEX IF NOT EXISTS idx_drift_rules_active ON compliance_drift_rules (is_active) WHERE is_active = TRUE;
