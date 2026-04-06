-- ============================================
-- Tenant Migration 270
-- Expand product_modules to full platform
-- inventory (~40 modules). Adds qiyas, iam,
-- onboarding, executive, frameworks, controls,
-- admin, report, issue, team + module alias
-- resolution table.
-- ============================================

-- ============================================
-- 1. Module Code Aliases
--    Maps legacy/alternative names to canonical
--    product_module codes for resolution.
-- ============================================
CREATE TABLE IF NOT EXISTS module_code_aliases (
  alias_code   TEXT PRIMARY KEY,
  canonical_code TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'legacy',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO module_code_aliases (alias_code, canonical_code, source) VALUES
  ('reports',  'reporting',  'kickstart'),    -- module-kickstart.service.ts ModuleCode
  ('control',  'controls',   'legacy_m031'),  -- M031 singular form
  ('grc',      'workspace',  'entitlements'), -- module-guard product flag
  ('dashboard','executive',  'ai_tools')      -- dashboard permission scope
ON CONFLICT (alias_code) DO NOTHING;

-- ============================================
-- 2. Add 10 new product modules
-- ============================================
INSERT INTO product_modules (code, name_en, name_ar, category, description_en, tier_minimum, is_core, sort_order, dependencies)
VALUES
  -- Separate product
  ('qiyas',       'Qiyas Assessment Platform',  'منصة قياس للتقييم',          'compliance', 'GRC maturity assessment, benchmarking, evidence scoring, and certification readiness',     'professional',  FALSE, 250, '{compliance,evidence}'),

  -- Platform infrastructure modules
  ('iam',         'Identity & Access Management','إدارة الهوية والوصول',       'platform',   'User identity, authentication, role assignment, and access control management',             'starter',       TRUE,  260, '{workspace}'),
  ('onboarding',  'Workspace Onboarding',        'إعداد مساحة العمل',          'platform',   'Guided workspace setup, module onboarding questionnaires, and provisioning workflows',    'starter',       TRUE,  270, '{workspace,foundation}'),
  ('executive',   'Executive Dashboard',          'لوحة القيادة التنفيذية',     'platform',   'Executive-level GRC overview, KRI/KPI tracking, and board-ready reporting',                'professional',  FALSE, 280, '{reporting,analytics}'),

  -- GRC sub-domain modules
  ('frameworks',  'Framework Management',         'إدارة الأطر التنظيمية',     'compliance', 'Regulatory framework mapping, control cross-referencing, and framework gap analysis',      'starter',       FALSE, 290, '{compliance}'),
  ('controls',    'Control Management',            'إدارة الضوابط الرقابية',    'compliance', 'Control design, testing, effectiveness assessment, and remediation tracking',               'starter',       FALSE, 300, '{compliance}'),

  -- Administrative and operational
  ('admin',       'System Administration',         'إدارة النظام',              'platform',   'User management, role configuration, workspace settings, and system integrations',         'starter',       TRUE,  310, '{workspace}'),
  ('report',      'Report Generation',             'إنشاء التقارير',            'platform',   'Custom report builder, scheduled report generation, and export management',                'starter',       FALSE, 320, '{reporting}'),
  ('issue',       'Issue Tracking',                'تتبع المشكلات',             'operations', 'Issue logging, assignment, resolution tracking, and root cause analysis',                   'starter',       FALSE, 330, '{incident}'),
  ('team',        'Team Management',               'إدارة الفرق',              'core',       'Team composition, member management, and cross-functional team coordination',              'starter',       FALSE, 340, '{governance}')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. Module Activation Policies (4 archetypes × 10 modules)
-- ============================================
INSERT INTO module_activation_policies
  (archetype_code, module_code, activation_status, tier_required, dependencies, description_en) VALUES

-- LEAN ORG
('lean_org', 'qiyas',       'hidden',       'professional',  '{compliance,evidence}',     'Qiyas assessment platform'),
('lean_org', 'iam',         'mandatory',    'starter',       '{workspace}',               'Identity management'),
('lean_org', 'onboarding',  'mandatory',    'starter',       '{workspace,foundation}',    'Workspace onboarding'),
('lean_org', 'executive',   'hidden',       'professional',  '{reporting,analytics}',     'Executive dashboard'),
('lean_org', 'frameworks',  'optional',     'starter',       '{compliance}',              'Framework management'),
('lean_org', 'controls',    'optional',     'starter',       '{compliance}',              'Control management'),
('lean_org', 'admin',       'mandatory',    'starter',       '{workspace}',               'System admin'),
('lean_org', 'report',      'optional',     'starter',       '{reporting}',               'Report generation'),
('lean_org', 'issue',       'optional',     'starter',       '{incident}',                'Issue tracking'),
('lean_org', 'team',        'optional',     'starter',       '{governance}',              'Team management'),

-- STANDARD ENTERPRISE
('standard_enterprise', 'qiyas',       'optional',     'professional',  '{compliance,evidence}',     'Qiyas assessment platform'),
('standard_enterprise', 'iam',         'mandatory',    'starter',       '{workspace}',               'Identity management'),
('standard_enterprise', 'onboarding',  'mandatory',    'starter',       '{workspace,foundation}',    'Workspace onboarding'),
('standard_enterprise', 'executive',   'recommended',  'professional',  '{reporting,analytics}',     'Executive dashboard'),
('standard_enterprise', 'frameworks',  'recommended',  'starter',       '{compliance}',              'Framework management'),
('standard_enterprise', 'controls',    'recommended',  'starter',       '{compliance}',              'Control management'),
('standard_enterprise', 'admin',       'mandatory',    'starter',       '{workspace}',               'System admin'),
('standard_enterprise', 'report',      'recommended',  'starter',       '{reporting}',               'Report generation'),
('standard_enterprise', 'issue',       'recommended',  'starter',       '{incident}',                'Issue tracking'),
('standard_enterprise', 'team',        'recommended',  'starter',       '{governance}',              'Team management'),

-- REGULATED ENTERPRISE
('regulated_enterprise', 'qiyas',       'recommended',  'professional',  '{compliance,evidence}',     'Qiyas assessment platform'),
('regulated_enterprise', 'iam',         'mandatory',    'starter',       '{workspace}',               'Identity management'),
('regulated_enterprise', 'onboarding',  'mandatory',    'starter',       '{workspace,foundation}',    'Workspace onboarding'),
('regulated_enterprise', 'executive',   'mandatory',    'professional',  '{reporting,analytics}',     'Executive dashboard'),
('regulated_enterprise', 'frameworks',  'mandatory',    'starter',       '{compliance}',              'Framework management'),
('regulated_enterprise', 'controls',    'mandatory',    'starter',       '{compliance}',              'Control management'),
('regulated_enterprise', 'admin',       'mandatory',    'starter',       '{workspace}',               'System admin'),
('regulated_enterprise', 'report',      'mandatory',    'starter',       '{reporting}',               'Report generation'),
('regulated_enterprise', 'issue',       'mandatory',    'starter',       '{incident}',                'Issue tracking'),
('regulated_enterprise', 'team',        'mandatory',    'starter',       '{governance}',              'Team management'),

-- GOVERNMENT AUTHORITY
('government_authority', 'qiyas',       'mandatory',    'professional',  '{compliance,evidence}',     'Qiyas assessment platform'),
('government_authority', 'iam',         'mandatory',    'starter',       '{workspace}',               'Identity management'),
('government_authority', 'onboarding',  'mandatory',    'starter',       '{workspace,foundation}',    'Workspace onboarding'),
('government_authority', 'executive',   'mandatory',    'professional',  '{reporting,analytics}',     'Executive dashboard'),
('government_authority', 'frameworks',  'mandatory',    'starter',       '{compliance}',              'Framework management'),
('government_authority', 'controls',    'mandatory',    'starter',       '{compliance}',              'Control management'),
('government_authority', 'admin',       'mandatory',    'starter',       '{workspace}',               'System admin'),
('government_authority', 'report',      'mandatory',    'starter',       '{reporting}',               'Report generation'),
('government_authority', 'issue',       'mandatory',    'starter',       '{incident}',                'Issue tracking'),
('government_authority', 'team',        'mandatory',    'starter',       '{governance}',              'Team management')
ON CONFLICT (archetype_code, module_code) DO NOTHING;

-- ============================================
-- 4. Module Workflow Profiles for new modules
-- ============================================
INSERT INTO module_workflow_profiles
  (archetype_code, module_code, profile_code, approval_style, sod_strictness, sla_multiplier, auto_escalate) VALUES

-- LEAN ORG
('lean_org', 'qiyas',      'lean', 'single', 'warn',  0.50, false),
('lean_org', 'frameworks',  'lean', 'none',   'none',  0.50, false),
('lean_org', 'controls',    'lean', 'single', 'warn',  0.50, false),
('lean_org', 'issue',       'lean', 'none',   'none',  0.50, false),
('lean_org', 'team',        'lean', 'none',   'none',  0.50, false),

-- STANDARD ENTERPRISE
('standard_enterprise', 'qiyas',       'standard', 'dual',   'warn',  1.00, true),
('standard_enterprise', 'frameworks',  'standard', 'single', 'warn',  1.00, false),
('standard_enterprise', 'controls',    'standard', 'dual',   'warn',  1.00, true),
('standard_enterprise', 'issue',       'standard', 'single', 'warn',  0.75, true),
('standard_enterprise', 'team',        'standard', 'single', 'warn',  1.00, false),

-- REGULATED ENTERPRISE
('regulated_enterprise', 'qiyas',       'regulated', 'committee', 'block', 1.50, true),
('regulated_enterprise', 'frameworks',  'regulated', 'dual',      'block', 1.25, true),
('regulated_enterprise', 'controls',    'regulated', 'committee', 'block', 1.50, true),
('regulated_enterprise', 'issue',       'regulated', 'dual',      'block', 1.00, true),
('regulated_enterprise', 'team',        'regulated', 'dual',      'warn',  1.25, false),

-- GOVERNMENT AUTHORITY
('government_authority', 'qiyas',       'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'frameworks',  'government', 'committee',   'block', 1.50, true),
('government_authority', 'controls',    'government', 'multi_level', 'block', 2.00, true),
('government_authority', 'issue',       'government', 'committee',   'block', 1.50, true),
('government_authority', 'team',        'government', 'dual',        'block', 1.50, true)
ON CONFLICT (archetype_code, module_code) DO NOTHING;

-- ============================================
-- 5. AI Action Policies for new content modules
-- ============================================
INSERT INTO ai_action_policies
  (archetype_code, module_code, action_class, autonomy_level, requires_approval, approval_role, max_risk_level) VALUES

-- Qiyas AI policies
('lean_org',             'qiyas', 'observe',      'observe',      false, NULL,                    'critical'),
('lean_org',             'qiyas', 'recommend',    'recommend',    false, NULL,                    'high'),
('lean_org',             'qiyas', 'draft',        'draft',        false, NULL,                    'high'),
('standard_enterprise',  'qiyas', 'observe',      'observe',      false, NULL,                    'critical'),
('standard_enterprise',  'qiyas', 'recommend',    'recommend',    false, NULL,                    'high'),
('standard_enterprise',  'qiyas', 'draft',        'draft',        true,  'compliance_analyst',    'high'),
('standard_enterprise',  'qiyas', 'auto_execute', 'block',        false, NULL,                    'low'),
('regulated_enterprise', 'qiyas', 'observe',      'observe',      false, NULL,                    'critical'),
('regulated_enterprise', 'qiyas', 'recommend',    'recommend',    true,  'compliance_manager',    'high'),
('regulated_enterprise', 'qiyas', 'auto_execute', 'block',        false, NULL,                    'low'),
('government_authority', 'qiyas', 'observe',      'observe',      false, NULL,                    'critical'),
('government_authority', 'qiyas', 'auto_execute', 'block',        false, NULL,                    'low'),

-- Controls AI policies
('lean_org',             'controls', 'observe',      'observe',      false, NULL,                  'critical'),
('lean_org',             'controls', 'recommend',    'recommend',    false, NULL,                  'high'),
('lean_org',             'controls', 'draft',        'draft',        false, NULL,                  'high'),
('standard_enterprise',  'controls', 'observe',      'observe',      false, NULL,                  'critical'),
('standard_enterprise',  'controls', 'recommend',    'recommend',    false, NULL,                  'high'),
('standard_enterprise',  'controls', 'auto_execute', 'block',        false, NULL,                  'low'),
('regulated_enterprise', 'controls', 'observe',      'observe',      false, NULL,                  'critical'),
('regulated_enterprise', 'controls', 'recommend',    'recommend',    true,  'control_owner',       'high'),
('regulated_enterprise', 'controls', 'auto_execute', 'block',        false, NULL,                  'low'),
('government_authority', 'controls', 'observe',      'observe',      false, NULL,                  'critical'),
('government_authority', 'controls', 'auto_execute', 'block',        false, NULL,                  'low'),

-- Frameworks AI policies
('lean_org',             'frameworks', 'observe',      'observe',      false, NULL,                'critical'),
('lean_org',             'frameworks', 'recommend',    'auto_execute', false, NULL,                'high'),
('standard_enterprise',  'frameworks', 'observe',      'observe',      false, NULL,                'critical'),
('standard_enterprise',  'frameworks', 'recommend',    'recommend',    false, NULL,                'high'),
('regulated_enterprise', 'frameworks', 'observe',      'observe',      false, NULL,                'critical'),
('regulated_enterprise', 'frameworks', 'auto_execute', 'block',        false, NULL,                'low'),
('government_authority', 'frameworks', 'observe',      'observe',      false, NULL,                'critical'),
('government_authority', 'frameworks', 'auto_execute', 'block',        false, NULL,                'low'),

-- Issue AI policies (similar to incident)
('lean_org',             'issue', 'observe',      'observe',      false, NULL,                    'critical'),
('lean_org',             'issue', 'draft',        'draft',        false, NULL,                    'high'),
('lean_org',             'issue', 'auto_assign',  'auto_assign',  false, NULL,                    'medium'),
('standard_enterprise',  'issue', 'observe',      'observe',      false, NULL,                    'critical'),
('standard_enterprise',  'issue', 'draft',        'draft',        false, NULL,                    'high'),
('standard_enterprise',  'issue', 'auto_assign',  'auto_assign',  false, NULL,                    'medium'),
('regulated_enterprise', 'issue', 'observe',      'observe',      false, NULL,                    'critical'),
('regulated_enterprise', 'issue', 'recommend',    'recommend',    true,  'issue_owner',            'high'),
('government_authority', 'issue', 'observe',      'observe',      false, NULL,                    'critical'),
('government_authority', 'issue', 'auto_execute', 'block',        false, NULL,                    'low')
ON CONFLICT (archetype_code, module_code, action_class) DO NOTHING;

-- ============================================
-- 6. Seed module_health_status for new modules
-- ============================================
INSERT INTO module_health_status (module_code, entitled, provisioned, health_score)
SELECT pm.code, FALSE, FALSE, 0
FROM product_modules pm
WHERE pm.code IN (
  'qiyas','iam','onboarding','executive','frameworks',
  'controls','admin','report','issue','team'
)
ON CONFLICT (module_code) DO NOTHING;
