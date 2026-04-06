-- Migration 181: Authorization security fixes
-- M1: Insert missing SoD rule — tenant_admin vs external_auditor

INSERT INTO sod_rules (role_code_a, role_code_b, module_code, conflict_level, scope_rule, description, is_active)
VALUES ('tenant_admin', 'external_auditor', NULL, 'block', 'tenant_wide',
  'Tenant administrators cannot simultaneously hold external auditor roles to preserve audit independence', TRUE)
ON CONFLICT DO NOTHING;
