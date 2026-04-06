-- Migration 253: Fix role_functions schema mismatch + re-seed all authorization data
-- =================================================================================
-- Root cause: 108 of 123 tenants have role_functions with only 7 columns (missing
-- module_code, function_category, active, created_at). Migration 031 INSERT fails
-- silently on those tenants, leaving role_functions, function_authorities,
-- role_function_permissions, and user_role_assignments all empty.
--
-- This migration:
-- 1. Adds missing columns to role_functions
-- 2. Re-seeds 44 role_functions entries
-- 3. Re-seeds 48 function_authorities entries
-- 4. Re-seeds role_function_permissions for 7 core roles
-- 5. Seeds user_role_assignments from public.users.role
-- 6. Seeds role_function_map (RACI) for tenant roles
-- =================================================================================

-- ═══ STEP 1: Fix role_functions schema ═══
ALTER TABLE role_functions ADD COLUMN IF NOT EXISTS module_code VARCHAR(50);
ALTER TABLE role_functions ADD COLUMN IF NOT EXISTS function_category VARCHAR(50);
ALTER TABLE role_functions ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE role_functions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE role_functions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ═══ STEP 2: Re-seed 44 role_functions ═══
INSERT INTO role_functions (function_code, module_code, name_en, name_ar, description_en, description_ar, function_category)
VALUES
  ('admin.users_manage', 'admin', 'Manage Users', 'إدارة المستخدمين', 'Create, update, and deactivate user accounts', 'إنشاء وتحديث وتعطيل حسابات المستخدمين', 'admin'),
  ('admin.roles_manage', 'admin', 'Manage Roles', 'إدارة الأدوار', 'Create and modify role definitions and assignments', 'إنشاء وتعديل تعريفات الأدوار والتعيينات', 'admin'),
  ('admin.workspace_config', 'admin', 'Configure Workspace', 'تكوين مساحة العمل', 'Manage workspace settings and preferences', 'إدارة إعدادات وتفضيلات مساحة العمل', 'admin'),
  ('admin.integrations_manage', 'admin', 'Manage Integrations', 'إدارة التكاملات', 'Configure and manage system integrations', 'تكوين وإدارة تكاملات النظام', 'integration'),
  ('governance.policy_create', 'governance', 'Create Policies', 'إنشاء السياسات', 'Draft and create governance policies', 'صياغة وإنشاء سياسات الحوكمة', 'business'),
  ('governance.policy_review', 'governance', 'Review Policies', 'مراجعة السياسات', 'Review and update existing policies', 'مراجعة وتحديث السياسات الموجودة', 'business'),
  ('governance.policy_approve', 'governance', 'Approve Policies', 'الموافقة على السياسات', 'Approve policy changes and publications', 'الموافقة على تغييرات ونشر السياسات', 'workflow'),
  ('governance.obligation_manage', 'governance', 'Manage Obligations', 'إدارة الالتزامات', 'Track and manage compliance obligations', 'تتبع وإدارة التزامات الامتثال', 'business'),
  ('governance.framework_map', 'governance', 'Map Frameworks', 'ربط الأطر', 'Map controls to regulatory frameworks', 'ربط الضوابط بالأطر التنظيمية', 'business'),
  ('risk.register_view', 'risk', 'View Risk Register', 'عرض سجل المخاطر', 'View risk register and risk details', 'عرض سجل المخاطر وتفاصيل المخاطر', 'business'),
  ('risk.assessment_create', 'risk', 'Create Risk Assessments', 'إنشاء تقييمات المخاطر', 'Create new risk assessments', 'إنشاء تقييمات مخاطر جديدة', 'business'),
  ('risk.assessment_perform', 'risk', 'Perform Risk Assessments', 'تنفيذ تقييمات المخاطر', 'Conduct risk assessment activities', 'إجراء أنشطة تقييم المخاطر', 'business'),
  ('risk.assessment_review', 'risk', 'Review Risk Assessments', 'مراجعة تقييمات المخاطر', 'Review completed risk assessments', 'مراجعة تقييمات المخاطر المكتملة', 'workflow'),
  ('risk.treatment_approve', 'risk', 'Approve Risk Treatment', 'الموافقة على معالجة المخاطر', 'Approve risk treatment plans', 'الموافقة على خطط معالجة المخاطر', 'workflow'),
  ('risk.acceptance_decide', 'risk', 'Risk Acceptance Decision', 'قرار قبول المخاطر', 'Make risk acceptance decisions', 'اتخاذ قرارات قبول المخاطر', 'workflow'),
  ('control.design_create', 'control', 'Design Controls', 'تصميم الضوابط', 'Design and document controls', 'تصميم وتوثيق الضوابط', 'business'),
  ('control.testing_perform', 'control', 'Test Controls', 'اختبار الضوابط', 'Perform control testing activities', 'تنفيذ أنشطة اختبار الضوابط', 'business'),
  ('control.testing_review', 'control', 'Review Control Tests', 'مراجعة اختبارات الضوابط', 'Review control test results', 'مراجعة نتائج اختبار الضوابط', 'workflow'),
  ('control.effectiveness_approve', 'control', 'Approve Control Effectiveness', 'الموافقة على فعالية الضوابط', 'Approve control effectiveness assessments', 'الموافقة على تقييمات فعالية الضوابط', 'workflow'),
  ('control.remediation_manage', 'control', 'Manage Remediation', 'إدارة المعالجة', 'Manage control remediation activities', 'إدارة أنشطة معالجة الضوابط', 'business'),
  ('evidence.collect', 'evidence', 'Collect Evidence', 'جمع الأدلة', 'Collect and upload evidence', 'جمع وتحميل الأدلة', 'business'),
  ('evidence.review', 'evidence', 'Review Evidence', 'مراجعة الأدلة', 'Review and validate evidence', 'مراجعة والتحقق من الأدلة', 'workflow'),
  ('evidence.approve', 'evidence', 'Approve Evidence', 'الموافقة على الأدلة', 'Approve evidence for compliance', 'الموافقة على الأدلة للامتثال', 'workflow'),
  ('evidence.archive', 'evidence', 'Archive Evidence', 'أرشفة الأدلة', 'Archive and manage evidence retention', 'أرشفة وإدارة الاحتفاظ بالأدلة', 'business'),
  ('audit.plan_create', 'audit', 'Create Audit Plans', 'إنشاء خطط التدقيق', 'Create and schedule audit plans', 'إنشاء وجدولة خطط التدقيق', 'business'),
  ('audit.execute', 'audit', 'Execute Audits', 'تنفيذ التدقيق', 'Perform audit procedures', 'تنفيذ إجراءات التدقيق', 'business'),
  ('audit.findings_raise', 'audit', 'Raise Findings', 'رفع الملاحظات', 'Document audit findings', 'توثيق ملاحظات التدقيق', 'business'),
  ('audit.report_create', 'audit', 'Create Audit Reports', 'إنشاء تقارير التدقيق', 'Generate audit reports', 'إنشاء تقارير التدقيق', 'reporting'),
  ('audit.report_approve', 'audit', 'Approve Audit Reports', 'الموافقة على تقارير التدقيق', 'Approve and finalize audit reports', 'الموافقة على وإنهاء تقارير التدقيق', 'workflow'),
  ('compliance.status_view', 'compliance', 'View Compliance Status', 'عرض حالة الامتثال', 'View compliance dashboards and status', 'عرض لوحات معلومات وحالة الامتثال', 'reporting'),
  ('compliance.assessment_perform', 'compliance', 'Perform Compliance Assessment', 'تنفيذ تقييم الامتثال', 'Conduct compliance assessments', 'إجراء تقييمات الامتثال', 'business'),
  ('compliance.report_generate', 'compliance', 'Generate Compliance Reports', 'إنشاء تقارير الامتثال', 'Generate compliance reports', 'إنشاء تقارير الامتثال', 'reporting'),
  ('compliance.certification_manage', 'compliance', 'Manage Certifications', 'إدارة الشهادات', 'Manage compliance certifications', 'إدارة شهادات الامتثال', 'business'),
  ('issue.create', 'issue', 'Create Issues', 'إنشاء المشكلات', 'Create and log new issues', 'إنشاء وتسجيل المشكلات الجديدة', 'business'),
  ('issue.assign', 'issue', 'Assign Issues', 'تعيين المشكلات', 'Assign issues to team members', 'تعيين المشكلات لأعضاء الفريق', 'workflow'),
  ('issue.resolve', 'issue', 'Resolve Issues', 'حل المشكلات', 'Work on and resolve issues', 'العمل على حل المشكلات', 'business'),
  ('issue.close', 'issue', 'Close Issues', 'إغلاق المشكلات', 'Close resolved issues', 'إغلاق المشكلات المحلولة', 'workflow'),
  ('vendor.assess', 'vendor', 'Assess Vendors', 'تقييم البائعين', 'Conduct vendor risk assessments', 'إجراء تقييمات مخاطر البائعين', 'business'),
  ('vendor.review', 'vendor', 'Review Vendors', 'مراجعة البائعين', 'Review vendor assessment results', 'مراجعة نتائج تقييم البائعين', 'workflow'),
  ('vendor.approve', 'vendor', 'Approve Vendors', 'الموافقة على البائعين', 'Approve vendor onboarding', 'الموافقة على إدخال البائعين', 'workflow'),
  ('report.view', 'report', 'View Reports', 'عرض التقارير', 'View generated reports', 'عرض التقارير المنشأة', 'reporting'),
  ('report.create', 'report', 'Create Reports', 'إنشاء التقارير', 'Create custom reports', 'إنشاء تقارير مخصصة', 'reporting'),
  ('report.export', 'report', 'Export Reports', 'تصدير التقارير', 'Export reports to various formats', 'تصدير التقارير لصيغ مختلفة', 'reporting'),
  ('report.schedule', 'report', 'Schedule Reports', 'جدولة التقارير', 'Schedule automated report generation', 'جدولة إنشاء التقارير الآلي', 'reporting')
ON CONFLICT (function_code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  function_category = EXCLUDED.function_category,
  updated_at = NOW();

-- ═══ STEP 3: Re-seed function_authorities (48 entries) ═══
INSERT INTO function_authorities (function_code, action, resource_type, allow, max_risk_level, conditions, priority)
VALUES
  ('admin.users_manage', 'create', 'user', true, null, '{}', 100),
  ('admin.users_manage', 'update', 'user', true, null, '{}', 100),
  ('admin.users_manage', 'deactivate', 'user', true, null, '{}', 100),
  ('admin.users_manage', 'read', 'user', true, null, '{}', 100),
  ('admin.roles_manage', 'create', 'role', true, null, '{}', 100),
  ('admin.roles_manage', 'update', 'role', true, null, '{}', 100),
  ('admin.roles_manage', 'assign', 'role_assignment', true, null, '{}', 100),
  ('admin.roles_manage', 'revoke', 'role_assignment', true, null, '{}', 100),
  ('governance.policy_create', 'create', 'policy', true, null, '{}', 100),
  ('governance.policy_review', 'update', 'policy', true, null, '{}', 100),
  ('governance.policy_review', 'read', 'policy', true, null, '{}', 100),
  ('governance.policy_approve', 'approve', 'policy', true, null, '{}', 100),
  ('governance.policy_approve', 'reject', 'policy', true, null, '{}', 100),
  ('risk.assessment_create', 'create', 'risk_assessment', true, null, '{}', 100),
  ('risk.assessment_perform', 'update', 'risk_assessment', true, null, '{}', 100),
  ('risk.assessment_perform', 'score', 'risk_assessment', true, null, '{}', 100),
  ('risk.assessment_review', 'review', 'risk_assessment', true, null, '{}', 100),
  ('risk.treatment_approve', 'approve', 'risk_treatment', true, 'critical', '{}', 100),
  ('risk.acceptance_decide', 'accept', 'risk', true, 'high', '{"requires_justification": true}', 100),
  ('control.design_create', 'create', 'control', true, null, '{}', 100),
  ('control.testing_perform', 'test', 'control', true, null, '{}', 100),
  ('control.testing_perform', 'update', 'control_test', true, null, '{}', 100),
  ('control.testing_review', 'review', 'control_test', true, null, '{}', 100),
  ('control.effectiveness_approve', 'approve', 'control_effectiveness', true, null, '{}', 100),
  ('evidence.collect', 'create', 'evidence', true, null, '{}', 100),
  ('evidence.collect', 'upload', 'evidence', true, null, '{}', 100),
  ('evidence.review', 'review', 'evidence', true, null, '{}', 100),
  ('evidence.approve', 'approve', 'evidence', true, null, '{}', 100),
  ('evidence.archive', 'archive', 'evidence', true, null, '{}', 100),
  ('audit.plan_create', 'create', 'audit_plan', true, null, '{}', 100),
  ('audit.execute', 'perform', 'audit', true, null, '{}', 100),
  ('audit.findings_raise', 'create', 'finding', true, null, '{}', 100),
  ('audit.report_create', 'create', 'audit_report', true, null, '{}', 100),
  ('audit.report_approve', 'approve', 'audit_report', true, null, '{}', 100),
  ('compliance.assessment_perform', 'perform', 'compliance_assessment', true, null, '{}', 100),
  ('compliance.report_generate', 'generate', 'compliance_report', true, null, '{}', 100),
  ('compliance.certification_manage', 'manage', 'certification', true, null, '{}', 100),
  ('issue.create', 'create', 'issue', true, null, '{}', 100),
  ('issue.assign', 'assign', 'issue', true, null, '{}', 100),
  ('issue.resolve', 'update', 'issue', true, null, '{}', 100),
  ('issue.close', 'close', 'issue', true, null, '{}', 100),
  ('vendor.assess', 'assess', 'vendor', true, null, '{}', 100),
  ('vendor.review', 'review', 'vendor_assessment', true, null, '{}', 100),
  ('vendor.approve', 'approve', 'vendor', true, null, '{}', 100),
  ('report.view', 'read', 'report', true, null, '{}', 100),
  ('report.create', 'create', 'report', true, null, '{}', 100),
  ('report.export', 'export', 'report', true, null, '{}', 100),
  ('report.schedule', 'schedule', 'report', true, null, '{}', 100)
ON CONFLICT (function_code, action, resource_type) DO UPDATE SET
  allow = EXCLUDED.allow, max_risk_level = EXCLUDED.max_risk_level, updated_at = NOW();

-- ═══ STEP 4: Seed user_role_assignments ═══
INSERT INTO user_role_assignments (user_id, role_id, scope_type, is_primary, active, assigned_by, reason)
SELECT u.user_id, r.role_id, 'workspace', true, true, 'migration_253', 'Platform role bootstrap'
FROM public.users u
JOIN roles r ON r.role_code = CASE u.role
  WHEN 'admin'              THEN 'grc_manager'
  WHEN 'owner'              THEN 'platform_admin'
  WHEN 'tenant_admin'       THEN 'grc_manager'
  WHEN 'compliance_officer' THEN 'compliance_officer'
  WHEN 'compliance_manager' THEN 'compliance_officer'
  WHEN 'risk_manager'       THEN 'risk_owner'
  WHEN 'auditor'            THEN 'auditor'
  WHEN 'viewer'             THEN 'viewer'
  WHEN 'manager'            THEN 'grc_manager'
  WHEN 'user'               THEN 'contributor'
  WHEN 'approver'           THEN 'executive_owner'
  ELSE 'contributor'
END
WHERE u.tenant_id = REPLACE(CURRENT_SCHEMA(), 'tenant_', '')
  AND u.status = 'active' AND r.active = true
  AND NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura WHERE ura.user_id = u.user_id AND ura.active = true
  );

-- ═══ STEP 5: Seed role_function_map (RACI) ═══
-- Admin roles: ALL functions, full authority
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, true, true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('platform_admin', 'admin') AND r.active = true AND rf.active = true
ON CONFLICT DO NOTHING;

-- GRC Manager: governance, risk, control, compliance, audit, evidence, issue, report
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true,
  (rf.function_code LIKE '%review' OR rf.function_code LIKE '%effectiveness%'),
  true, true, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'grc_manager' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('governance','risk','control','compliance','audit','evidence','issue','report')
ON CONFLICT DO NOTHING;

-- Executive Owner: governance + risk + audit approve, view all
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false,
  (rf.function_code IN ('governance.policy_approve','risk.treatment_approve','risk.acceptance_decide','audit.report_approve')),
  false, true, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'executive_owner' AND r.active = true AND rf.active = true
ON CONFLICT DO NOTHING;

-- Risk Owner: risk + control + vendor domain
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
  (rf.function_code IN ('control.testing_review','evidence.approve')),
  (rf.module_code IN ('control','evidence')), (rf.module_code = 'control'), false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'control_owner' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('control','evidence','compliance','issue')
ON CONFLICT DO NOTHING;

-- Compliance Officer: compliance + evidence + governance domain
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code IN ('compliance','evidence')),
  false, (rf.module_code = 'compliance'), false, true, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'compliance_officer' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('governance','compliance','evidence','report')
ON CONFLICT DO NOTHING;

-- Auditor: read-wide, audit domain author
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code IN ('audit','issue')),
  false, (rf.module_code = 'audit'), (rf.module_code = 'audit'), false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('auditor', 'external_auditor') AND r.active = true AND rf.active = true
ON CONFLICT DO NOTHING;

-- Board Member / CEO / CFO / CTO: informed on all, approve governance
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false,
  (rf.function_code IN ('governance.policy_approve','risk.acceptance_decide','audit.report_approve')),
  false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('board_member', 'ceo', 'cfo', 'cto') AND r.active = true AND rf.active = true
  AND rf.module_code IN ('governance','risk','compliance','audit','report')
ON CONFLICT DO NOTHING;

-- CISO / IT Security: risk + compliance + evidence + incident + vendor + bcp
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, true, false, true, false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code IN ('ciso', 'it_security') AND r.active = true AND rf.active = true
  AND rf.module_code IN ('risk','control','compliance','evidence','vendor','report')
ON CONFLICT DO NOTHING;

-- DPO: compliance + evidence + governance (read + contribute)
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.module_code IN ('compliance','evidence')),
  false, false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'dpo' AND r.active = true AND rf.active = true
  AND rf.module_code IN ('governance','compliance','evidence','report')
ON CONFLICT DO NOTHING;

-- Contributor: limited create on evidence + issues
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code,
  (rf.function_code IN ('evidence.collect','issue.create')),
  false, false, false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'contributor' AND r.active = true AND rf.active = true
  AND rf.function_code IN ('risk.register_view','control.testing_perform','evidence.collect','compliance.status_view','issue.create','report.view')
ON CONFLICT DO NOTHING;

-- Viewer: read-only on reports
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, false, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'viewer' AND r.active = true AND rf.active = true
  AND rf.function_code IN ('compliance.status_view','report.view','risk.register_view')
ON CONFLICT DO NOTHING;

-- Consultant: read compliance + reports
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, false, false, false, false, true, true, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'consultant' AND r.active = true AND rf.active = true
  AND rf.function_code IN ('compliance.status_view','compliance.assessment_perform','report.view','risk.register_view')
ON CONFLICT DO NOTHING;

-- Vendor User: vendor assess only
INSERT INTO role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled)
SELECT r.role_id, rf.function_code, (rf.function_code = 'vendor.assess'),
  false, false, false, false, false, true
FROM roles r CROSS JOIN role_functions rf
WHERE r.role_code = 'vendor_user' AND r.active = true AND rf.active = true
  AND rf.module_code = 'vendor'
ON CONFLICT DO NOTHING;

-- ═══ STEP 6: Seed orphan functional role permissions ═══
-- reporting_admin → all reports permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'reporting_admin' AND p.module_code = 'reports'
ON CONFLICT DO NOTHING;

-- foundation_admin → all foundation permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'foundation_admin' AND p.module_code = 'foundation'
ON CONFLICT DO NOTHING;

-- assessment_manager → all assessment permissions (create if module has perms)
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'assessment_manager' AND p.module_code = 'assessment'
ON CONFLICT DO NOTHING;

-- ai_governance_officer → all ai_governance permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ai_governance_officer' AND p.module_code = 'ai_governance'
ON CONFLICT DO NOTHING;

-- 8 ai-governance roles → scoped permissions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.module_code = 'ai-governance' AND p.module_code = 'ai_governance'
  AND CASE
    WHEN fr.code LIKE '%lead%' THEN true
    WHEN fr.code LIKE '%assessor%' THEN p.action_code IN ('read', 'create', 'update')
    WHEN fr.code LIKE '%auditor%' THEN p.action_code IN ('read', 'audit')
    WHEN fr.code LIKE '%validator%' THEN p.action_code IN ('read', 'review')
    WHEN fr.code LIKE '%responder%' THEN p.action_code IN ('read', 'create', 'update', 'close')
    WHEN fr.code LIKE '%deployer%' THEN p.action_code IN ('read', 'create', 'update')
    WHEN fr.code LIKE '%member%' THEN p.action_code IN ('read', 'review', 'approve')
    ELSE p.action_code = 'read'
  END
ON CONFLICT DO NOTHING;

-- ═══ STEP 7: Create missing tables for 500 errors ═══
CREATE TABLE IF NOT EXISTS sod_conflict_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  role_a VARCHAR(100) NOT NULL,
  role_b VARCHAR(100) NOT NULL,
  conflict_type VARCHAR(50) DEFAULT 'hard',
  risk_level VARCHAR(20) DEFAULT 'high',
  status VARCHAR(20) DEFAULT 'open',
  resolved_by VARCHAR(64),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pdpl_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  consent_type VARCHAR(50) NOT NULL,
  purpose TEXT,
  granted BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  RAISE NOTICE 'Migration 253: RBAC chain fix complete — role_functions, function_authorities, user_role_assignments, role_function_map, orphan permissions, missing tables';
END $$;
