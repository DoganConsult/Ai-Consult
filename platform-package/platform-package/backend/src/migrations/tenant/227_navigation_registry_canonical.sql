-- ============================================================================
-- Migration 227: Navigation Registry — Canonical Normalization
-- ============================================================================
-- 1. Add page_code, permission_code, product_key columns
-- 2. Fix module_code inconsistencies (controls→compliance, qiyas→maturity, etc.)
-- 3. Add nav items for 16 missing modules
-- 4. Link nav items to module_pages via page_code
-- ============================================================================

-- 1. Add new columns
ALTER TABLE navigation_registry
  ADD COLUMN IF NOT EXISTS page_code       TEXT,
  ADD COLUMN IF NOT EXISTS permission_code TEXT,
  ADD COLUMN IF NOT EXISTS product_key     VARCHAR(50) DEFAULT 'agrc';

-- 2. Fix module_code inconsistencies
-- controls → compliance (canonical module code)
UPDATE navigation_registry SET module_code = 'compliance'
WHERE module_code = 'controls';

-- qiyas → maturity (canonical module code)
UPDATE navigation_registry SET module_code = 'maturity'
WHERE module_code = 'qiyas';

-- dashboard → analytics
UPDATE navigation_registry SET module_code = 'analytics'
WHERE module_code = 'dashboard';

-- privacy → policy (privacy pages are under the policy module)
UPDATE navigation_registry SET module_code = 'policy'
WHERE module_code = 'privacy';

-- 3. Link existing nav items to module_pages
UPDATE navigation_registry nr SET page_code = mp.page_code
FROM module_pages mp
WHERE nr.route IS NOT NULL
  AND nr.route = mp.route
  AND nr.page_code IS NULL;

-- 4. Set permission_code from linked module_pages
UPDATE navigation_registry nr SET permission_code = mp.legacy_permission
FROM module_pages mp
WHERE nr.page_code = mp.page_code
  AND nr.permission_code IS NULL;

-- 5. Add missing module group headers and child items
-- Only insert if they don't already exist

-- ─── INCIDENT MODULE ────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('incident', NULL, 'Incidents', 'الحوادث', NULL, 'report_problem', 'incident', 'group', 700, TRUE, TRUE),
  ('incident-overview', 'incident', 'Overview', 'نظرة عامة', '/incidents/overview', 'dashboard', 'incident', 'link', 1, TRUE, TRUE),
  ('incident-register', 'incident', 'Register', 'السجل', '/incidents/register', 'list', 'incident', 'link', 2, TRUE, TRUE),
  ('incident-investigation', 'incident', 'Investigation', 'التحقيق', '/incidents/investigation', 'search', 'incident', 'link', 3, TRUE, TRUE),
  ('incident-trends', 'incident', 'Trends', 'الاتجاهات', '/incidents/trends', 'trending_up', 'incident', 'link', 4, TRUE, TRUE),
  ('incident-lessons', 'incident', 'Lessons Learned', 'الدروس المستفادة', '/incidents/lessons', 'school', 'incident', 'link', 5, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── EXCEPTION MODULE ───────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('exception', NULL, 'Exceptions', 'الاستثناءات', NULL, 'rule', 'exception', 'group', 800, TRUE, TRUE),
  ('exception-overview', 'exception', 'Overview', 'نظرة عامة', '/exception/overview', 'dashboard', 'exception', 'link', 1, TRUE, TRUE),
  ('exception-manager', 'exception', 'Manager', 'المدير', '/exception-manager', 'settings', 'exception', 'link', 2, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── VENDOR MODULE ──────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('vendor', NULL, 'Vendor Risk', 'مخاطر الموردين', NULL, 'store', 'vendor', 'group', 900, TRUE, TRUE),
  ('vendor-overview', 'vendor', 'Overview', 'نظرة عامة', '/vendor-risk/overview', 'dashboard', 'vendor', 'link', 1, TRUE, TRUE),
  ('vendor-register', 'vendor', 'Register', 'السجل', '/vendor-risk/register', 'list', 'vendor', 'link', 2, TRUE, TRUE),
  ('vendor-assessments', 'vendor', 'Assessments', 'التقييمات', '/vendor-risk/assessments', 'assignment', 'vendor', 'link', 3, TRUE, TRUE),
  ('vendor-due-diligence', 'vendor', 'Due Diligence', 'العناية الواجبة', '/vendor-risk/due-diligence', 'verified', 'vendor', 'link', 4, TRUE, TRUE),
  ('vendor-monitoring', 'vendor', 'Monitoring', 'المراقبة', '/vendor-risk/monitoring', 'monitor', 'vendor', 'link', 5, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── BCP MODULE ─────────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('bcp', NULL, 'Business Continuity', 'استمرارية الأعمال', NULL, 'health_and_safety', 'bcp', 'group', 1000, TRUE, TRUE),
  ('bcp-overview', 'bcp', 'Overview', 'نظرة عامة', '/bcp/overview', 'dashboard', 'bcp', 'link', 1, TRUE, TRUE),
  ('bcp-plans', 'bcp', 'Plans', 'الخطط', '/bcp/plans', 'description', 'bcp', 'link', 2, TRUE, TRUE),
  ('bcp-bia', 'bcp', 'BIA', 'تحليل أثر الأعمال', '/bcp/bia', 'assessment', 'bcp', 'link', 3, TRUE, TRUE),
  ('bcp-exercises', 'bcp', 'Exercises', 'التمارين', '/bcp/exercises', 'fitness_center', 'bcp', 'link', 4, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── ASSET MODULE ───────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('asset', NULL, 'Assets', 'الأصول', NULL, 'devices', 'asset', 'group', 1100, TRUE, TRUE),
  ('asset-overview', 'asset', 'Overview', 'نظرة عامة', '/asset/overview', 'dashboard', 'asset', 'link', 1, TRUE, TRUE),
  ('asset-list', 'asset', 'Asset Register', 'سجل الأصول', '/assets', 'list', 'asset', 'link', 2, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── REMEDIATION MODULE ────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('remediation', NULL, 'Remediation', 'المعالجة', NULL, 'build', 'remediation', 'group', 1200, TRUE, TRUE),
  ('remediation-overview', 'remediation', 'Overview', 'نظرة عامة', '/remediation/overview', 'dashboard', 'remediation', 'link', 1, TRUE, TRUE),
  ('remediation-items', 'remediation', 'Items', 'العناصر', '/remediation', 'list', 'remediation', 'link', 2, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── ACTION MODULE ──────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('action', NULL, 'Actions', 'الإجراءات', NULL, 'checklist', 'action', 'group', 1300, TRUE, TRUE),
  ('action-overview', 'action', 'Overview', 'نظرة عامة', '/action/overview', 'dashboard', 'action', 'link', 1, TRUE, TRUE),
  ('action-items', 'action', 'Items', 'العناصر', '/action-items', 'list', 'action', 'link', 2, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── POLICY MODULE ──────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('policy', NULL, 'Policies', 'السياسات', NULL, 'description', 'policy', 'group', 350, TRUE, TRUE),
  ('policy-overview', 'policy', 'Overview', 'نظرة عامة', '/policy/overview', 'dashboard', 'policy', 'link', 1, TRUE, TRUE),
  ('policy-list', 'policy', 'All Policies', 'جميع السياسات', '/policies', 'list', 'policy', 'link', 2, TRUE, TRUE),
  ('policy-procedures', 'policy', 'Procedures', 'الإجراءات', '/procedures', 'assignment', 'policy', 'link', 3, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── ASSESSMENT MODULE ──────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('assessment', NULL, 'Assessment', 'التقييم', NULL, 'assignment', 'assessment', 'group', 1400, TRUE, TRUE),
  ('assessment-overview', 'assessment', 'Overview', 'نظرة عامة', '/assessment/overview', 'dashboard', 'assessment', 'link', 1, TRUE, TRUE),
  ('assessment-list', 'assessment', 'Assessments', 'التقييمات', '/assessments', 'list', 'assessment', 'link', 2, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── TRAINING MODULE ────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('training', NULL, 'Training', 'التدريب', NULL, 'school', 'training', 'group', 1500, TRUE, TRUE),
  ('training-overview', 'training', 'Overview', 'نظرة عامة', '/training/overview', 'dashboard', 'training', 'link', 1, TRUE, TRUE),
  ('training-campaigns', 'training', 'Campaigns', 'الحملات', '/training/campaigns', 'campaign', 'training', 'link', 2, TRUE, TRUE),
  ('training-content', 'training', 'Content', 'المحتوى', '/training/content', 'menu_book', 'training', 'link', 3, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── KNOWLEDGE MODULE ───────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('knowledge', NULL, 'Knowledge', 'المعرفة', NULL, 'menu_book', 'knowledge', 'group', 1600, TRUE, TRUE),
  ('knowledge-overview', 'knowledge', 'Overview', 'نظرة عامة', '/knowledge/overview', 'dashboard', 'knowledge', 'link', 1, TRUE, TRUE),
  ('knowledge-hub', 'knowledge', 'Hub', 'المركز', '/knowledge-hub', 'hub', 'knowledge', 'link', 2, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── WORKSPACE MODULE ───────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('workspace', NULL, 'Workspace', 'مساحة العمل', '/workspace-home', 'dashboard', 'workspace', 'link', 1, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── AI MODULE ──────────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('ai', NULL, 'AI', 'الذكاء الاصطناعي', NULL, 'psychology', 'ai', 'group', 50, TRUE, TRUE),
  ('ai-hub', 'ai', 'AI Hub', 'مركز الذكاء', '/ai-hub', 'hub', 'ai', 'link', 1, TRUE, TRUE),
  ('ai-copilot', 'ai', 'Copilot', 'المساعد', '/copilot', 'smart_toy', 'ai', 'link', 2, TRUE, TRUE),
  ('ai-agent-hub', 'ai', 'Agent Hub', 'مركز الوكلاء', '/agent-hub', 'group_work', 'ai', 'link', 3, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── AI GOVERNANCE MODULE ───────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('ai-governance', NULL, 'AI Governance', 'حوكمة الذكاء', NULL, 'smart_toy', 'ai-governance', 'group', 55, TRUE, TRUE),
  ('ai-governance-overview', 'ai-governance', 'Overview', 'نظرة عامة', '/ai-governance/overview', 'dashboard', 'ai-governance', 'link', 1, TRUE, TRUE),
  ('ai-governance-assets', 'ai-governance', 'AI Assets', 'أصول الذكاء', '/ai-governance/assets', 'devices', 'ai-governance', 'link', 2, TRUE, TRUE),
  ('ai-governance-models', 'ai-governance', 'Models', 'النماذج', '/ai-governance/models', 'model_training', 'ai-governance', 'link', 3, TRUE, TRUE),
  ('ai-governance-enforcement', 'ai-governance', 'Enforcement', 'الإنفاذ', '/ai-governance/enforcement', 'gavel', 'ai-governance', 'link', 4, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── WORKFLOW MODULE ────────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('workflow', NULL, 'Workflow', 'سير العمل', NULL, 'account_tree', 'workflow', 'group', 2000, TRUE, TRUE),
  ('workflow-overview', 'workflow', 'Overview', 'نظرة عامة', '/workflow/overview', 'dashboard', 'workflow', 'link', 1, TRUE, TRUE),
  ('workflow-hub', 'workflow', 'Hub', 'المركز', '/workflow-hub', 'hub', 'workflow', 'link', 2, TRUE, TRUE),
  ('workflow-tasks', 'workflow', 'My Tasks', 'مهامي', '/my-tasks', 'checklist', 'workflow', 'link', 3, TRUE, TRUE),
  ('workflow-approvals', 'workflow', 'Approvals', 'الموافقات', '/approval-center', 'thumb_up', 'workflow', 'link', 4, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── REPORTING MODULE ───────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('reporting', NULL, 'Reports', 'التقارير', NULL, 'assessment', 'reporting', 'group', 2100, TRUE, TRUE),
  ('reporting-overview', 'reporting', 'Overview', 'نظرة عامة', '/reports/overview', 'dashboard', 'reporting', 'link', 1, TRUE, TRUE),
  ('reporting-executive', 'reporting', 'Executive', 'تنفيذي', '/reports/executive', 'business_center', 'reporting', 'link', 2, TRUE, TRUE),
  ('reporting-builder', 'reporting', 'Builder', 'المنشئ', '/reports/builder', 'build', 'reporting', 'link', 3, TRUE, TRUE),
  ('reporting-scheduled', 'reporting', 'Scheduled', 'المجدولة', '/reports/scheduled', 'schedule', 'reporting', 'link', 4, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── ANALYTICS MODULE ───────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('analytics', NULL, 'Analytics', 'التحليلات', NULL, 'insights', 'analytics', 'group', 2200, TRUE, TRUE),
  ('analytics-overview', 'analytics', 'Overview', 'نظرة عامة', '/analytics/overview', 'dashboard', 'analytics', 'link', 1, TRUE, TRUE),
  ('analytics-hub', 'analytics', 'Hub', 'المركز', '/analytics-hub', 'hub', 'analytics', 'link', 2, TRUE, TRUE),
  ('analytics-data-explorer', 'analytics', 'Data Explorer', 'مستكشف البيانات', '/data-explorer', 'explore', 'analytics', 'link', 3, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- ─── MESSAGING MODULE ───────────────────────────────────────────────────────
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('messaging', NULL, 'Messaging', 'المراسلة', NULL, 'notifications', 'messaging', 'group', 2400, TRUE, TRUE),
  ('messaging-overview', 'messaging', 'Overview', 'نظرة عامة', '/messaging/overview', 'dashboard', 'messaging', 'link', 1, TRUE, TRUE),
  ('messaging-notifications', 'messaging', 'Notifications', 'الإشعارات', '/notifications', 'notifications_active', 'messaging', 'link', 2, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- 5b. Privacy module — distinct from policy (added by audit fix)
INSERT INTO navigation_registry
  (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
VALUES
  ('privacy', NULL, 'Privacy', 'الخصوصية', NULL, 'shield', 'privacy', 'group', 1800, TRUE, TRUE),
  ('privacy-overview', 'privacy', 'Overview', 'نظرة عامة', '/privacy/overview', 'dashboard', 'privacy', 'link', 1, TRUE, TRUE),
  ('privacy-dpia', 'privacy', 'DPIA', 'تقييم الأثر', '/privacy/dpia', 'file_present', 'privacy', 'link', 2, TRUE, TRUE),
  ('privacy-consent', 'privacy', 'Consent', 'الموافقات', '/privacy/consent', 'handshake', 'privacy', 'link', 3, TRUE, TRUE),
  ('privacy-data-map', 'privacy', 'Data Mapping', 'خريطة البيانات', '/privacy/data-map', 'map', 'privacy', 'link', 4, TRUE, TRUE),
  ('privacy-rights', 'privacy', 'Subject Rights', 'حقوق المعنيين', '/privacy/rights', 'person', 'privacy', 'link', 5, TRUE, TRUE),
  ('privacy-incidents', 'privacy', 'Incidents', 'الحوادث', '/privacy/incidents', 'report_problem', 'privacy', 'link', 6, TRUE, TRUE),
  ('privacy-compliance', 'privacy', 'Compliance', 'الامتثال', '/privacy/compliance', 'verified_user', 'privacy', 'link', 7, TRUE, TRUE)
ON CONFLICT (nav_key) DO NOTHING;

-- 6. Re-link newly inserted nav items to module_pages
UPDATE navigation_registry nr SET page_code = mp.page_code
FROM module_pages mp
WHERE nr.route IS NOT NULL
  AND nr.route = mp.route
  AND nr.page_code IS NULL;

UPDATE navigation_registry nr SET permission_code = mp.legacy_permission
FROM module_pages mp
WHERE nr.page_code = mp.page_code
  AND nr.permission_code IS NULL;

-- 7. Index for new columns
CREATE INDEX IF NOT EXISTS idx_navr_page_code ON navigation_registry(page_code) WHERE page_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_navr_module_code ON navigation_registry(module_code) WHERE module_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_navr_product_key ON navigation_registry(product_key);
