-- Migration 256: Add permissions for 12 orphan functional roles
-- ==============================================================
-- 12 functional roles exist in functional_roles but have 0 entries
-- in role_permissions, making them unable to grant any actual access.
-- ==============================================================

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE (fr.code, p.module_code) IN (
  ('reporting_admin', 'reports'),
  ('reporting_admin', 'reporting'),
  ('foundation_admin', 'foundation'),
  ('assessment_manager', 'assessment'),
  ('agrc_admin', 'agrc'),
  ('agrc_operator', 'agrc'),
  ('ai_admin', 'ai'),
  ('ai_operator', 'ai'),
  ('integrations_admin', 'integrations'),
  ('team_manager', 'team'),
  ('task_user', 'task'),
  ('knowledge_contributor', 'knowledge'),
  ('training_admin', 'training'),
  ('workflow_designer', 'workflow'),
  ('workflow_user', 'workflow'),
  ('analytics_admin', 'analytics'),
  ('analytics_viewer', 'analytics')
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id
FROM functional_roles fr, permissions p
WHERE fr.code = 'report_designer'
  AND p.code LIKE 'reporting.%'
ON CONFLICT DO NOTHING;
