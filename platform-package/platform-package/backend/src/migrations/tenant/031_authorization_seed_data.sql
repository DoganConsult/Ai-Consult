-- ============================================
-- AGRC-OS Tenant Migration 031
-- Authorization Seed Data
-- 7 core roles, 30+ functions, permissions matrix
-- ============================================

-- SECTION 1: INSERT CORE ROLES
-- ============================

INSERT INTO roles (role_code, name_en, name_ar, description_en, description_ar, role_category, is_system, sort_order)
VALUES
  -- Core system roles
  ('platform_admin', 'Platform Administrator', 'مدير المنصة', 'Full system access with all administrative privileges', 'الوصول الكامل للنظام مع جميع الامتيازات الإدارية', 'system', true, 1),
  ('executive_owner', 'Executive Owner', 'المالك التنفيذي', 'Strategic oversight and high-level approvals', 'الإشراف الاستراتيجي والموافقات عالية المستوى', 'internal', true, 2),
  ('grc_manager', 'GRC Manager', 'مدير الحوكمة والمخاطر والامتثال', 'Operational GRC management and coordination', 'إدارة وتنسيق عمليات الحوكمة والمخاطر والامتثال', 'internal', true, 3),
  ('risk_owner', 'Risk Owner', 'مالك المخاطر', 'Risk domain authority and risk treatment decisions', 'سلطة مجال المخاطر وقرارات معالجة المخاطر', 'internal', true, 4),
  ('control_owner', 'Control Owner', 'مالك الضوابط', 'Control domain authority and control effectiveness', 'سلطة مجال الضوابط وفعالية الضوابط', 'internal', true, 5),
  ('auditor', 'Internal Auditor', 'المدقق الداخلي', 'Independent audit and assurance activities', 'أنشطة التدقيق والتأكيد المستقلة', 'internal', true, 6),
  ('contributor', 'Contributor', 'المساهم', 'Task execution and evidence collection', 'تنفيذ المهام وجمع الأدلة', 'internal', true, 7),

  -- Additional specialized roles
  ('compliance_officer', 'Compliance Officer', 'مسؤول الامتثال', 'Compliance monitoring and reporting', 'مراقبة الامتثال وإعداد التقارير', 'internal', true, 8),
  ('external_auditor', 'External Auditor', 'المدقق الخارجي', 'External audit and review activities', 'أنشطة التدقيق والمراجعة الخارجية', 'external', true, 9),
  ('board_member', 'Board Member', 'عضو مجلس الإدارة', 'Board oversight and governance', 'إشراف مجلس الإدارة والحوكمة', 'internal', true, 10),
  ('consultant', 'Consultant', 'استشاري', 'Advisory and consulting services', 'الخدمات الاستشارية', 'external', false, 11),
  ('vendor_user', 'Vendor User', 'مستخدم البائع', 'Vendor access for assessments and evidence', 'وصول البائع للتقييمات والأدلة', 'external', false, 12),
  ('viewer', 'Viewer', 'المشاهد', 'Read-only access to reports and dashboards', 'وصول للقراءة فقط للتقارير ولوحات المعلومات', 'internal', true, 13)
ON CONFLICT (role_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- SECTION 2: INSERT BUSINESS FUNCTIONS
-- ====================================

INSERT INTO role_functions (function_code, module_code, name_en, name_ar, description_en, description_ar, function_category)
VALUES
  -- Administrative Functions
  ('admin.users_manage', 'admin', 'Manage Users', 'إدارة المستخدمين', 'Create, update, and deactivate user accounts', 'إنشاء وتحديث وتعطيل حسابات المستخدمين', 'admin'),
  ('admin.roles_manage', 'admin', 'Manage Roles', 'إدارة الأدوار', 'Create and modify role definitions and assignments', 'إنشاء وتعديل تعريفات الأدوار والتعيينات', 'admin'),
  ('admin.workspace_config', 'admin', 'Configure Workspace', 'تكوين مساحة العمل', 'Manage workspace settings and preferences', 'إدارة إعدادات وتفضيلات مساحة العمل', 'admin'),
  ('admin.integrations_manage', 'admin', 'Manage Integrations', 'إدارة التكاملات', 'Configure and manage system integrations', 'تكوين وإدارة تكاملات النظام', 'integration'),

  -- Governance Functions
  ('governance.policy_create', 'governance', 'Create Policies', 'إنشاء السياسات', 'Draft and create governance policies', 'صياغة وإنشاء سياسات الحوكمة', 'business'),
  ('governance.policy_review', 'governance', 'Review Policies', 'مراجعة السياسات', 'Review and update existing policies', 'مراجعة وتحديث السياسات الموجودة', 'business'),
  ('governance.policy_approve', 'governance', 'Approve Policies', 'الموافقة على السياسات', 'Approve policy changes and publications', 'الموافقة على تغييرات ونشر السياسات', 'workflow'),
  ('governance.obligation_manage', 'governance', 'Manage Obligations', 'إدارة الالتزامات', 'Track and manage compliance obligations', 'تتبع وإدارة التزامات الامتثال', 'business'),
  ('governance.framework_map', 'governance', 'Map Frameworks', 'ربط الأطر', 'Map controls to regulatory frameworks', 'ربط الضوابط بالأطر التنظيمية', 'business'),

  -- Risk Functions
  ('risk.register_view', 'risk', 'View Risk Register', 'عرض سجل المخاطر', 'View risk register and risk details', 'عرض سجل المخاطر وتفاصيل المخاطر', 'business'),
  ('risk.assessment_create', 'risk', 'Create Risk Assessments', 'إنشاء تقييمات المخاطر', 'Create new risk assessments', 'إنشاء تقييمات مخاطر جديدة', 'business'),
  ('risk.assessment_perform', 'risk', 'Perform Risk Assessments', 'تنفيذ تقييمات المخاطر', 'Conduct risk assessment activities', 'إجراء أنشطة تقييم المخاطر', 'business'),
  ('risk.assessment_review', 'risk', 'Review Risk Assessments', 'مراجعة تقييمات المخاطر', 'Review completed risk assessments', 'مراجعة تقييمات المخاطر المكتملة', 'workflow'),
  ('risk.treatment_approve', 'risk', 'Approve Risk Treatment', 'الموافقة على معالجة المخاطر', 'Approve risk treatment plans', 'الموافقة على خطط معالجة المخاطر', 'workflow'),
  ('risk.acceptance_decide', 'risk', 'Risk Acceptance Decision', 'قرار قبول المخاطر', 'Make risk acceptance decisions', 'اتخاذ قرارات قبول المخاطر', 'workflow'),

  -- Control Functions
  ('control.design_create', 'control', 'Design Controls', 'تصميم الضوابط', 'Design and document controls', 'تصميم وتوثيق الضوابط', 'business'),
  ('control.testing_perform', 'control', 'Test Controls', 'اختبار الضوابط', 'Perform control testing activities', 'تنفيذ أنشطة اختبار الضوابط', 'business'),
  ('control.testing_review', 'control', 'Review Control Tests', 'مراجعة اختبارات الضوابط', 'Review control test results', 'مراجعة نتائج اختبار الضوابط', 'workflow'),
  ('control.effectiveness_approve', 'control', 'Approve Control Effectiveness', 'الموافقة على فعالية الضوابط', 'Approve control effectiveness assessments', 'الموافقة على تقييمات فعالية الضوابط', 'workflow'),
  ('control.remediation_manage', 'control', 'Manage Remediation', 'إدارة المعالجة', 'Manage control remediation activities', 'إدارة أنشطة معالجة الضوابط', 'business'),

  -- Evidence Functions
  ('evidence.collect', 'evidence', 'Collect Evidence', 'جمع الأدلة', 'Collect and upload evidence', 'جمع وتحميل الأدلة', 'business'),
  ('evidence.review', 'evidence', 'Review Evidence', 'مراجعة الأدلة', 'Review and validate evidence', 'مراجعة والتحقق من الأدلة', 'workflow'),
  ('evidence.approve', 'evidence', 'Approve Evidence', 'الموافقة على الأدلة', 'Approve evidence for compliance', 'الموافقة على الأدلة للامتثال', 'workflow'),
  ('evidence.archive', 'evidence', 'Archive Evidence', 'أرشفة الأدلة', 'Archive and manage evidence retention', 'أرشفة وإدارة الاحتفاظ بالأدلة', 'business'),

  -- Audit Functions
  ('audit.plan_create', 'audit', 'Create Audit Plans', 'إنشاء خطط التدقيق', 'Create and schedule audit plans', 'إنشاء وجدولة خطط التدقيق', 'business'),
  ('audit.execute', 'audit', 'Execute Audits', 'تنفيذ التدقيق', 'Perform audit procedures', 'تنفيذ إجراءات التدقيق', 'business'),
  ('audit.findings_raise', 'audit', 'Raise Findings', 'رفع الملاحظات', 'Document audit findings', 'توثيق ملاحظات التدقيق', 'business'),
  ('audit.report_create', 'audit', 'Create Audit Reports', 'إنشاء تقارير التدقيق', 'Generate audit reports', 'إنشاء تقارير التدقيق', 'reporting'),
  ('audit.report_approve', 'audit', 'Approve Audit Reports', 'الموافقة على تقارير التدقيق', 'Approve and finalize audit reports', 'الموافقة على وإنهاء تقارير التدقيق', 'workflow'),

  -- Compliance Functions
  ('compliance.status_view', 'compliance', 'View Compliance Status', 'عرض حالة الامتثال', 'View compliance dashboards and status', 'عرض لوحات معلومات وحالة الامتثال', 'reporting'),
  ('compliance.assessment_perform', 'compliance', 'Perform Compliance Assessment', 'تنفيذ تقييم الامتثال', 'Conduct compliance assessments', 'إجراء تقييمات الامتثال', 'business'),
  ('compliance.report_generate', 'compliance', 'Generate Compliance Reports', 'إنشاء تقارير الامتثال', 'Generate compliance reports', 'إنشاء تقارير الامتثال', 'reporting'),
  ('compliance.certification_manage', 'compliance', 'Manage Certifications', 'إدارة الشهادات', 'Manage compliance certifications', 'إدارة شهادات الامتثال', 'business'),

  -- Issue Management Functions
  ('issue.create', 'issue', 'Create Issues', 'إنشاء المشكلات', 'Create and log new issues', 'إنشاء وتسجيل المشكلات الجديدة', 'business'),
  ('issue.assign', 'issue', 'Assign Issues', 'تعيين المشكلات', 'Assign issues to team members', 'تعيين المشكلات لأعضاء الفريق', 'workflow'),
  ('issue.resolve', 'issue', 'Resolve Issues', 'حل المشكلات', 'Work on and resolve issues', 'العمل على حل المشكلات', 'business'),
  ('issue.close', 'issue', 'Close Issues', 'إغلاق المشكلات', 'Close resolved issues', 'إغلاق المشكلات المحلولة', 'workflow'),

  -- Vendor Management Functions
  ('vendor.assess', 'vendor', 'Assess Vendors', 'تقييم البائعين', 'Conduct vendor risk assessments', 'إجراء تقييمات مخاطر البائعين', 'business'),
  ('vendor.review', 'vendor', 'Review Vendors', 'مراجعة البائعين', 'Review vendor assessment results', 'مراجعة نتائج تقييم البائعين', 'workflow'),
  ('vendor.approve', 'vendor', 'Approve Vendors', 'الموافقة على البائعين', 'Approve vendor onboarding', 'الموافقة على إدخال البائعين', 'workflow'),

  -- Reporting Functions
  ('report.view', 'report', 'View Reports', 'عرض التقارير', 'View generated reports', 'عرض التقارير المنشأة', 'reporting'),
  ('report.create', 'report', 'Create Reports', 'إنشاء التقارير', 'Create custom reports', 'إنشاء تقارير مخصصة', 'reporting'),
  ('report.export', 'report', 'Export Reports', 'تصدير التقارير', 'Export reports to various formats', 'تصدير التقارير لصيغ مختلفة', 'reporting'),
  ('report.schedule', 'report', 'Schedule Reports', 'جدولة التقارير', 'Schedule automated report generation', 'جدولة إنشاء التقارير الآلي', 'reporting')
ON CONFLICT (function_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- SECTION 3: INSERT ROLE-FUNCTION PERMISSIONS
-- ===========================================

-- Platform Admin: Full access to everything
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  true, true, true, true, true, true, true,
  'all'
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'platform_admin'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = true, can_create = true, can_edit = true,
  can_submit = true, can_review = true, can_approve = true, can_close = true,
  scope_policy = 'all',
  updated_at = NOW();

-- Executive Owner: Strategic oversight and approvals
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  true, -- can view everything
  CASE WHEN f.function_code LIKE 'governance.policy%' THEN true ELSE false END,
  false, -- limited editing
  false, -- no submission
  true, -- can review
  CASE WHEN f.function_code IN ('governance.policy_approve', 'risk.treatment_approve', 'risk.acceptance_decide', 'audit.report_approve') THEN true ELSE false END,
  false,
  'all'
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'executive_owner'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_approve = EXCLUDED.can_approve,
  updated_at = NOW();

-- GRC Manager: Operational management
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  true, -- can view everything
  CASE WHEN f.module_code IN ('governance', 'risk', 'control', 'compliance', 'audit') THEN true ELSE false END,
  CASE WHEN f.module_code IN ('governance', 'risk', 'control', 'compliance') THEN true ELSE false END,
  true, -- can submit
  true, -- can review
  CASE WHEN f.function_code LIKE '%review' OR f.function_code LIKE 'control.effectiveness%' THEN true ELSE false END,
  CASE WHEN f.module_code = 'issue' THEN true ELSE false END,
  'all'
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'grc_manager'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_submit = EXCLUDED.can_submit,
  can_review = EXCLUDED.can_review,
  can_approve = EXCLUDED.can_approve,
  can_close = EXCLUDED.can_close,
  updated_at = NOW();

-- Risk Owner: Risk domain authority
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  CASE WHEN f.module_code IN ('risk', 'control', 'vendor', 'issue') THEN true ELSE false END,
  CASE WHEN f.module_code = 'risk' THEN true ELSE false END,
  CASE WHEN f.module_code = 'risk' THEN true ELSE false END,
  CASE WHEN f.module_code = 'risk' THEN true ELSE false END,
  CASE WHEN f.module_code IN ('risk', 'control') THEN true ELSE false END,
  CASE WHEN f.function_code IN ('risk.assessment_review', 'risk.treatment_approve') THEN true ELSE false END,
  false,
  'assigned' -- Only assigned risks
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'risk_owner'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_submit = EXCLUDED.can_submit,
  can_review = EXCLUDED.can_review,
  can_approve = EXCLUDED.can_approve,
  scope_policy = EXCLUDED.scope_policy,
  updated_at = NOW();

-- Control Owner: Control domain authority
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  CASE WHEN f.module_code IN ('control', 'evidence', 'compliance', 'issue') THEN true ELSE false END,
  CASE WHEN f.module_code IN ('control', 'evidence') THEN true ELSE false END,
  CASE WHEN f.module_code IN ('control', 'evidence') THEN true ELSE false END,
  CASE WHEN f.module_code IN ('control', 'evidence') THEN true ELSE false END,
  CASE WHEN f.module_code IN ('control', 'evidence') THEN true ELSE false END,
  CASE WHEN f.function_code IN ('control.testing_review', 'evidence.approve') THEN true ELSE false END,
  false,
  'assigned' -- Only assigned controls
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'control_owner'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_submit = EXCLUDED.can_submit,
  can_review = EXCLUDED.can_review,
  can_approve = EXCLUDED.can_approve,
  scope_policy = EXCLUDED.scope_policy,
  updated_at = NOW();

-- Auditor: Read-wide, create audit work
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  true, -- can view everything for audit purposes
  CASE WHEN f.module_code IN ('audit', 'issue') THEN true ELSE false END,
  CASE WHEN f.module_code = 'audit' THEN true ELSE false END,
  CASE WHEN f.module_code = 'audit' THEN true ELSE false END,
  false, -- no review authority
  false, -- no approval authority
  false,
  'all' -- Need to see everything for audit
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'auditor'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_submit = EXCLUDED.can_submit,
  scope_policy = EXCLUDED.scope_policy,
  updated_at = NOW();

-- Contributor: Task execution only
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  CASE WHEN f.function_code IN ('risk.register_view', 'control.testing_perform', 'evidence.collect', 'compliance.status_view', 'issue.create', 'report.view') THEN true ELSE false END,
  CASE WHEN f.function_code IN ('evidence.collect', 'issue.create') THEN true ELSE false END,
  CASE WHEN f.function_code IN ('evidence.collect') THEN true ELSE false END,
  CASE WHEN f.function_code IN ('evidence.collect', 'control.testing_perform') THEN true ELSE false END,
  false,
  false,
  false,
  'assigned' -- Only assigned tasks
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'contributor'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_submit = EXCLUDED.can_submit,
  scope_policy = EXCLUDED.scope_policy,
  updated_at = NOW();

-- Viewer: Read-only access
INSERT INTO role_function_permissions (role_id, function_code, can_view, can_create, can_edit, can_submit, can_review, can_approve, can_close, scope_policy)
SELECT
  r.role_id,
  f.function_code,
  CASE WHEN f.function_code LIKE '%.view' OR f.function_code = 'report.view' THEN true ELSE false END,
  false, false, false, false, false, false,
  'all'
FROM roles r
CROSS JOIN role_functions f
WHERE r.role_code = 'viewer'
ON CONFLICT (role_id, function_code) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  scope_policy = EXCLUDED.scope_policy,
  updated_at = NOW();

-- SECTION 4: INSERT FUNCTION AUTHORITIES
-- ======================================

-- Define what each function can actually do (action x resource matrix)
INSERT INTO function_authorities (function_code, action, resource_type, allow, max_risk_level, conditions, priority)
VALUES
  -- User management
  ('admin.users_manage', 'create', 'user', true, null, '{}', 100),
  ('admin.users_manage', 'update', 'user', true, null, '{}', 100),
  ('admin.users_manage', 'deactivate', 'user', true, null, '{}', 100),
  ('admin.users_manage', 'read', 'user', true, null, '{}', 100),

  -- Role management
  ('admin.roles_manage', 'create', 'role', true, null, '{}', 100),
  ('admin.roles_manage', 'update', 'role', true, null, '{}', 100),
  ('admin.roles_manage', 'assign', 'role_assignment', true, null, '{}', 100),
  ('admin.roles_manage', 'revoke', 'role_assignment', true, null, '{}', 100),

  -- Policy management
  ('governance.policy_create', 'create', 'policy', true, null, '{}', 100),
  ('governance.policy_review', 'update', 'policy', true, null, '{}', 100),
  ('governance.policy_review', 'read', 'policy', true, null, '{}', 100),
  ('governance.policy_approve', 'approve', 'policy', true, null, '{}', 100),
  ('governance.policy_approve', 'reject', 'policy', true, null, '{}', 100),

  -- Risk assessment
  ('risk.assessment_create', 'create', 'risk_assessment', true, null, '{}', 100),
  ('risk.assessment_perform', 'update', 'risk_assessment', true, null, '{}', 100),
  ('risk.assessment_perform', 'score', 'risk_assessment', true, null, '{}', 100),
  ('risk.assessment_review', 'review', 'risk_assessment', true, null, '{}', 100),
  ('risk.treatment_approve', 'approve', 'risk_treatment', true, 'critical', '{}', 100),
  ('risk.acceptance_decide', 'accept', 'risk', true, 'high', '{"requires_justification": true}', 100),

  -- Control testing
  ('control.design_create', 'create', 'control', true, null, '{}', 100),
  ('control.testing_perform', 'test', 'control', true, null, '{}', 100),
  ('control.testing_perform', 'update', 'control_test', true, null, '{}', 100),
  ('control.testing_review', 'review', 'control_test', true, null, '{}', 100),
  ('control.effectiveness_approve', 'approve', 'control_effectiveness', true, null, '{}', 100),

  -- Evidence management
  ('evidence.collect', 'create', 'evidence', true, null, '{}', 100),
  ('evidence.collect', 'upload', 'evidence', true, null, '{}', 100),
  ('evidence.review', 'review', 'evidence', true, null, '{}', 100),
  ('evidence.approve', 'approve', 'evidence', true, null, '{}', 100),
  ('evidence.archive', 'archive', 'evidence', true, null, '{}', 100),

  -- Audit activities
  ('audit.plan_create', 'create', 'audit_plan', true, null, '{}', 100),
  ('audit.execute', 'perform', 'audit', true, null, '{}', 100),
  ('audit.findings_raise', 'create', 'finding', true, null, '{}', 100),
  ('audit.report_create', 'create', 'audit_report', true, null, '{}', 100),
  ('audit.report_approve', 'approve', 'audit_report', true, null, '{}', 100),

  -- Compliance
  ('compliance.assessment_perform', 'perform', 'compliance_assessment', true, null, '{}', 100),
  ('compliance.report_generate', 'generate', 'compliance_report', true, null, '{}', 100),
  ('compliance.certification_manage', 'manage', 'certification', true, null, '{}', 100),

  -- Issue management
  ('issue.create', 'create', 'issue', true, null, '{}', 100),
  ('issue.assign', 'assign', 'issue', true, null, '{}', 100),
  ('issue.resolve', 'update', 'issue', true, null, '{}', 100),
  ('issue.close', 'close', 'issue', true, null, '{}', 100),

  -- Vendor management
  ('vendor.assess', 'assess', 'vendor', true, null, '{}', 100),
  ('vendor.review', 'review', 'vendor_assessment', true, null, '{}', 100),
  ('vendor.approve', 'approve', 'vendor', true, null, '{}', 100),

  -- Reporting
  ('report.view', 'read', 'report', true, null, '{}', 100),
  ('report.create', 'create', 'report', true, null, '{}', 100),
  ('report.export', 'export', 'report', true, null, '{}', 100),
  ('report.schedule', 'schedule', 'report', true, null, '{}', 100)
ON CONFLICT (function_code, action, resource_type) DO UPDATE
SET
  allow = EXCLUDED.allow,
  max_risk_level = EXCLUDED.max_risk_level,
  conditions = EXCLUDED.conditions,
  updated_at = NOW();

-- SECTION 5: INSERT ROLE EXPERIENCE PROFILES
-- ==========================================

INSERT INTO role_experience_profiles (role_id, modules, dashboard_widgets, default_landing_page, navigation_preset)
SELECT
  r.role_id,
  CASE r.role_code
    WHEN 'platform_admin' THEN '["admin", "governance", "risk", "control", "compliance", "audit", "vendor", "report"]'::JSONB
    WHEN 'executive_owner' THEN '["governance", "risk", "compliance", "audit", "report"]'::JSONB
    WHEN 'grc_manager' THEN '["governance", "risk", "control", "compliance", "audit", "issue", "report"]'::JSONB
    WHEN 'risk_owner' THEN '["risk", "control", "vendor", "issue", "report"]'::JSONB
    WHEN 'control_owner' THEN '["control", "evidence", "compliance", "issue", "report"]'::JSONB
    WHEN 'auditor' THEN '["audit", "evidence", "issue", "report"]'::JSONB
    WHEN 'contributor' THEN '["evidence", "issue", "report"]'::JSONB
    ELSE '["report"]'::JSONB
  END AS modules,
  CASE r.role_code
    WHEN 'platform_admin' THEN '["compliance-score", "risk-heatmap", "control-progress", "audit-readiness", "framework-coverage", "policy-scorecard", "vendor-risk", "incident-tracker"]'::JSONB
    WHEN 'executive_owner' THEN '["compliance-score", "risk-heatmap", "maturity-radar-echart", "board-reality", "program-health", "one-sentence-truth"]'::JSONB
    WHEN 'grc_manager' THEN '["compliance-score", "risk-summary", "control-progress", "audit-readiness", "framework-coverage", "lifecycle-bottleneck"]'::JSONB
    WHEN 'risk_owner' THEN '["risk-heatmap", "risk-distribution", "vendor-risk", "monte-carlo-distribution", "tornado-sensitivity", "blast-radius"]'::JSONB
    WHEN 'control_owner' THEN '["control-progress", "control-testing-donut", "evidence-donut-echart", "silent-controls", "control-aging", "zombie-controls"]'::JSONB
    WHEN 'auditor' THEN '["audit-readiness", "findings-bar-echart", "evidence-flow", "audit-dejavu", "decision-trace"]'::JSONB
    WHEN 'contributor' THEN '["task-progress", "evidence-collection", "upcoming-deadlines"]'::JSONB
    ELSE '["compliance-score", "risk-summary", "program-health"]'::JSONB
  END AS dashboard_widgets,
  CASE r.role_code
    WHEN 'platform_admin' THEN '/admin-dashboard'
    WHEN 'executive_owner' THEN '/executive-command'
    WHEN 'grc_manager' THEN '/governance-hub'
    WHEN 'risk_owner' THEN '/risk-hub'
    WHEN 'control_owner' THEN '/compliance-hub'
    WHEN 'auditor' THEN '/audit-hub'
    WHEN 'contributor' THEN '/workspace-home'
    ELSE '/workspace-home'
  END AS default_landing_page,
  CASE r.role_code
    WHEN 'platform_admin' THEN '{"show_all_sections": true, "expanded_by_default": true}'::JSONB
    WHEN 'executive_owner' THEN '{"show_executive_tools": true, "show_reports": true}'::JSONB
    ELSE '{}'::JSONB
  END AS navigation_preset
FROM roles r
ON CONFLICT (role_id) DO UPDATE
SET
  modules = EXCLUDED.modules,
  dashboard_widgets = EXCLUDED.dashboard_widgets,
  default_landing_page = EXCLUDED.default_landing_page,
  navigation_preset = EXCLUDED.navigation_preset,
  updated_at = NOW();

-- SECTION 6: CREATE DEFAULT WORKSPACE PROFILE
-- ===========================================

INSERT INTO workspace_profile (
  industry,
  org_size,
  risk_appetite,
  escalation_level,
  enforcement_mode,
  default_language,
  time_zone,
  fiscal_year_start,
  working_days,
  settings
)
SELECT
  'general',
  'medium',
  'moderate',
  'normal',
  'advisory',
  'en',
  'UTC',
  1,
  '{Monday,Tuesday,Wednesday,Thursday,Friday}',
  '{
    "maturity_target": 3,
    "audit_cycle_days": 365,
    "control_review_days": 90,
    "risk_review_days": 90,
    "policy_review_days": 365,
    "evidence_retention_years": 7,
    "auto_escalation_enabled": true,
    "notification_channels": ["email", "in_app"],
    "require_evidence_approval": true,
    "require_dual_approval_high_risk": true
  }'::JSONB
WHERE NOT EXISTS (SELECT 1 FROM workspace_profile)
LIMIT 1;

-- SECTION 7: MIGRATE EXISTING USER ROLE ASSIGNMENTS
-- =================================================

-- Migrate existing users to new role structure based on their legacy role
INSERT INTO user_role_assignments (user_id, role_id, scope_type, scope_id, is_primary, assigned_by, reason)
SELECT DISTINCT
  u.user_id,
  r.role_id,
  'workspace',
  NULL::UUID,
  true,
  'system',
  'Migration from legacy role system'
FROM public.users u
INNER JOIN roles r ON
  CASE
    WHEN u.role = 'owner' THEN r.role_code = 'platform_admin'
    WHEN u.role = 'admin' THEN r.role_code = 'grc_manager'
    WHEN u.role = 'compliance_officer' THEN r.role_code = 'compliance_officer'
    WHEN u.role = 'risk_manager' THEN r.role_code = 'risk_owner'
    WHEN u.role = 'auditor' THEN r.role_code = 'auditor'
    WHEN u.role = 'viewer' THEN r.role_code = 'viewer'
    WHEN u.role = 'user' THEN r.role_code = 'contributor'
    WHEN u.role = 'manager' THEN r.role_code = 'grc_manager'
    WHEN u.role = 'approver' THEN r.role_code = 'executive_owner'
    ELSE r.role_code = 'contributor'
  END
WHERE u.tenant_id = (SELECT tenant_id FROM public.tenants WHERE schema_name = CONCAT('tenant_', CURRENT_SCHEMA()))
  AND NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    WHERE ura.user_id = u.user_id
  );

-- SECTION 8: CREATE SAMPLE RACI MATRIX ENTRIES
-- ============================================

INSERT INTO raci_matrix (domain_code, process_code, stage_code, responsible_role_codes, accountable_role_codes, consulted_role_codes, informed_role_codes, description_en)
VALUES
  ('governance', 'policy_management', 'creation', '{grc_manager}', '{executive_owner}', '{control_owner,risk_owner}', '{auditor,contributor}', 'Policy creation and drafting'),
  ('governance', 'policy_management', 'review', '{grc_manager,control_owner}', '{executive_owner}', '{risk_owner,auditor}', '{contributor}', 'Policy review and update'),
  ('governance', 'policy_management', 'approval', '{executive_owner}', '{executive_owner}', '{grc_manager}', '{control_owner,risk_owner,auditor}', 'Policy approval and publication'),

  ('risk', 'risk_assessment', 'identification', '{risk_owner,contributor}', '{risk_owner}', '{control_owner,grc_manager}', '{executive_owner,auditor}', 'Risk identification'),
  ('risk', 'risk_assessment', 'analysis', '{risk_owner}', '{risk_owner}', '{control_owner,grc_manager}', '{executive_owner,auditor}', 'Risk analysis and scoring'),
  ('risk', 'risk_assessment', 'treatment', '{risk_owner,control_owner}', '{executive_owner}', '{grc_manager}', '{auditor}', 'Risk treatment planning'),

  ('control', 'control_testing', 'design', '{control_owner}', '{grc_manager}', '{risk_owner}', '{auditor,executive_owner}', 'Control design and documentation'),
  ('control', 'control_testing', 'testing', '{control_owner,contributor}', '{control_owner}', '{grc_manager}', '{auditor,risk_owner}', 'Control testing execution'),
  ('control', 'control_testing', 'review', '{grc_manager}', '{executive_owner}', '{control_owner,auditor}', '{risk_owner}', 'Control effectiveness review'),

  ('compliance', 'assessment', 'preparation', '{grc_manager,contributor}', '{grc_manager}', '{control_owner,risk_owner}', '{auditor,executive_owner}', 'Compliance assessment preparation'),
  ('compliance', 'assessment', 'execution', '{grc_manager,control_owner}', '{grc_manager}', '{risk_owner}', '{auditor,executive_owner}', 'Compliance assessment execution'),
  ('compliance', 'assessment', 'reporting', '{grc_manager}', '{executive_owner}', '{control_owner,risk_owner,auditor}', '{contributor}', 'Compliance reporting'),

  ('audit', 'internal_audit', 'planning', '{auditor}', '{executive_owner}', '{grc_manager,risk_owner,control_owner}', '{contributor}', 'Audit planning'),
  ('audit', 'internal_audit', 'execution', '{auditor}', '{auditor}', '{grc_manager,control_owner}', '{executive_owner,risk_owner}', 'Audit execution'),
  ('audit', 'internal_audit', 'reporting', '{auditor}', '{executive_owner}', '{grc_manager}', '{risk_owner,control_owner,contributor}', 'Audit reporting')
ON CONFLICT DO NOTHING;

-- SECTION 9: FINAL VALIDATION
-- ==========================

DO $$
DECLARE
  role_count INT;
  function_count INT;
  permission_count INT;
  assignment_count INT;
BEGIN
  SELECT COUNT(*) INTO role_count FROM roles;
  SELECT COUNT(*) INTO function_count FROM role_functions;
  SELECT COUNT(*) INTO permission_count FROM role_function_permissions;
  SELECT COUNT(*) INTO assignment_count FROM user_role_assignments;

  RAISE NOTICE 'Migration 031: Authorization seed data completed successfully';
  RAISE NOTICE '- Roles created: %', role_count;
  RAISE NOTICE '- Functions created: %', function_count;
  RAISE NOTICE '- Permissions created: %', permission_count;
  RAISE NOTICE '- User assignments migrated: %', assignment_count;
  RAISE NOTICE '- Workspace profile created';
  RAISE NOTICE '- RACI matrix populated';

  IF role_count < 7 THEN
    RAISE WARNING 'Expected at least 7 roles, found %', role_count;
  END IF;

  IF function_count < 30 THEN
    RAISE WARNING 'Expected at least 30 functions, found %', function_count;
  END IF;
END $$;