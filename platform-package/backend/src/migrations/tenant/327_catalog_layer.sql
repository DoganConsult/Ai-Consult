-- ============================================
-- Tenant Migration 261
-- Catalog Layer Completion: Product Module
-- catalog, workflow profile catalog, and
-- policy pack catalog tables.
-- ============================================

-- 1. Product modules — global reusable module definitions
--    Canonical source of truth for every module the platform offers.
CREATE TABLE IF NOT EXISTS product_modules (
  code             TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  category         TEXT NOT NULL CHECK (category IN (
    'core', 'governance', 'risk', 'compliance', 'audit',
    'operations', 'ai', 'platform'
  )),
  description_en   TEXT,
  description_ar   TEXT,
  icon             TEXT,
  dependencies     TEXT[] DEFAULT '{}',
  tier_minimum     TEXT NOT NULL DEFAULT 'starter' CHECK (tier_minimum IN (
    'starter', 'professional', 'enterprise'
  )),
  is_core          BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       INT NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Workflow profile catalog — standard reusable workflow templates
--    Defines named workflow templates that archetypes reference.
CREATE TABLE IF NOT EXISTS workflow_profile_catalog (
  code             TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  description_en   TEXT,
  approval_style   TEXT NOT NULL CHECK (approval_style IN (
    'none', 'single', 'dual', 'committee', 'multi_level'
  )),
  default_sla_hours INT,
  requires_evidence BOOLEAN NOT NULL DEFAULT FALSE,
  sod_strictness    TEXT NOT NULL DEFAULT 'warn' CHECK (sod_strictness IN (
    'none', 'warn', 'block'
  )),
  sla_multiplier   NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Policy pack catalog — named collections of reusable policy rules
--    Allows bundling policy rules into named packs assigned to archetypes.
CREATE TABLE IF NOT EXISTS policy_pack_catalog (
  code             TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  description_en   TEXT,
  target_archetype TEXT,  -- NULL = universal, otherwise archetype-specific
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Policy pack rules — individual rules within a policy pack
CREATE TABLE IF NOT EXISTS policy_pack_rules (
  id               BIGSERIAL PRIMARY KEY,
  pack_code        TEXT NOT NULL REFERENCES policy_pack_catalog(code),
  rule_type        TEXT NOT NULL CHECK (rule_type IN (
    'activation', 'approval', 'sod', 'ai_autonomy', 'workflow', 'sla'
  )),
  module_code      TEXT,  -- NULL = applies to all modules
  rule_config      JSONB NOT NULL DEFAULT '{}',
  priority         INT NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppr_pack ON policy_pack_rules(pack_code);
CREATE INDEX IF NOT EXISTS idx_ppr_module ON policy_pack_rules(module_code) WHERE module_code IS NOT NULL;

-- 5. Archetype → policy pack mapping — explicit link between archetypes and their packs
CREATE TABLE IF NOT EXISTS archetype_policy_pack_map (
  id               BIGSERIAL PRIMARY KEY,
  archetype_code   TEXT NOT NULL,
  pack_code        TEXT NOT NULL REFERENCES policy_pack_catalog(code),
  is_default       BOOLEAN NOT NULL DEFAULT TRUE,
  priority         INT NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (archetype_code, pack_code)
);

CREATE INDEX IF NOT EXISTS idx_appm_archetype ON archetype_policy_pack_map(archetype_code);

-- ============================================
-- Seed: Product Modules
-- Matches the 14 module codes used across
-- module_activation_policies (M257)
-- ============================================
INSERT INTO product_modules (code, name_en, name_ar, category, description_en, tier_minimum, is_core, sort_order, dependencies)
VALUES
  ('risk',        'Risk Management',         'إدارة المخاطر',          'risk',       'Enterprise risk identification, assessment, treatment, and monitoring',                            'starter',       TRUE,  10,  '{}'),
  ('compliance',  'Compliance Management',   'إدارة الامتثال',         'compliance', 'Regulatory compliance tracking, obligations mapping, and gap analysis',                           'starter',       TRUE,  20,  '{}'),
  ('evidence',    'Evidence Management',     'إدارة الأدلة',           'compliance', 'Evidence collection, validation, and lifecycle management for compliance and audit',               'starter',       TRUE,  30,  '{compliance}'),
  ('policy',      'Policy Management',       'إدارة السياسات',         'governance', 'Policy lifecycle management including drafting, review, approval, and distribution',              'starter',       FALSE, 40,  '{}'),
  ('audit',       'Internal Audit',          'التدقيق الداخلي',        'audit',      'Audit planning, execution, findings, and remediation tracking',                                   'professional',  FALSE, 50,  '{}'),
  ('incident',    'Incident Management',     'إدارة الحوادث',          'operations', 'Security and compliance incident detection, response, and post-incident review',                  'starter',       FALSE, 60,  '{}'),
  ('governance',  'Governance Bodies',       'هيئات الحوكمة',          'governance', 'Board and committee management, meeting minutes, and governance structure',                       'professional',  FALSE, 70,  '{}'),
  ('vendor',      'Vendor Risk Management',  'إدارة مخاطر الموردين',   'risk',       'Third-party risk assessment, due diligence, and ongoing vendor monitoring',                       'professional',  FALSE, 80,  '{}'),
  ('asset',       'Asset Management',        'إدارة الأصول',           'operations', 'IT and information asset inventory, classification, and risk linkage',                            'professional',  FALSE, 90,  '{}'),
  ('bcp',         'Business Continuity',     'استمرارية الأعمال',      'operations', 'Business impact analysis, continuity planning, and disaster recovery',                            'enterprise',    FALSE, 100, '{}'),
  ('exception',   'Exception Management',    'إدارة الاستثناءات',      'governance', 'Policy and control exception requests, approvals, and time-bound tracking',                       'professional',  FALSE, 110, '{policy}'),
  ('remediation', 'Remediation Tracking',    'تتبع المعالجة',          'operations', 'Cross-module remediation action tracking with ownership and deadline management',                 'starter',       TRUE,  120, '{risk,compliance}'),
  ('action',      'Action Items',            'بنود العمل',             'core',       'Centralized action item management across all GRC modules',                                       'starter',       TRUE,  130, '{}'),
  ('reporting',   'Reporting & Analytics',   'التقارير والتحليلات',    'platform',   'Cross-module dashboards, reports, KRI/KPI tracking, and executive summaries',                     'starter',       TRUE,  140, '{}')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed: Workflow Profile Catalog
-- Standard templates referenced by archetypes
-- ============================================
INSERT INTO workflow_profile_catalog (code, name_en, approval_style, default_sla_hours, requires_evidence, sod_strictness, sla_multiplier)
VALUES
  ('lean',       'Lean Workflow',       'single',      24,  FALSE, 'warn',  0.50),
  ('standard',   'Standard Workflow',   'dual',        48,  FALSE, 'warn',  1.00),
  ('regulated',  'Regulated Workflow',  'committee',   72,  TRUE,  'block', 1.50),
  ('government', 'Government Workflow', 'multi_level', 96,  TRUE,  'block', 2.00)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed: Policy Pack Catalog
-- Named packs for each archetype profile
-- ============================================
INSERT INTO policy_pack_catalog (code, name_en, description_en, target_archetype)
VALUES
  ('lean_defaults',       'Lean Organization Defaults',       'Minimal governance with single approvals and relaxed SoD',    'lean_org'),
  ('standard_defaults',   'Standard Enterprise Defaults',     'Balanced governance with dual approvals and warning-level SoD', 'standard_enterprise'),
  ('regulated_defaults',  'Regulated Enterprise Defaults',    'Strict governance with committee approvals and blocking SoD',  'regulated_enterprise'),
  ('government_defaults', 'Government Authority Defaults',    'Maximum governance with multi-level approvals and full SoD',   'government_authority'),
  ('universal_core',      'Universal Core Rules',             'Base rules applied to all archetypes regardless of profile',    NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed: Policy Pack Rules (universal core)
-- ============================================
INSERT INTO policy_pack_rules (pack_code, rule_type, module_code, rule_config, priority)
VALUES
  -- Universal: core modules always activated
  ('universal_core', 'activation', 'risk',        '{"activation": "mandatory"}',  10),
  ('universal_core', 'activation', 'compliance',  '{"activation": "mandatory"}',  10),
  ('universal_core', 'activation', 'action',      '{"activation": "mandatory"}',  10),
  ('universal_core', 'activation', 'reporting',   '{"activation": "mandatory"}',  10),
  ('universal_core', 'activation', 'remediation', '{"activation": "mandatory"}',  10),
  -- Universal: self-approval always blocked
  ('universal_core', 'sod',        NULL,          '{"prevent_self_approval": true}', 10),
  -- Universal: AI reporting always allowed
  ('universal_core', 'ai_autonomy', 'reporting',  '{"autonomy": "auto_execute", "action_class": "generate_report"}', 10)
ON CONFLICT DO NOTHING;

-- Government-specific pack rules
INSERT INTO policy_pack_rules (pack_code, rule_type, module_code, rule_config, priority)
VALUES
  ('government_defaults', 'approval',     NULL,   '{"min_approvers": 2, "escalation_hours": 24}',   50),
  ('government_defaults', 'sod',          NULL,   '{"strictness": "block", "scope": "tenant_wide"}', 50),
  ('government_defaults', 'ai_autonomy',  NULL,   '{"autonomy": "suggest_only", "default": true}',   50),
  ('government_defaults', 'sla',          NULL,   '{"multiplier": 2.0}',                             50),
  ('government_defaults', 'workflow',     NULL,   '{"requires_evidence": true}',                     50)
ON CONFLICT DO NOTHING;

-- Regulated-specific pack rules
INSERT INTO policy_pack_rules (pack_code, rule_type, module_code, rule_config, priority)
VALUES
  ('regulated_defaults', 'approval',     NULL,   '{"min_approvers": 2, "escalation_hours": 48}',    50),
  ('regulated_defaults', 'sod',          NULL,   '{"strictness": "block", "scope": "same_scope"}',  50),
  ('regulated_defaults', 'ai_autonomy',  NULL,   '{"autonomy": "approve_first", "default": true}',  50),
  ('regulated_defaults', 'sla',          NULL,   '{"multiplier": 1.5}',                             50),
  ('regulated_defaults', 'workflow',     NULL,   '{"requires_evidence": true}',                     50)
ON CONFLICT DO NOTHING;

-- Standard-specific pack rules
INSERT INTO policy_pack_rules (pack_code, rule_type, module_code, rule_config, priority)
VALUES
  ('standard_defaults', 'approval',     NULL,   '{"min_approvers": 1, "escalation_hours": 72}',    50),
  ('standard_defaults', 'sod',          NULL,   '{"strictness": "warn", "scope": "same_scope"}',   50),
  ('standard_defaults', 'ai_autonomy',  NULL,   '{"autonomy": "auto_with_review", "default": true}', 50),
  ('standard_defaults', 'sla',          NULL,   '{"multiplier": 1.0}',                             50)
ON CONFLICT DO NOTHING;

-- Lean-specific pack rules
INSERT INTO policy_pack_rules (pack_code, rule_type, module_code, rule_config, priority)
VALUES
  ('lean_defaults', 'approval',     NULL,   '{"min_approvers": 1, "escalation_hours": 168}',   50),
  ('lean_defaults', 'sod',          NULL,   '{"strictness": "warn", "scope": "same_scope"}',   50),
  ('lean_defaults', 'ai_autonomy',  NULL,   '{"autonomy": "auto_execute", "default": true}',   50),
  ('lean_defaults', 'sla',          NULL,   '{"multiplier": 0.5}',                             50)
ON CONFLICT DO NOTHING;

-- ============================================
-- Seed: Archetype → Policy Pack Mapping
-- Explicit link so services know which packs
-- apply to each archetype without guessing.
-- ============================================
INSERT INTO archetype_policy_pack_map (archetype_code, pack_code, is_default, priority)
VALUES
  -- Universal core applies to all archetypes (highest priority)
  ('lean_org',             'universal_core',       TRUE, 10),
  ('standard_enterprise',  'universal_core',       TRUE, 10),
  ('regulated_enterprise', 'universal_core',       TRUE, 10),
  ('government_authority', 'universal_core',       TRUE, 10),
  -- Each archetype gets its own default pack
  ('lean_org',             'lean_defaults',        TRUE, 50),
  ('standard_enterprise',  'standard_defaults',    TRUE, 50),
  ('regulated_enterprise', 'regulated_defaults',   TRUE, 50),
  ('government_authority', 'government_defaults',  TRUE, 50)
ON CONFLICT (archetype_code, pack_code) DO NOTHING;
