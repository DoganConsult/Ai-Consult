-- ============================================
-- Tenant Migration 258
-- Backfill: Generate blueprint for this tenant
-- using workspace_profile + basic heuristics.
-- Runs per-tenant via the migration runner.
-- ============================================

-- Default to 'standard_enterprise' if we can't determine archetype
-- The blueprint.service.ts will re-resolve on next bootstrap if needed.
DO $$
DECLARE
  v_archetype TEXT := 'standard_enterprise';
  v_industry TEXT;
  v_org_size TEXT;
  v_risk_appetite TEXT;
  v_enforcement TEXT;
  v_reason TEXT := 'auto-resolved from workspace_profile during migration 258';
BEGIN
  -- Read workspace profile signals
  SELECT industry, org_size, risk_appetite, enforcement_mode
    INTO v_industry, v_org_size, v_risk_appetite, v_enforcement
    FROM workspace_profile
    LIMIT 1;

  -- Archetype resolution heuristics
  IF v_industry IN ('government', 'public_sector', 'regulatory_body') THEN
    v_archetype := 'government_authority';
    v_reason := 'sector is government/public_sector';
  ELSIF v_enforcement IN ('strict', 'autonomous')
     OR v_risk_appetite = 'very_high'
     OR v_industry IN ('banking', 'financial_services', 'healthcare', 'energy', 'telecom', 'insurance') THEN
    v_archetype := 'regulated_enterprise';
    v_reason := 'regulated sector or strict enforcement mode';
  ELSIF v_org_size IN ('large', 'enterprise') THEN
    v_archetype := 'standard_enterprise';
    v_reason := 'large/enterprise org size';
  ELSIF v_org_size IN ('small', 'medium') THEN
    v_archetype := 'lean_org';
    v_reason := 'small/medium org size';
  ELSE
    v_archetype := 'standard_enterprise';
    v_reason := 'default archetype (insufficient signals)';
  END IF;

  -- Insert blueprint (singleton per tenant)
  INSERT INTO tenant_blueprints (archetype_code, resolution_input, resolution_reason)
  VALUES (
    v_archetype,
    jsonb_build_object(
      'industry', COALESCE(v_industry, 'unknown'),
      'org_size', COALESCE(v_org_size, 'unknown'),
      'risk_appetite', COALESCE(v_risk_appetite, 'unknown'),
      'enforcement_mode', COALESCE(v_enforcement, 'unknown')
    ),
    v_reason
  )
  ON CONFLICT ON CONSTRAINT tenant_blueprints_singleton_key_key DO UPDATE
    SET archetype_code = EXCLUDED.archetype_code,
        resolution_input = EXCLUDED.resolution_input,
        resolution_reason = EXCLUDED.resolution_reason,
        updated_at = NOW();

  RAISE NOTICE 'Migration 258: tenant archetype resolved as % (%)', v_archetype, v_reason;
END $$;

-- Populate module_activation_status from policies + blueprint
INSERT INTO module_activation_status (module_code, is_active, activation_score, licensed, policy_source, resolved_at)
SELECT
  map.module_code,
  CASE WHEN map.activation_status IN ('mandatory', 'recommended') THEN TRUE ELSE FALSE END,
  CASE map.activation_status
    WHEN 'mandatory'   THEN 100
    WHEN 'recommended' THEN 80
    WHEN 'optional'    THEN 50
    WHEN 'hidden'      THEN 0
    WHEN 'blocked'     THEN 0
  END,
  TRUE,
  'blueprint',
  NOW()
FROM module_activation_policies map
JOIN tenant_blueprints tb ON tb.archetype_code = map.archetype_code AND tb.is_active = TRUE
ON CONFLICT (module_code) DO UPDATE
  SET is_active = EXCLUDED.is_active,
      activation_score = EXCLUDED.activation_score,
      policy_source = 'blueprint',
      resolved_at = NOW(),
      updated_at = NOW();

-- Log the decision
INSERT INTO policy_decision_log (decision_type, module_code, input_context, decision, reason, policy_ref)
SELECT
  'module_activation',
  map.module_code,
  jsonb_build_object('archetype', tb.archetype_code, 'activation_status', map.activation_status),
  CASE WHEN map.activation_status IN ('mandatory', 'recommended') THEN 'activated' ELSE 'deactivated' END,
  'Resolved from blueprint archetype ' || tb.archetype_code,
  'migration_258'
FROM module_activation_policies map
JOIN tenant_blueprints tb ON tb.archetype_code = map.archetype_code AND tb.is_active = TRUE;
