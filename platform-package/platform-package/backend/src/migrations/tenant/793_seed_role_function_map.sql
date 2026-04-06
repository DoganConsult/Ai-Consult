-- Migration 255: Seed role_function_map — tenant role → function RACI
-- ==================================================================
-- Populates role_function_map linking tenant roles to role_functions.
-- This is the key business-authority bridge for the authorization-matrix.
-- ==================================================================

-- Admin/Platform Admin: ALL functions, full RACI
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('platform_admin', 'admin') AND r.active = true AND rf.active = true
ON CONFLICT DO NOTHING;

-- GRC Manager: governance, risk, control, compliance, audit, evidence, issue, report, admin
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true,
  (rf.function_code LIKE '%review' OR rf.function_code LIKE '%effectiveness%'),
  true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'grc_manager' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('governance','risk','control','compliance','audit','evidence','issue','report','admin')
ON CONFLICT DO NOTHING;

-- CISO: governance, risk, control, compliance, evidence, report (full), issue, vendor (oversight)
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  (rf.module_code IN ('governance','risk','control','compliance','evidence')),
  (rf.function_code LIKE '%approve' OR rf.function_code LIKE '%decide'),
  (rf.module_code IN ('risk','control','governance')),
  (rf.module_code IN ('risk','governance')),
  (rf.module_code IN ('audit','compliance')),
  true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'ciso' AND r.active = true AND rf.active = true
ON CONFLICT DO NOTHING;

-- Executive Owner: governance + risk approve + audit approve, all as informed
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false,
  (rf.function_code IN ('governance.policy_approve','risk.treatment_approve','risk.acceptance_decide','audit.report_approve')),
  false, true, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'executive_owner' AND r.active = true AND rf.active = true
ON CONFLICT DO NOTHING;

-- Risk Owner: risk + control + vendor + issue domain
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code = 'risk'),
  (rf.function_code IN ('risk.assessment_review','risk.treatment_approve')),
  (rf.module_code = 'risk'), (rf.module_code = 'risk'), false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'risk_owner' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('risk','control','vendor','issue')
ON CONFLICT DO NOTHING;

-- Control Owner: control + evidence + compliance domain
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code IN ('control','evidence')),
  (rf.function_code = 'control.effectiveness_approve'),
  (rf.module_code IN ('control','evidence')), (rf.module_code = 'control'), false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'control_owner' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('control','evidence','compliance')
ON CONFLICT DO NOTHING;

-- Auditor: audit + evidence + compliance + report
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code = 'audit'),
  (rf.function_code = 'audit.report_approve'),
  (rf.module_code = 'audit'), (rf.module_code = 'audit'), false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'auditor' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('audit','evidence','compliance','report')
ON CONFLICT DO NOTHING;

-- External Auditor: same as auditor but with read-heavy, no approve
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'external_auditor' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('audit','evidence','compliance','report')
ON CONFLICT DO NOTHING;

-- Compliance Officer: compliance, evidence, governance, report
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code IN ('compliance','evidence')),
  (rf.function_code LIKE 'compliance.%'),
  (rf.module_code = 'compliance'), (rf.module_code = 'compliance'), false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'compliance_officer' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('compliance','evidence','governance','report')
ON CONFLICT DO NOTHING;

-- Board Member: governance + report (informed only)
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'board_member' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('governance','report','risk','compliance')
ON CONFLICT DO NOTHING;

-- CEO/CFO/CTO: oversight roles — all informed, governance + risk approve
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false,
  (rf.function_code IN ('governance.policy_approve','risk.acceptance_decide')),
  false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('ceo', 'cfo', 'cto') AND r.active = true AND rf.active = true
ON CONFLICT DO NOTHING;

-- IT Security: risk, control, evidence, issue, vendor domain
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code IN ('control','evidence','issue')),
  false, (rf.module_code = 'control'), false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'it_security' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('risk','control','evidence','issue','vendor','report')
ON CONFLICT DO NOTHING;

-- DPO: compliance, evidence, governance, report
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code IN ('compliance','evidence')),
  false, (rf.module_code = 'compliance'), false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'dpo' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('compliance','evidence','governance','report')
ON CONFLICT DO NOTHING;

-- Contributor: evidence collect, issue create/resolve, report view
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, false, true, false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'contributor' AND r.active = true AND rf.active = true
  AND rf.function_code IN ('evidence.collect','issue.create','issue.resolve','report.view')
ON CONFLICT DO NOTHING;

-- Viewer: read-only functions
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'viewer' AND r.active = true AND rf.active = true
  AND rf.function_code IN ('risk.register_view','compliance.status_view','report.view')
ON CONFLICT DO NOTHING;

-- Consultant: read-only on reporting + compliance
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'consultant' AND r.active = true AND rf.active = true
  AND rf.function_code IN ('compliance.status_view','report.view','report.create')
ON CONFLICT DO NOTHING;

-- Vendor User: vendor assessment only
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, false, true, false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'vendor_user' AND r.active = true AND rf.active = true
  AND rf.function_code IN ('vendor.assess','evidence.collect')
ON CONFLICT DO NOTHING;

-- Seed role_function_scope_map with global scope for all role_function_map entries
INSERT INTO role_function_scope_map (role_id, function_code, scope_type, enabled)
SELECT rfm.role_id, rfm.function_code, 'global', true
FROM role_function_map rfm
WHERE rfm.enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM role_function_scope_map s
    WHERE s.role_id = rfm.role_id AND s.function_code = rfm.function_code
  )
ON CONFLICT DO NOTHING;
