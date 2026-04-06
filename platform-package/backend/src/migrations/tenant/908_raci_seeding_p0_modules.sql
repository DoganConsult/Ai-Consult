-- ============================================================================
-- Migration 908: RACI Seeding — role_function_map for P0 Modules
-- ============================================================================
-- Audit source: fe-only-module-backend-proxy-audit (2026-04-01)
-- Purpose:  Seeds role_function_map entries for 4 modules that received
--           full permission sets in migration 907 but have no RACI entries:
--             DORA · KSA-Regulatory · Journey · Governance-AI
--
-- role_function_map links tenant roles (role_id) to role_functions
-- (function_code) and specifies RACI attributes per function.
-- All inserts are idempotent: ON CONFLICT DO NOTHING.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — Ensure role_functions rows exist for the 4 modules
-- ─────────────────────────────────────────────────────────────────────────────

-- DORA functions
INSERT INTO role_functions (function_code, module_code, name, description, active) VALUES
('dora.risk_manage',           'dora', 'ICT Risk Management',       'Manage ICT risks under DORA',                           true),
('dora.incident_report',       'dora', 'ICT Incident Reporting',    'Report and classify ICT incidents to regulators',       true),
('dora.resilience_test',       'dora', 'Resilience Testing',        'Plan and execute DORA resilience tests',                true),
('dora.third_party_assess',    'dora', 'Third-Party ICT Assessment','Assess and manage third-party ICT provider risk',       true),
('dora.intelligence_share',    'dora', 'Threat Intelligence Sharing','Share cyber threat intelligence under DORA',           true)
ON CONFLICT (function_code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  active      = EXCLUDED.active,
  updated_at  = NOW();

-- KSA Regulatory functions
INSERT INTO role_functions (function_code, module_code, name, description, active) VALUES
('ksa_reg.obligation_manage',  'ksa_regulatory', 'Obligation Management',    'Register and track KSA regulatory obligations',  true),
('ksa_reg.assessment_conduct', 'ksa_regulatory', 'Regulatory Assessment',    'Conduct regulatory self-assessments',            true),
('ksa_reg.finding_manage',     'ksa_regulatory', 'Finding Management',       'Manage regulatory findings and responses',       true),
('ksa_reg.framework_manage',   'ksa_regulatory', 'Framework Management',     'Manage KSA regulatory frameworks (NCA/SAMA etc)',true)
ON CONFLICT (function_code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  active      = EXCLUDED.active,
  updated_at  = NOW();

-- Journey functions
INSERT INTO role_functions (function_code, module_code, name, description, active) VALUES
('journey.plan_manage',        'journey', 'Journey Plan Management',   'Create and manage GRC maturity journey plans',   true),
('journey.milestone_track',    'journey', 'Milestone Tracking',        'Track milestone completion and maturity progress',true),
('journey.roadmap_manage',     'journey', 'Roadmap Management',        'Manage GRC improvement roadmap items',           true),
('journey.assessment_conduct', 'journey', 'Maturity Assessment',       'Conduct maturity assessments',                  true)
ON CONFLICT (function_code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  active      = EXCLUDED.active,
  updated_at  = NOW();

-- Governance AI functions
INSERT INTO role_functions (function_code, module_code, name, description, active) VALUES
('governance_ai.recommendation_act', 'governance_ai', 'AI Recommendation Review', 'Review and act on AI governance recommendations', true),
('governance_ai.signal_manage',      'governance_ai', 'Risk Signal Management',   'Configure and manage AI risk signals',            true),
('governance_ai.model_approve',      'governance_ai', 'AI Model Approval',        'Approve AI models for governance use',            true),
('governance_ai.insight_publish',    'governance_ai', 'Insight Publishing',        'Share AI-generated governance insights',          true)
ON CONFLICT (function_code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  active      = EXCLUDED.active,
  updated_at  = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — Seed role_function_map for DORA
-- ─────────────────────────────────────────────────────────────────────────────

-- agrc_admin: Accountable for all DORA functions
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('platform_admin', 'admin') AND r.active = true
  AND rf.module_code = 'dora' AND rf.active = true
ON CONFLICT DO NOTHING;

-- dora_officer: Responsible for all DORA functions
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'dora_officer' AND r.active = true
  AND rf.module_code = 'dora' AND rf.active = true
ON CONFLICT DO NOTHING;

-- dora_reviewer: Consulted on risk + incident; Approves testing + third-party
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  (rf.function_code IN ('dora.incident_report', 'dora.risk_manage')),
  (rf.function_code IN ('dora.resilience_test', 'dora.third_party_assess')),
  false, false,
  (rf.function_code IN ('dora.risk_manage', 'dora.third_party_assess')),
  true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'dora_reviewer' AND r.active = true
  AND rf.module_code = 'dora' AND rf.active = true
ON CONFLICT DO NOTHING;

-- c_suite / executive_reviewer: Informed on all DORA functions
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('c_suite', 'executive_reviewer', 'director') AND r.active = true
  AND rf.module_code = 'dora' AND rf.active = true
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — Seed role_function_map for KSA Regulatory
-- ─────────────────────────────────────────────────────────────────────────────

-- agrc_admin: Accountable
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('platform_admin', 'admin') AND r.active = true
  AND rf.module_code = 'ksa_regulatory' AND rf.active = true
ON CONFLICT DO NOTHING;

-- ksa_regulatory_officer: Responsible for all KSA regulatory functions
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'ksa_regulatory_officer' AND r.active = true
  AND rf.module_code = 'ksa_regulatory' AND rf.active = true
ON CONFLICT DO NOTHING;

-- ksa_regulatory_analyst: Authors and tracks KSA obligations
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  (rf.function_code IN ('ksa_reg.obligation_manage', 'ksa_reg.assessment_conduct')),
  false, true, false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'ksa_regulatory_analyst' AND r.active = true
  AND rf.module_code = 'ksa_regulatory' AND rf.active = true
ON CONFLICT DO NOTHING;

-- compliance_manager: Consulted on KSA obligations + findings
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'compliance_manager' AND r.active = true
  AND rf.function_code IN ('ksa_reg.obligation_manage', 'ksa_reg.finding_manage')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — Seed role_function_map for Journey
-- ─────────────────────────────────────────────────────────────────────────────

-- agrc_admin: Accountable
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('platform_admin', 'admin') AND r.active = true
  AND rf.module_code = 'journey' AND rf.active = true
ON CONFLICT DO NOTHING;

-- journey_owner: Responsible + Accountable for journey plans and roadmap
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  true,
  (rf.function_code IN ('journey.plan_manage', 'journey.roadmap_manage')),
  true,
  (rf.function_code IN ('journey.plan_manage')),
  false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'journey_owner' AND r.active = true
  AND rf.module_code = 'journey' AND rf.active = true
ON CONFLICT DO NOTHING;

-- journey_analyst: Tracks milestones and conducts assessments
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  (rf.function_code = 'journey.assessment_conduct'),
  false,
  (rf.function_code IN ('journey.milestone_track', 'journey.assessment_conduct')),
  false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'journey_analyst' AND r.active = true
  AND rf.module_code = 'journey' AND rf.active = true
ON CONFLICT DO NOTHING;

-- governance_manager: Approves journey plans; consulted on roadmap
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  false,
  (rf.function_code = 'journey.plan_manage'),
  false, false,
  (rf.function_code = 'journey.roadmap_manage'),
  true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'governance_manager' AND r.active = true
  AND rf.function_code IN ('journey.plan_manage', 'journey.roadmap_manage')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — Seed role_function_map for Governance AI
-- ─────────────────────────────────────────────────────────────────────────────

-- agrc_admin: Accountable
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('platform_admin', 'admin') AND r.active = true
  AND rf.module_code = 'governance_ai' AND rf.active = true
ON CONFLICT DO NOTHING;

-- governance_ai_officer: Responsible for all AI governance functions
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  true,
  (rf.function_code IN ('governance_ai.model_approve', 'governance_ai.recommendation_act')),
  true, false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'governance_ai_officer' AND r.active = true
  AND rf.module_code = 'governance_ai' AND rf.active = true
ON CONFLICT DO NOTHING;

-- governance_ai_operator: Acts on recommendations + manages signals
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  false, false,
  (rf.function_code IN ('governance_ai.recommendation_act', 'governance_ai.signal_manage')),
  false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'governance_ai_operator' AND r.active = true
  AND rf.function_code IN ('governance_ai.recommendation_act', 'governance_ai.signal_manage')
ON CONFLICT DO NOTHING;

-- ai_admin: Approves AI models; consulted on signal thresholds
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  false,
  (rf.function_code = 'governance_ai.model_approve'),
  (rf.function_code = 'governance_ai.model_approve'),
  false,
  (rf.function_code = 'governance_ai.signal_manage'),
  false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'ai_admin' AND r.active = true
  AND rf.function_code IN ('governance_ai.model_approve', 'governance_ai.signal_manage')
ON CONFLICT DO NOTHING;

-- governance_manager: Informed + consulted on AI recommendations
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'governance_manager' AND r.active = true
  AND rf.function_code IN ('governance_ai.recommendation_act', 'governance_ai.insight_publish')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6 — Validation
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  rf_count   INT;
  rfm_count  INT;
  dora_rfm   INT;
  ksa_rfm    INT;
  journey_rfm INT;
  gov_ai_rfm INT;
BEGIN
  SELECT COUNT(*) INTO rf_count  FROM role_functions  WHERE module_code IN ('dora','ksa_regulatory','journey','governance_ai');
  SELECT COUNT(*) INTO rfm_count FROM role_function_map;

  SELECT COUNT(*) INTO dora_rfm
  FROM role_function_map rfm
  JOIN role_functions rf ON rf.function_code = rfm.function_code
  WHERE rf.module_code = 'dora';

  SELECT COUNT(*) INTO ksa_rfm
  FROM role_function_map rfm
  JOIN role_functions rf ON rf.function_code = rfm.function_code
  WHERE rf.module_code = 'ksa_regulatory';

  SELECT COUNT(*) INTO journey_rfm
  FROM role_function_map rfm
  JOIN role_functions rf ON rf.function_code = rfm.function_code
  WHERE rf.module_code = 'journey';

  SELECT COUNT(*) INTO gov_ai_rfm
  FROM role_function_map rfm
  JOIN role_functions rf ON rf.function_code = rfm.function_code
  WHERE rf.module_code = 'governance_ai';

  RAISE NOTICE '=== Migration 908: RACI Seeding for P0 Modules ===';
  RAISE NOTICE 'role_functions created (4 modules):         %', rf_count;
  RAISE NOTICE 'Total role_function_map rows after:         %', rfm_count;
  RAISE NOTICE 'DORA role-function mappings:                %', dora_rfm;
  RAISE NOTICE 'KSA Regulatory role-function mappings:      %', ksa_rfm;
  RAISE NOTICE 'Journey role-function mappings:             %', journey_rfm;
  RAISE NOTICE 'Governance AI role-function mappings:       %', gov_ai_rfm;

  IF dora_rfm = 0 OR ksa_rfm = 0 OR journey_rfm = 0 OR gov_ai_rfm = 0 THEN
    RAISE WARNING 'One or more P0 modules still have zero RACI mappings — check roles table for matching role_code values';
  END IF;
END $$;
