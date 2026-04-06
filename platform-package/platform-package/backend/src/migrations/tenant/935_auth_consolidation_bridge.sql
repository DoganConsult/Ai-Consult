-- Migration 935: Auth System Consolidation Bridge
-- Unifies migration 030 (legacy) and migration 163 (enterprise) authorization tables
-- Creates unified views so consumers query ONE source

-- Unified role view: enterprise (163) as primary, legacy (030) as fallback
CREATE OR REPLACE VIEW __TENANT_SCHEMA__.v_unified_user_roles AS
SELECT
  eura.user_id,
  fr.role_code,
  fr.name_en,
  fr.module_code,
  fr.is_system,
  'enterprise' AS source_system,
  eura.assigned_at AS created_at,
  eura.valid_until
FROM __TENANT_SCHEMA__.enterprise_user_role_assignments eura
JOIN __TENANT_SCHEMA__.functional_roles fr ON fr.role_id = eura.role_id
WHERE fr.is_active = TRUE
  AND (eura.valid_until IS NULL OR eura.valid_until > NOW())

UNION ALL

SELECT
  ura.user_id,
  r.role_code,
  r.name_en,
  NULL AS module_code,
  r.is_system,
  'legacy' AS source_system,
  ura.created_at,
  ura.valid_until
FROM __TENANT_SCHEMA__.user_role_assignments ura
JOIN __TENANT_SCHEMA__.roles r ON r.role_id = ura.role_id
WHERE r.is_active = TRUE
  AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
  AND NOT EXISTS (
    SELECT 1 FROM __TENANT_SCHEMA__.enterprise_user_role_assignments eura2
    JOIN __TENANT_SCHEMA__.functional_roles fr2 ON fr2.role_id = eura2.role_id
    WHERE eura2.user_id = ura.user_id AND fr2.role_code = r.role_code
  );

-- Unified permissions view
CREATE OR REPLACE VIEW __TENANT_SCHEMA__.v_unified_role_permissions AS
SELECT
  fr.role_code,
  rp.permission_code,
  p.name_en AS permission_name,
  p.module_code,
  'enterprise' AS source_system
FROM __TENANT_SCHEMA__.role_permissions rp
JOIN __TENANT_SCHEMA__.functional_roles fr ON fr.role_id = rp.role_id
JOIN __TENANT_SCHEMA__.permissions p ON p.permission_code = rp.permission_code
WHERE fr.is_active = TRUE AND p.is_active = TRUE

UNION ALL

SELECT
  r.role_code,
  rfp.permission_code,
  rfp.permission_code AS permission_name,
  NULL AS module_code,
  'legacy' AS source_system
FROM __TENANT_SCHEMA__.role_function_permissions rfp
JOIN __TENANT_SCHEMA__.roles r ON r.role_id = rfp.role_id
WHERE r.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM __TENANT_SCHEMA__.role_permissions rp2
    JOIN __TENANT_SCHEMA__.functional_roles fr2 ON fr2.role_id = rp2.role_id
    WHERE fr2.role_code = r.role_code AND rp2.permission_code = rfp.permission_code
  );

COMMENT ON VIEW __TENANT_SCHEMA__.v_unified_user_roles IS 'Phase 7: Unified view of user roles from enterprise (163) + legacy (030). Enterprise takes precedence.';
COMMENT ON VIEW __TENANT_SCHEMA__.v_unified_role_permissions IS 'Phase 7: Unified view of role permissions from both auth systems. Enterprise takes precedence.';
