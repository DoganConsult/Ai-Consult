-- ============================================
-- Tenant Migration 267
-- Deprecation Compatibility Views:
-- Backward-compatible views that let legacy
-- services read from the new policy engine
-- tables without code changes.
-- ============================================

DO $$ BEGIN
  CREATE OR REPLACE VIEW v_user_effective_permissions AS
  SELECT
    eup.user_id,
    eup.permission_code,
    eup.module_code,
    eup.source_type,
    eup.source_ref,
    eup.authority_level,
    eup.computed_at
  FROM effective_user_permissions eup;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  CREATE OR REPLACE VIEW v_user_visible_modules AS
  SELECT
    eum.user_id,
    eum.module_code,
    eum.access_level,
    eum.source,
    pm.name_en AS module_name_en,
    pm.name_ar AS module_name_ar,
    pm.category,
    pm.icon,
    pm.sort_order
  FROM effective_user_modules eum
  LEFT JOIN product_modules pm ON pm.code = eum.module_code;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP VIEW IF EXISTS v_module_catalog;
  CREATE VIEW v_module_catalog AS
  SELECT
    pm.code,
    pm.name_en,
    pm.name_ar,
    pm.category,
    pm.description_en,
    pm.description_ar,
    pm.icon,
    pm.dependencies,
    pm.tier_minimum,
    pm.is_core,
    pm.sort_order,
    CASE WHEN mas.is_active THEN 'active' WHEN mas.is_active = FALSE THEN 'inactive' ELSE 'unknown' END AS activation_status,
    COALESCE(mhs.health_score, 0) AS health_score,
    COALESCE(mhs.entitled, FALSE) AS entitled,
    COALESCE(mhs.provisioned, FALSE) AS provisioned,
    COALESCE(mhs.actionable, FALSE) AS actionable
  FROM product_modules pm
  LEFT JOIN module_activation_status mas ON mas.module_code = pm.code
  LEFT JOIN module_health_status mhs ON mhs.module_code = pm.code
  ORDER BY pm.sort_order;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP VIEW IF EXISTS v_role_bundle_permissions;
  CREATE VIEW v_role_bundle_permissions AS
  SELECT
    frb.code AS bundle_code,
    frb.name_en AS bundle_name,
    frbi.functional_role_code,
    p.code AS permission_code,
    frbi.authority_level
  FROM functional_role_bundles frb
  JOIN functional_role_bundle_items frbi ON frbi.bundle_code = frb.code
  LEFT JOIN functional_roles fr ON fr.code = frbi.functional_role_code
  LEFT JOIN role_permissions rp ON rp.functional_role_id = fr.id
  LEFT JOIN permissions p ON p.id = rp.permission_id;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP VIEW IF EXISTS v_archetype_policy_summary;
  CREATE VIEW v_archetype_policy_summary AS
  SELECT
    tb.archetype_code,
    map.module_code,
    map.activation AS module_activation,
    mwp.approval_style,
    mwp.sod_strictness,
    mwp.sla_multiplier,
    aap.autonomy_level AS ai_autonomy,
    aap.action_class AS ai_action_class
  FROM tenant_blueprints tb
  JOIN module_activation_policies map ON map.archetype_code = tb.archetype_code
  LEFT JOIN module_workflow_profiles mwp
    ON mwp.archetype_code = tb.archetype_code AND mwp.module_code = map.module_code
  LEFT JOIN ai_action_policies aap
    ON aap.archetype_code = tb.archetype_code AND aap.module_code = map.module_code
  WHERE tb.is_active = TRUE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP VIEW IF EXISTS v_workflow_state_machine;
  CREATE VIEW v_workflow_state_machine AS
  SELECT
    wps.archetype_code,
    wps.module_code,
    wps.state_code,
    wps.state_name_en,
    wps.ordinal,
    wps.is_initial,
    wps.is_terminal,
    wps.requires_evidence,
    wps.sla_hours,
    wpt.to_state AS transition_to,
    wpt.transition_key,
    wpt.required_authority,
    wpt.min_approvers,
    wpt.require_different_user,
    wpt.require_evidence AS transition_requires_evidence,
    wpt.auto_escalation_hours
  FROM workflow_profile_states wps
  LEFT JOIN workflow_profile_transitions wpt
    ON wpt.archetype_code = wps.archetype_code
    AND wpt.module_code = wps.module_code
    AND wpt.from_state = wps.state_code
  ORDER BY wps.archetype_code, wps.module_code, wps.ordinal;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP VIEW IF EXISTS v_ai_autonomy_resolved;
  CREATE VIEW v_ai_autonomy_resolved AS
  SELECT
    aas.module_code,
    aas.action_class,
    aas.resolved_autonomy,
    aas.resolved_from,
    aas.last_resolved_at,
    pm.name_en AS module_name
  FROM ai_autonomy_state aas
  LEFT JOIN product_modules pm ON pm.code = aas.module_code;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP VIEW IF EXISTS v_approver_chain;
  CREATE VIEW v_approver_chain AS
  SELECT
    arc.module_code,
    arc.transition_key,
    arc.resolved_user_ids,
    arc.required_authority,
    arc.min_approvers,
    arc.computed_at,
    arc.expires_at,
    pm.name_en AS module_name
  FROM approver_resolution_cache arc
  LEFT JOIN product_modules pm ON pm.code = arc.module_code
  WHERE arc.expires_at IS NULL OR arc.expires_at > NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP VIEW IF EXISTS v_active_overrides;
  CREATE VIEW v_active_overrides AS
  SELECT
    ro.id,
    ro.override_type,
    ro.target_key,
    ro.override_value,
    ro.reason,
    ro.created_by,
    ro.valid_from,
    ro.valid_until,
    ro.created_at
  FROM runtime_overrides ro
  WHERE ro.is_active = TRUE
    AND (ro.valid_until IS NULL OR ro.valid_until > NOW());
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
