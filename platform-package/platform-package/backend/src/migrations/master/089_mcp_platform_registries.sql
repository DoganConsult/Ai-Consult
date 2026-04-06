-- ============================================================================
-- Migration 089: MCP AI OS Platform Registries (master/public schema)
-- Canonical platform-owned registries: agents, tools, prompts, resources
-- These are global product catalog — NOT tenant-scoped.
-- Follows: CANONICAL_AGRC_MODULE_CODES, Arabic-first bilingual, existing
-- workflow conventions (workflow_definitions.workflow_id UUID, L0-L3 autonomy,
-- agent_autonomy_policies, workflow_agent_tool_policy).
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════
-- 1. mcp_agent_registry — canonical agent catalog (platform-owned)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.mcp_agent_registry (
  agent_id            VARCHAR(20)  PRIMARY KEY,
  name_en             VARCHAR(255) NOT NULL,
  name_ar             VARCHAR(255) NOT NULL,
  summary_en          TEXT,
  summary_ar          TEXT,

  owner_module_code   VARCHAR(64)  NOT NULL,
  domain_code         VARCHAR(64)  NOT NULL,
  module_codes        TEXT[]       NOT NULL DEFAULT '{}',
  capabilities        TEXT[]       NOT NULL DEFAULT '{}',
  tags                TEXT[]       NOT NULL DEFAULT '{}',

  guardrails          JSONB        NOT NULL DEFAULT '{"allowInternet": false, "maxSteps": 12}',

  icon                VARCHAR(50),
  color               VARCHAR(20),

  status              VARCHAR(20)  NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'deprecated', 'retired')),
  version             INT          NOT NULL DEFAULT 1,
  effective_from      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  effective_to        TIMESTAMPTZ,
  replaced_by         VARCHAR(20),
  change_notes        TEXT,

  visibility_scope    VARCHAR(30)  NOT NULL DEFAULT 'all'
    CHECK (visibility_scope IN ('all', 'internal', 'admin_only', 'beta')),

  is_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
  is_system           BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order          INT          NOT NULL DEFAULT 0,

  created_by          TEXT         NOT NULL DEFAULT 'system',
  updated_by          TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_agent_enabled
  ON public.mcp_agent_registry (is_enabled) WHERE is_enabled = TRUE AND status = 'active';

-- ══════════════════════════════════════════════════════════════════════════
-- 2. mcp_tool_registry — canonical tool catalog (platform-owned)
--    execution_type + handler_key replace raw service_function
--    owner_module_code + domain_code + category split ownership
--    full approval/autonomy policy, lifecycle, security
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.mcp_tool_registry (
  tool_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name           VARCHAR(128) NOT NULL,
  display_name_en     VARCHAR(255) NOT NULL,
  display_name_ar     VARCHAR(255) NOT NULL,
  description_en      TEXT         NOT NULL,
  description_ar      TEXT,

  -- FK to agent
  agent_id            VARCHAR(20)  NOT NULL REFERENCES public.mcp_agent_registry(agent_id),

  -- ownership split (spec §4)
  owner_module_code   VARCHAR(64)  NOT NULL,
  domain_code         VARCHAR(64)  NOT NULL,
  category            VARCHAR(64)  NOT NULL DEFAULT 'general',
  tags                TEXT[]       NOT NULL DEFAULT '{}',
  visibility_scope    VARCHAR(30)  NOT NULL DEFAULT 'all'
    CHECK (visibility_scope IN ('all', 'internal', 'admin_only', 'beta')),

  -- execution contract (spec §3)
  execution_type      VARCHAR(30)  NOT NULL DEFAULT 'internal_service'
    CHECK (execution_type IN (
      'internal_service', 'workflow_action', 'connector_action',
      'http_proxy', 'job_dispatch', 'approval_only'
    )),
  handler_key         VARCHAR(255) NOT NULL,
  provider_key        VARCHAR(128),
  execution_config    JSONB        NOT NULL DEFAULT '{"timeout": 30000, "retries": 0, "async": false}',

  -- schema
  input_schema        JSONB        NOT NULL DEFAULT '{}',
  output_schema       JSONB        NOT NULL DEFAULT '{}',

  -- security (spec §13)
  risk_level          VARCHAR(20)  NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  data_classification VARCHAR(30)  NOT NULL DEFAULT 'internal'
    CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  sensitivity_level   VARCHAR(20)  NOT NULL DEFAULT 'normal'
    CHECK (sensitivity_level IN ('normal', 'elevated', 'high', 'critical')),
  required_permissions TEXT[]      NOT NULL DEFAULT '{}',
  required_roles       TEXT[]      NOT NULL DEFAULT '{}',
  allowed_actor_types  TEXT[]      NOT NULL DEFAULT ARRAY['human','copilot','assisted','autonomous'],
  allowed_platform_modes TEXT[]    NOT NULL DEFAULT ARRAY['human','copilot','assisted','autonomous','hyper'],
  requires_tenant_context BOOLEAN  NOT NULL DEFAULT TRUE,
  requires_user_context   BOOLEAN  NOT NULL DEFAULT TRUE,

  -- approval policy (spec §8)
  approval_mode       VARCHAR(30)  NOT NULL DEFAULT 'none'
    CHECK (approval_mode IN ('none', 'single', 'multi_step', 'risk_based', 'manual_gate')),
  approval_config     JSONB        NOT NULL DEFAULT '{}',

  -- autonomy policy (spec §8) — aligned with existing L0-L3 convention
  min_autonomy        VARCHAR(10)  NOT NULL DEFAULT 'L0'
    CHECK (min_autonomy IN ('L0', 'L1', 'L2', 'L3')),
  max_autonomy        VARCHAR(10)  NOT NULL DEFAULT 'L3'
    CHECK (max_autonomy IN ('L0', 'L1', 'L2', 'L3')),
  default_autonomy    VARCHAR(10)  NOT NULL DEFAULT 'L0'
    CHECK (default_autonomy IN ('L0', 'L1', 'L2', 'L3')),
  human_review_on_error          BOOLEAN NOT NULL DEFAULT TRUE,
  human_review_on_sensitive_data BOOLEAN NOT NULL DEFAULT TRUE,
  autonomous_retries_allowed     INT     NOT NULL DEFAULT 0,

  -- rate limiting (spec §11)
  max_calls_per_min   INT          NOT NULL DEFAULT 60,

  -- lifecycle (spec §5)
  status              VARCHAR(20)  NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'deprecated', 'retired')),
  version             INT          NOT NULL DEFAULT 1,
  effective_from      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  effective_to        TIMESTAMPTZ,
  retired_at          TIMESTAMPTZ,
  replaced_by         VARCHAR(128),
  change_notes        TEXT,

  is_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
  is_system           BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order          INT          NOT NULL DEFAULT 0,

  created_by          TEXT         NOT NULL DEFAULT 'system',
  updated_by          TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_tool_name
  ON public.mcp_tool_registry (tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_agent
  ON public.mcp_tool_registry (agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_owner
  ON public.mcp_tool_registry (owner_module_code);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_domain
  ON public.mcp_tool_registry (domain_code);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_handler
  ON public.mcp_tool_registry (handler_key);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_active
  ON public.mcp_tool_registry (is_enabled) WHERE is_enabled = TRUE AND status = 'active';

-- ══════════════════════════════════════════════════════════════════════════
-- 3. mcp_prompt_registry — canonical prompt catalog (spec §6)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.mcp_prompt_registry (
  prompt_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name         VARCHAR(128) NOT NULL,
  display_name_en     VARCHAR(255) NOT NULL,
  display_name_ar     VARCHAR(255) NOT NULL,
  description_en      TEXT         NOT NULL,
  description_ar      TEXT,

  owner_module_code   VARCHAR(64)  NOT NULL,
  agent_id            VARCHAR(20)  REFERENCES public.mcp_agent_registry(agent_id),
  domain_code         VARCHAR(64)  NOT NULL,
  category            VARCHAR(64)  NOT NULL DEFAULT 'general',
  tags                TEXT[]       NOT NULL DEFAULT '{}',

  prompt_template     TEXT         NOT NULL,
  input_schema        JSONB        NOT NULL DEFAULT '{}',
  output_mode         VARCHAR(30)  NOT NULL DEFAULT 'text'
    CHECK (output_mode IN ('text', 'json', 'structured', 'stream')),
  guardrails          JSONB        NOT NULL DEFAULT '{}',

  visibility_scope    VARCHAR(30)  NOT NULL DEFAULT 'all'
    CHECK (visibility_scope IN ('all', 'internal', 'admin_only', 'beta')),

  status              VARCHAR(20)  NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'deprecated', 'retired')),
  version             INT          NOT NULL DEFAULT 1,
  effective_from      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  effective_to        TIMESTAMPTZ,
  replaced_by         VARCHAR(128),
  change_notes        TEXT,

  is_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
  is_system           BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order          INT          NOT NULL DEFAULT 0,

  created_by          TEXT         NOT NULL DEFAULT 'system',
  updated_by          TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_prompt_name
  ON public.mcp_prompt_registry (prompt_name);
CREATE INDEX IF NOT EXISTS idx_mcp_prompt_agent
  ON public.mcp_prompt_registry (agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_prompt_active
  ON public.mcp_prompt_registry (is_enabled) WHERE is_enabled = TRUE AND status = 'active';

-- ══════════════════════════════════════════════════════════════════════════
-- 4. mcp_resource_registry — canonical resource catalog (spec §7)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.mcp_resource_registry (
  resource_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_name       VARCHAR(128) NOT NULL,
  display_name_en     VARCHAR(255) NOT NULL,
  display_name_ar     VARCHAR(255) NOT NULL,
  description_en      TEXT         NOT NULL,
  description_ar      TEXT,

  uri_pattern         TEXT         NOT NULL,
  owner_module_code   VARCHAR(64)  NOT NULL,
  domain_code         VARCHAR(64)  NOT NULL,
  category            VARCHAR(64)  NOT NULL DEFAULT 'general',
  tags                TEXT[]       NOT NULL DEFAULT '{}',

  resolver_key        VARCHAR(255) NOT NULL,
  input_schema        JSONB        NOT NULL DEFAULT '{}',
  output_schema       JSONB        NOT NULL DEFAULT '{}',

  sensitivity_level   VARCHAR(20)  NOT NULL DEFAULT 'normal'
    CHECK (sensitivity_level IN ('normal', 'elevated', 'high', 'critical')),
  data_classification VARCHAR(30)  NOT NULL DEFAULT 'internal'
    CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  requires_permission TEXT[]       NOT NULL DEFAULT '{}',

  visibility_scope    VARCHAR(30)  NOT NULL DEFAULT 'all'
    CHECK (visibility_scope IN ('all', 'internal', 'admin_only', 'beta')),

  status              VARCHAR(20)  NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'deprecated', 'retired')),
  version             INT          NOT NULL DEFAULT 1,
  effective_from      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  effective_to        TIMESTAMPTZ,
  replaced_by         VARCHAR(128),

  is_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
  is_system           BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order          INT          NOT NULL DEFAULT 0,

  created_by          TEXT         NOT NULL DEFAULT 'system',
  updated_by          TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mcp_resource_name
  ON public.mcp_resource_registry (resource_name);
CREATE INDEX IF NOT EXISTS idx_mcp_resource_owner
  ON public.mcp_resource_registry (owner_module_code);
CREATE INDEX IF NOT EXISTS idx_mcp_resource_active
  ON public.mcp_resource_registry (is_enabled) WHERE is_enabled = TRUE AND status = 'active';

-- ══════════════════════════════════════════════════════════════════════════
-- SEED: Agent Registry (12 agents, all 30 canonical modules covered)
-- ══════════════════════════════════════════════════════════════════════════
INSERT INTO public.mcp_agent_registry (agent_id, name_en, name_ar, summary_en, summary_ar, owner_module_code, domain_code, module_codes, capabilities, guardrails, is_system, sort_order)
VALUES
  ('A01', 'Onboarding Agent',               'وكيل التأهيل',                'Organizational profiling, workspace setup, and regulatory scoping',          'تحليل المؤسسة وإعداد بيئة العمل وتحديد النطاق التنظيمي',                 'admin',       'onboarding',   ARRAY['admin','foundation'],                                   ARRAY['workspace_setup','org_profiling','regulatory_scoping','framework_recommendation'], '{"allowInternet": false, "maxSteps": 12}', true, 1),
  ('A02', 'Identity Provisioning Agent',     'وكيل إدارة الهوية',           'RBAC, IAM, SSO provisioning, user roles and access governance',              'إدارة الأدوار والصلاحيات وتكوين تسجيل الدخول الموحد',                     'admin',       'identity',     ARRAY['admin','foundation','team'],                             ARRAY['rbac_management','user_provisioning','sso_config','access_governance'], '{"allowInternet": false, "maxSteps": 8}', true, 2),
  ('A03', 'Framework Mapping Agent',         'وكيل ربط الأطر',              'Cross-framework mapping, harmonization, and regulatory intelligence',        'ربط الأطر التنظيمية والمواءمة والذكاء التنظيمي',                          'compliance',  'compliance',   ARRAY['compliance','governance'],                               ARRAY['framework_mapping','harmonization','control_overlap','regulatory_intel'], '{"allowInternet": false, "maxSteps": 10}', true, 3),
  ('A04', 'Control Authoring Agent',         'وكيل تأليف الضوابط',          'AI-assisted drafting for policies, controls, and implementation guidance',   'صياغة السياسات والضوابط وإرشادات التنفيذ بمساعدة الذكاء الاصطناعي',       'governance',  'controls',     ARRAY['governance','policy','compliance'],                      ARRAY['control_drafting','policy_writing','implementation_guidance'], '{"allowInternet": false, "maxSteps": 10}', true, 4),
  ('A05', 'Evidence Collection Agent',       'وكيل جمع الأدلة',             'Evidence collection, document intelligence, and compliance proof',           'جمع الأدلة وذكاء المستندات وإثبات الامتثال',                              'evidence',    'evidence',     ARRAY['evidence','records'],                                    ARRAY['evidence_collection','document_intelligence','artifact_management'], '{"allowInternet": false, "maxSteps": 10}', true, 5),
  ('A06', 'Gap Remediation Agent',           'وكيل معالجة الفجوات',         'Compliance gap detection, remediation roadmaps, and action plans',           'كشف فجوات الامتثال وخطط المعالجة وخطط العمل',                             'compliance',  'remediation',  ARRAY['compliance','remediation','action','issues'],            ARRAY['gap_detection','remediation_planning','roadmap_generation'], '{"allowInternet": false, "maxSteps": 10}', true, 6),
  ('A07', 'Risk Register Agent',             'وكيل سجل المخاطر',            'Risk identification, scoring, treatment planning, and KRI monitoring',      'تحديد المخاطر والتقييم وتخطيط المعالجة ومراقبة مؤشرات المخاطر',          'risk',        'risk',         ARRAY['risk','analytics'],                                      ARRAY['risk_identification','quantitative_scoring','kri_monitoring','treatment_planning'], '{"allowInternet": false, "maxSteps": 12}', true, 7),
  ('A08', 'Policy Lifecycle Agent',          'وكيل دورة حياة السياسات',     'Policy versioning, approval workflows, and regulatory change impact',       'إصدار السياسات وسير عمل الموافقة وتأثير التغييرات التنظيمية',             'policy',      'policy',       ARRAY['policy','governance','workflow','exception'],             ARRAY['policy_versioning','approval_workflow','expiry_tracking','regulatory_impact'], '{"allowInternet": false, "maxSteps": 10}', true, 8),
  ('A09', 'Third-Party Risk Agent',          'وكيل مخاطر الأطراف الثالثة',  'Vendor risk assessment, supply chain security, and compliance monitoring',   'تقييم مخاطر الموردين وأمن سلسلة التوريد ومراقبة الامتثال',               'vendor',      'vendor',       ARRAY['vendor','risk','integrations'],                          ARRAY['vendor_assessment','supply_chain_security','third_party_compliance'], '{"allowInternet": false, "maxSteps": 10}', true, 9),
  ('A10', 'Audit Reporting Agent',           'وكيل تقارير التدقيق',         'Audit reporting, regulatory submissions, and compliance certificates',      'تقارير التدقيق والتقديمات التنظيمية وشهادات الامتثال',                    'audit',       'audit',        ARRAY['audit','reporting','analytics','qiyas'],                 ARRAY['audit_reporting','regulatory_submission','executive_dashboard','compliance_cert'], '{"allowInternet": false, "maxSteps": 10}', true, 10),
  ('A11', 'BCP Continuity Agent',            'وكيل استمرارية الأعمال',      'Business continuity planning, DR testing, and recovery procedures',         'تخطيط استمرارية الأعمال واختبار التعافي من الكوارث وإجراءات الاسترداد',   'bcp',         'bcp',          ARRAY['bcp','asset','notification'],                            ARRAY['bcp_planning','dr_testing','recovery_procedures','rto_rpo_monitoring'], '{"allowInternet": false, "maxSteps": 10}', true, 11),
  ('A12', 'Security Awareness & Training Agent','وكيل التوعية والتدريب',    'Training programs, awareness campaigns, and compliance certifications',     'برامج التدريب وحملات التوعية وشهادات الامتثال',                           'training',    'training',     ARRAY['training','inbox','portals','privacy','ai-governance'],   ARRAY['training_management','awareness_campaigns','certification_tracking','phishing_simulation'], '{"allowInternet": false, "maxSteps": 10}', true, 12)
ON CONFLICT (agent_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- SEED: Tool Registry — ALL tools with handler_key execution contract
-- handler_key format: <module_code>.<functionName>
-- provider_key = <moduleCode>Service
-- ══════════════════════════════════════════════════════════════════════════

-- A01 — Onboarding (admin, foundation)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('scan_org_profile',         'Scan Organization Profile',    'فحص ملف المؤسسة',         'Scan and profile organization structure and regulatory context',   'فحص وتحليل هيكل المؤسسة والسياق التنظيمي',              'A01', 'admin',      'onboarding', 'onboarding', 'admin.getBootstrapChecklist',       'adminService',       '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 1),
('check_framework_adoption', 'Check Framework Adoption',     'التحقق من تبني الأطر',     'Check which regulatory frameworks the organization has adopted',   'التحقق من الأطر التنظيمية التي تبنتها المؤسسة',          'A01', 'compliance', 'onboarding', 'onboarding', 'compliance.getRemediations',        'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 2),
('check_workspace_health',   'Check Workspace Health',       'فحص صحة بيئة العمل',       'Verify workspace configuration and data health',                  'التحقق من تكوين بيئة العمل وصحة البيانات',               'A01', 'admin',      'onboarding', 'onboarding', 'admin.getBootstrapChecklist',       'adminService',       '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 3),
('create_onboarding_task',   'Create Onboarding Task',       'إنشاء مهمة تأهيل',         'Create a task to track onboarding progress',                       'إنشاء مهمة لتتبع تقدم التأهيل',                          'A01', 'admin',      'onboarding', 'onboarding', 'admin.createOnboardingTask',        'adminService',       '{"type":"object","properties":{"tenantId":{"type":"string"},"title":{"type":"string"},"assignee":{"type":"string"}},"required":["tenantId","title"]}', 'medium', true, 4)
ON CONFLICT (tool_name) DO NOTHING;

-- A02 — Identity (admin, foundation, team)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, approval_mode, is_system, sort_order) VALUES
('list_users_with_access_info', 'List Users With Access Info', 'قائمة المستخدمين مع معلومات الوصول', 'List all users with their roles and access permissions',  'قائمة جميع المستخدمين مع أدوارهم وصلاحيات الوصول',    'A02', 'admin',   'identity', 'identity', 'admin.listUsersWithAccess',   'adminService',   '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', 'none', true, 10),
('check_role_distribution',     'Check Role Distribution',     'التحقق من توزيع الأدوار',                       'Analyze distribution of roles across the organization',    'تحليل توزيع الأدوار عبر المؤسسة',                       'A02', 'admin',   'identity', 'identity', 'admin.checkRoleDistribution', 'adminService',   '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', 'none', true, 11),
('flag_access_risk',            'Flag Access Risk',            'الإبلاغ عن مخاطر الوصول',                       'Identify and flag excessive or conflicting access rights',  'تحديد والإبلاغ عن صلاحيات الوصول المفرطة أو المتعارضة', 'A02', 'admin',   'identity', 'identity', 'admin.flagAccessRisk',        'adminService',   '{"type":"object","properties":{"tenantId":{"type":"string"},"userId":{"type":"string"}},"required":["tenantId"]}', 'medium', 'none', true, 12),
('provision_user',              'Provision User',              'توفير مستخدم',                                  'Provision a new user with appropriate roles and access',    'توفير مستخدم جديد مع الأدوار والصلاحيات المناسبة',      'A02', 'admin',   'identity', 'identity', 'admin.provisionUser',         'adminService',   '{"type":"object","properties":{"tenantId":{"type":"string"},"email":{"type":"string"},"role":{"type":"string"}},"required":["tenantId","email","role"]}', 'high', 'single', true, 13)
ON CONFLICT (tool_name) DO NOTHING;

-- A03 — Framework Mapping (compliance, governance)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('compare_frameworks',           'Compare Frameworks',           'مقارنة الأطر',           'Compare two regulatory frameworks for overlap and gaps',          'مقارنة إطارين تنظيميين للتداخل والفجوات',               'A03', 'compliance', 'compliance', 'compliance', 'compliance.mapFramework',      'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"frameworkId":{"type":"string"}},"required":["tenantId","frameworkId"]}', 'low', true, 20),
('list_frameworks_with_coverage','List Frameworks With Coverage','قائمة الأطر مع التغطية',  'List all adopted frameworks with coverage percentages',           'قائمة جميع الأطر المتبناة مع نسب التغطية',              'A03', 'compliance', 'compliance', 'compliance', 'compliance.getGapAnalysis',    'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 21),
('create_mapping_task',          'Create Mapping Task',          'إنشاء مهمة ربط',         'Create a task to map controls to a framework',                    'إنشاء مهمة لربط الضوابط بإطار تنظيمي',                  'A03', 'compliance', 'compliance', 'compliance', 'compliance.mapControlToNodes', 'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"controlId":{"type":"string"},"nodeIds":{"type":"array","items":{"type":"string"}}},"required":["tenantId","controlId","nodeIds"]}', 'medium', true, 22),
('analyze_regulatory_impact',   'Analyze Regulatory Impact',    'تحليل الأثر التنظيمي',   'Analyze impact of regulatory changes on current compliance',      'تحليل أثر التغييرات التنظيمية على الامتثال الحالي',      'A03', 'compliance', 'compliance', 'compliance', 'compliance.getGapAnalysis',    'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"frameworkId":{"type":"string"}},"required":["tenantId","frameworkId"]}', 'low', true, 23)
ON CONFLICT (tool_name) DO NOTHING;

-- A04 — Control Authoring (governance, policy)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('get_control_details',            'Get Control Details',             'تفاصيل الضابط',          'Get detailed information about a specific control',         'الحصول على معلومات تفصيلية حول ضابط محدد',               'A04', 'governance', 'controls', 'controls', 'governance.getPolicyById',   'governanceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"controlId":{"type":"string"}},"required":["tenantId","controlId"]}', 'low', true, 30),
('update_control_notes',           'Update Control Notes',            'تحديث ملاحظات الضابط',    'Update implementation notes for a control',                 'تحديث ملاحظات التنفيذ لضابط',                             'A04', 'governance', 'controls', 'controls', 'governance.updatePolicy',    'governanceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"controlId":{"type":"string"},"notes":{"type":"string"}},"required":["tenantId","controlId","notes"]}', 'medium', true, 31),
('list_controls_needing_attention','List Controls Needing Attention', 'قائمة الضوابط التي تحتاج اهتمام','List controls that need review or remediation',       'قائمة الضوابط التي تحتاج مراجعة أو معالجة',              'A04', 'governance', 'controls', 'controls', 'governance.getPolicies',     'governanceService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 32)
ON CONFLICT (tool_name) DO NOTHING;

-- A05 — Evidence (evidence, records)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('request_evidence_collection',  'Request Evidence Collection', 'طلب جمع الأدلة',         'Request evidence collection for a control',                'طلب جمع أدلة لضابط محدد',                                'A05', 'evidence', 'evidence', 'evidence', 'evidence.createEvidenceRequest',       'evidenceService', '{"type":"object","properties":{"tenantId":{"type":"string"},"controlId":{"type":"string"}},"required":["tenantId","controlId"]}', 'medium', true, 40),
('check_evidence_freshness',     'Check Evidence Freshness',   'التحقق من حداثة الأدلة',  'Check expiring or stale evidence across controls',         'التحقق من الأدلة المنتهية أو القديمة عبر الضوابط',       'A05', 'evidence', 'evidence', 'evidence', 'evidence.getExpiringEvidence',         'evidenceService', '{"type":"object","properties":{"tenantId":{"type":"string"},"daysAhead":{"type":"number"}},"required":["tenantId"]}', 'low', true, 41),
('detect_evidence_gaps',         'Detect Evidence Gaps',       'كشف فجوات الأدلة',        'Detect controls missing required evidence',                'كشف الضوابط التي تفتقر للأدلة المطلوبة',                 'A05', 'evidence', 'evidence', 'evidence', 'evidence.checkEvidenceCompleteness',   'evidenceService', '{"type":"object","properties":{"tenantId":{"type":"string"},"controlId":{"type":"string"}},"required":["tenantId","controlId"]}', 'low', true, 42),
('get_evidence_overview',        'Get Evidence Overview',      'نظرة عامة على الأدلة',    'Get evidence collection overview statistics',              'الحصول على إحصائيات نظرة عامة لجمع الأدلة',              'A05', 'evidence', 'evidence', 'evidence', 'evidence.getOverviewStats',            'evidenceService', '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 43)
ON CONFLICT (tool_name) DO NOTHING;

-- A06 — Gap Remediation (compliance, remediation, action, issues)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('analyze_gaps',            'Analyze Gaps',            'تحليل الفجوات',         'Analyze compliance gaps for a framework',                'تحليل فجوات الامتثال لإطار تنظيمي',                  'A06', 'compliance',  'remediation', 'remediation', 'compliance.getGapAnalysis',       'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"frameworkId":{"type":"string"}},"required":["tenantId","frameworkId"]}', 'low', true, 50),
('detect_gaps',             'Detect Gaps',             'كشف الفجوات',           'Detect compliance gaps across all frameworks',           'كشف فجوات الامتثال عبر جميع الأطر',                  'A06', 'compliance',  'remediation', 'remediation', 'compliance.getRemediations',      'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 51),
('create_remediation_task', 'Create Remediation Task',  'إنشاء مهمة معالجة',     'Create a remediation task for a compliance gap',         'إنشاء مهمة معالجة لفجوة امتثال',                     'A06', 'compliance',  'remediation', 'remediation', 'compliance.createRemediation',    'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"controlId":{"type":"string"},"description":{"type":"string"}},"required":["tenantId","controlId"]}', 'medium', true, 52),
('generate_roadmap',        'Generate Roadmap',        'إنشاء خارطة طريق',      'Generate a prioritized remediation roadmap',              'إنشاء خارطة طريق معالجة ذات أولوية',                 'A06', 'compliance',  'remediation', 'remediation', 'compliance.getRemediations',      'complianceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"frameworkId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 53)
ON CONFLICT (tool_name) DO NOTHING;

-- A07 — Risk Register (risk, analytics)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, approval_mode, is_system, sort_order) VALUES
('identify_risks',     'Identify Risks',      'تحديد المخاطر',       'List all risks in the risk register',                         'قائمة جميع المخاطر في سجل المخاطر',            'A07', 'risk', 'risk', 'risk', 'risk.getRisks',           'riskService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', 'none', true, 60),
('score_risk',         'Score Risk',          'تقييم المخاطر',       'Get detailed risk scoring and assessment',                    'الحصول على تقييم وتسجيل تفصيلي للمخاطر',       'A07', 'risk', 'risk', 'risk', 'risk.getRiskById',        'riskService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"riskId":{"type":"string"}},"required":["tenantId","riskId"]}', 'low', 'none', true, 61),
('create_risk',        'Create Risk',         'إنشاء خطر',           'Create a new risk entry in the register',                     'إنشاء إدخال خطر جديد في السجل',                'A07', 'risk', 'risk', 'risk', 'risk.createRisk',         'riskService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"title":{"type":"string"},"likelihood":{"type":"number"},"impact":{"type":"number"}},"required":["tenantId","title"]}', 'high', 'single', true, 62),
('escalate_risk',      'Escalate Risk',       'تصعيد المخاطر',       'Update risk status or escalate to management',                'تحديث حالة المخاطر أو التصعيد للإدارة',         'A07', 'risk', 'risk', 'risk', 'risk.updateRisk',         'riskService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"riskId":{"type":"string"},"status":{"type":"string"}},"required":["tenantId","riskId"]}', 'high', 'single', true, 63),
('check_risk_appetite','Check Risk Appetite',  'فحص تقبل المخاطر',    'Get risk matrix and appetite thresholds',                     'الحصول على مصفوفة المخاطر وعتبات التقبل',       'A07', 'risk', 'risk', 'risk', 'risk.getRiskMatrix',      'riskService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', 'none', true, 64),
('get_kri_trends',     'Get KRI Trends',      'اتجاهات مؤشرات المخاطر','Get KRI trend data for a risk',                              'الحصول على بيانات اتجاهات مؤشرات المخاطر',      'A07', 'risk', 'risk', 'risk', 'risk.getKRITrends',       'riskService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"riskId":{"type":"string"}},"required":["tenantId","riskId"]}', 'low', 'none', true, 65)
ON CONFLICT (tool_name) DO NOTHING;

-- A08 — Policy Lifecycle (policy, governance, workflow, exception)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, approval_mode, is_system, sort_order) VALUES
('list_policies_with_health','List Policies With Health','قائمة السياسات مع الحالة الصحية','List all policies with lifecycle health status',    'قائمة جميع السياسات مع حالتها الصحية',            'A08', 'governance', 'policy', 'policy', 'governance.getPolicies',    'governanceService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', 'none', true, 70),
('create_policy',           'Create Policy',           'إنشاء سياسة',                      'Create a new policy document',                     'إنشاء وثيقة سياسة جديدة',                         'A08', 'governance', 'policy', 'policy', 'governance.createPolicy',   'governanceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"title":{"type":"string"},"content":{"type":"string"}},"required":["tenantId","title"]}', 'high', 'single', true, 71),
('approve_policy',          'Approve Policy',          'الموافقة على سياسة',                'Submit a policy for approval',                     'تقديم سياسة للموافقة',                             'A08', 'governance', 'policy', 'policy', 'governance.approvePolicy',  'governanceService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"policyId":{"type":"string"},"approverId":{"type":"string"}},"required":["tenantId","policyId","approverId"]}', 'high', 'multi_step', true, 72),
('flag_policy_issue',       'Flag Policy Issue',       'الإبلاغ عن مشكلة في سياسة',        'Flag policy nearing expiry or requiring update',   'الإبلاغ عن سياسة قريبة من انتهاء الصلاحية أو تحتاج تحديث', 'A08', 'governance', 'policy', 'policy', 'governance.checkSLADeadlines','governanceService', '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'medium', 'none', true, 73)
ON CONFLICT (tool_name) DO NOTHING;

-- A09 — Third-Party Risk (vendor, risk, integrations)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('list_vendors_with_risk','List Vendors With Risk','قائمة الموردين مع المخاطر', 'List all vendors with risk scores',                    'قائمة جميع الموردين مع درجات المخاطر',         'A09', 'vendor', 'vendor', 'vendor', 'vendor.getVendors',    'vendorService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 80),
('assess_vendor',        'Assess Vendor',        'تقييم المورد',                  'Perform risk assessment on a vendor',                  'إجراء تقييم المخاطر على مورد',                  'A09', 'vendor', 'vendor', 'vendor', 'vendor.assessVendor',  'vendorService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"vendorId":{"type":"string"}},"required":["tenantId","vendorId"]}', 'medium', true, 81),
('score_vendor',         'Score Vendor',         'تقييم درجة المورد',             'Get detailed vendor risk scoring',                     'الحصول على تقييم تفصيلي لمخاطر المورد',         'A09', 'vendor', 'vendor', 'vendor', 'vendor.getVendorById', 'vendorService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"vendorId":{"type":"string"}},"required":["tenantId","vendorId"]}', 'low', true, 82),
('monitor_vendor_sla',   'Monitor Vendor SLA',   'مراقبة اتفاقية مستوى خدمة المورد','Monitor vendor SLA compliance',                      'مراقبة امتثال اتفاقية مستوى خدمة المورد',       'A09', 'vendor', 'vendor', 'vendor', 'vendor.monitorSLA',    'vendorService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"vendorId":{"type":"string"}},"required":["tenantId","vendorId"]}', 'low', true, 83)
ON CONFLICT (tool_name) DO NOTHING;

-- A10 — Audit Reporting (audit, reporting, analytics, qiyas)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('list_audit_findings',         'List Audit Findings',          'قائمة نتائج التدقيق',         'Query audit trail with filters',                       'استعلام مسار التدقيق مع عوامل التصفية',           'A10', 'audit',     'audit',     'audit', 'audit.queryAuditTrail',               'auditService',      '{"type":"object","properties":{"tenantId":{"type":"string"},"module":{"type":"string"}},"required":["tenantId"]}', 'low', true, 90),
('check_audit_readiness',      'Check Audit Readiness',        'التحقق من جاهزية التدقيق',     'Check readiness for regulatory audit',                 'التحقق من الجاهزية للتدقيق التنظيمي',              'A10', 'audit',     'audit',     'audit', 'audit.getDistinctModules',             'auditService',      '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 91),
('generate_compliance_summary','Generate Compliance Summary',  'إنشاء ملخص الامتثال',          'Generate executive compliance summary report',         'إنشاء تقرير ملخص الامتثال التنفيذي',               'A10', 'reporting', 'reporting', 'reporting', 'report.generateExecutiveSnapshot', 'reportService',     '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 92),
('generate_compliance_report', 'Generate Compliance Report',   'إنشاء تقرير الامتثال',         'Generate detailed compliance report for a framework',  'إنشاء تقرير امتثال تفصيلي لإطار تنظيمي',          'A10', 'reporting', 'reporting', 'reporting', 'report.generateComplianceReport',  'reportService',     '{"type":"object","properties":{"tenantId":{"type":"string"},"frameworkId":{"type":"string"}},"required":["tenantId","frameworkId"]}', 'low', true, 93),
('get_completion_status',      'Get Completion Status',        'حالة الإنجاز',                  'Get overall GRC completion status',                    'الحصول على حالة الإنجاز الشاملة للحوكمة والمخاطر والامتثال', 'A10', 'reporting', 'reporting', 'reporting', 'report.generateExecutiveSnapshot', 'reportService',     '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 94)
ON CONFLICT (tool_name) DO NOTHING;

-- A11 — BCP Continuity (bcp, asset, notification)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('scan_bcp_readiness',     'Scan BCP Readiness',     'فحص جاهزية استمرارية الأعمال', 'Scan BCP readiness score and gaps',                    'فحص درجة جاهزية استمرارية الأعمال والفجوات',    'A11', 'bcp', 'bcp', 'bcp', 'bcp.getBCPReadinessScore',     'bcpService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 100),
('check_rto_rpo_drift',    'Check RTO/RPO Drift',    'فحص انحراف RTO/RPO',           'Check RTO/RPO drift against targets',                  'فحص انحراف أهداف وقت الاسترداد',                 'A11', 'bcp', 'bcp', 'bcp', 'bcp.getBCPLeadingIndicators',  'bcpService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 101),
('check_exercise_schedule','Check Exercise Schedule', 'فحص جدول التمارين',            'Check DR exercise schedule and overdue tests',         'فحص جدول تمارين التعافي والاختبارات المتأخرة',   'A11', 'bcp', 'bcp', 'bcp', 'bcp.runBCPHealthCheck',        'bcpService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 102),
('create_bcp_task',        'Create BCP Task',        'إنشاء مهمة استمرارية',          'Create a BCP plan or recovery task',                    'إنشاء خطة أو مهمة استمرارية',                    'A11', 'bcp', 'bcp', 'bcp', 'bcp.createBCP',               'bcpService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"}},"required":["tenantId","title"]}', 'medium', true, 103),
('flag_bcp_risk',          'Flag BCP Risk',          'الإبلاغ عن مخاطر الاستمرارية', 'Flag BCP risk or continuity concern',                   'الإبلاغ عن مخاطر استمرارية الأعمال',             'A11', 'bcp', 'bcp', 'bcp', 'bcp.runBCPHealthCheck',        'bcpService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'medium', true, 104)
ON CONFLICT (tool_name) DO NOTHING;

-- A12 — Security Awareness & Training (training, inbox, portals, privacy, ai-governance)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('list_training_programs',     'List Training Programs',     'قائمة برامج التدريب',         'List all training content and programs',                'قائمة جميع محتويات وبرامج التدريب',               'A12', 'training', 'training', 'training', 'training.getTrainingContent',             'trainingService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"category":{"type":"string"}},"required":["tenantId"]}', 'low', true, 110),
('get_training_gaps',          'Get Training Gaps',          'فجوات التدريب',               'Identify training compliance gaps and overdue items',   'تحديد فجوات امتثال التدريب والعناصر المتأخرة',    'A12', 'training', 'training', 'training', 'training.checkOverdueAssignments',        'trainingService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 111),
('recommend_training',         'Recommend Training',         'توصية بالتدريب',              'Recommend training based on sector and role',           'توصية بالتدريب بناء على القطاع والدور',           'A12', 'training', 'training', 'training', 'training.getSectorTrainingPath',          'trainingService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"sectorCode":{"type":"string"}},"required":["tenantId","sectorCode"]}', 'low', true, 112),
('assign_training',            'Assign Training',            'تعيين تدريب',                 'Assign training to users',                              'تعيين تدريب للمستخدمين',                           'A12', 'training', 'training', 'training', 'training.assignTraining',                 'trainingService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"userId":{"type":"string"},"contentId":{"type":"string"}},"required":["tenantId","userId","contentId"]}', 'medium', true, 113),
('create_awareness_campaign',  'Create Awareness Campaign',  'إنشاء حملة توعية',            'Create a security awareness campaign',                  'إنشاء حملة توعية أمنية',                           'A12', 'training', 'training', 'training', 'training.createCampaign',                 'trainingService',  '{"type":"object","properties":{"tenantId":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"}},"required":["tenantId","title"]}', 'medium', true, 114),
('get_training_compliance',    'Get Training Compliance',    'امتثال التدريب',              'Get training compliance snapshot',                      'الحصول على لقطة امتثال التدريب',                   'A12', 'training', 'training', 'training', 'training.getTrainingComplianceSnapshot',  'trainingService',  '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 115)
ON CONFLICT (tool_name) DO NOTHING;

-- A06 extra: Incident tools
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, approval_mode, is_system, sort_order) VALUES
('report_incident',  'Report Incident',   'الإبلاغ عن حادث',    'Report a new security incident',                         'الإبلاغ عن حادث أمني جديد',                        'A06', 'incident', 'incident', 'incident', 'incident.reportIncident',       'incidentService', '{"type":"object","properties":{"tenantId":{"type":"string"},"title":{"type":"string"},"severity":{"type":"string"}},"required":["tenantId","title"]}', 'high', 'single', true, 55),
('list_incidents',   'List Incidents',    'قائمة الحوادث',       'List all security incidents',                            'قائمة جميع الحوادث الأمنية',                       'A06', 'incident', 'incident', 'incident', 'incident.getIncidents',         'incidentService', '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', 'none', true, 56),
('investigate_incident','Investigate Incident','التحقيق في حادث','Investigate and update incident findings',                'التحقيق في نتائج الحادث وتحديثها',                 'A06', 'incident', 'incident', 'incident', 'incident.investigateIncident',   'incidentService', '{"type":"object","properties":{"tenantId":{"type":"string"},"incidentId":{"type":"string"}},"required":["tenantId","incidentId"]}', 'high', 'single', true, 57)
ON CONFLICT (tool_name) DO NOTHING;

-- Workflow tools (workflow module)
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('list_workflow_instances',  'List Workflow Instances',   'قائمة مثيلات سير العمل',    'List active workflow instances',                        'قائمة مثيلات سير العمل النشطة',               'A08', 'workflow', 'workflow', 'workflow', 'workflow.getInstances',       'workflowService', '{"type":"object","properties":{"tenantId":{"type":"string"}},"required":["tenantId"]}', 'low', true, 130),
('advance_workflow_step',    'Advance Workflow Step',     'تقدم خطوة سير العمل',       'Advance a workflow to the next step',                   'تقدم سير العمل إلى الخطوة التالية',           'A08', 'workflow', 'workflow', 'workflow', 'workflow.advanceInstance',    'workflowService', '{"type":"object","properties":{"tenantId":{"type":"string"},"instanceId":{"type":"string"}},"required":["tenantId","instanceId"]}', 'medium', true, 131)
ON CONFLICT (tool_name) DO NOTHING;

-- Mapping tools
INSERT INTO public.mcp_tool_registry (tool_name, display_name_en, display_name_ar, description_en, description_ar, agent_id, owner_module_code, domain_code, category, handler_key, provider_key, input_schema, risk_level, is_system, sort_order) VALUES
('get_entity_relationships', 'Get Entity Relationships',  'علاقات الكيان',             'Get cross-module entity relationships and mappings',    'الحصول على العلاقات والربط بين الكيانات عبر الوحدات', 'A03', 'compliance', 'compliance', 'mapping', 'mapping.getRelationships', 'mappingService', '{"type":"object","properties":{"tenantId":{"type":"string"},"objectId":{"type":"string"},"objectType":{"type":"string"}},"required":["tenantId","objectId","objectType"]}', 'low', true, 140)
ON CONFLICT (tool_name) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- SEED: Prompt Registry — core prompts per agent
-- ══════════════════════════════════════════════════════════════════════════
INSERT INTO public.mcp_prompt_registry (prompt_name, display_name_en, display_name_ar, description_en, description_ar, owner_module_code, agent_id, domain_code, category, prompt_template, output_mode, is_system, sort_order) VALUES
('classify_intent',       'Classify User Intent',       'تصنيف نية المستخدم',       'Classify user query to the best matching agent and tool',  'تصنيف استعلام المستخدم لأفضل وكيل وأداة مطابقة',  'ai',         NULL,  'ai',         'classification', 'Given a user query about GRC, classify it to the best agent (A01-A12) and tool. Respond with JSON: {"agentId":"...","toolName":"..."}', 'json', true, 1),
('risk_assessment',       'Risk Assessment Prompt',     'موجه تقييم المخاطر',        'Guide AI through structured risk assessment',              'توجيه الذكاء الاصطناعي خلال تقييم المخاطر المنظم',  'risk',       'A07', 'risk',       'assessment',     'Analyze the following risk data and provide: 1) Risk score (1-25), 2) Likelihood rationale, 3) Impact analysis, 4) Recommended treatment. Data: {{input}}', 'json', true, 2),
('policy_review',         'Policy Review Prompt',       'موجه مراجعة السياسات',      'Review policy for completeness and compliance',            'مراجعة السياسة للاكتمال والامتثال',                  'policy',     'A08', 'policy',     'review',         'Review the following policy document for: 1) Completeness against {{framework}}, 2) Regulatory alignment, 3) Implementation gaps, 4) Recommended updates. Policy: {{input}}', 'json', true, 3),
('evidence_analysis',     'Evidence Analysis Prompt',   'موجه تحليل الأدلة',         'Analyze evidence for sufficiency and validity',            'تحليل الأدلة للكفاية والصلاحية',                     'evidence',   'A05', 'evidence',   'analysis',       'Analyze the following evidence artifacts for control {{controlId}}: 1) Sufficiency rating, 2) Validity assessment, 3) Gap identification, 4) Collection recommendations. Evidence: {{input}}', 'json', true, 4),
('gap_remediation',       'Gap Remediation Prompt',     'موجه معالجة الفجوات',       'Generate remediation plan for compliance gaps',            'إنشاء خطة معالجة لفجوات الامتثال',                   'compliance', 'A06', 'remediation', 'planning',      'Given compliance gaps for framework {{frameworkId}}: 1) Prioritize by risk, 2) Suggest remediation actions, 3) Estimate effort, 4) Create timeline. Gaps: {{input}}', 'json', true, 5),
('vendor_risk_assessment','Vendor Risk Assessment',     'موجه تقييم مخاطر المورد',   'Assess vendor risk profile and compliance',                'تقييم ملف مخاطر المورد والامتثال',                   'vendor',     'A09', 'vendor',     'assessment',     'Assess vendor {{vendorId}} for: 1) Security posture, 2) Compliance status, 3) Supply chain risk, 4) SLA adherence, 5) Recommendations. Data: {{input}}', 'json', true, 6),
('audit_summary',         'Audit Summary Prompt',       'موجه ملخص التدقيق',         'Generate audit summary from findings',                     'إنشاء ملخص تدقيق من النتائج',                        'audit',      'A10', 'audit',      'summary',        'Summarize the following audit findings into: 1) Executive summary, 2) Key findings, 3) Risk areas, 4) Recommendations, 5) Compliance score. Findings: {{input}}', 'json', true, 7),
('bcp_readiness',         'BCP Readiness Prompt',       'موجه جاهزية الاستمرارية',   'Assess BCP readiness and identify gaps',                   'تقييم جاهزية استمرارية الأعمال وتحديد الفجوات',      'bcp',        'A11', 'bcp',        'assessment',     'Assess BCP readiness: 1) RTO/RPO alignment, 2) DR test coverage, 3) Recovery procedure completeness, 4) Gap identification, 5) Improvement recommendations. Data: {{input}}', 'json', true, 8)
ON CONFLICT (prompt_name) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- SEED: Resource Registry — GRC data resources the model can read
-- ══════════════════════════════════════════════════════════════════════════
INSERT INTO public.mcp_resource_registry (resource_name, display_name_en, display_name_ar, description_en, description_ar, uri_pattern, owner_module_code, domain_code, category, resolver_key, sensitivity_level, is_system, sort_order) VALUES
('risk_register',        'Risk Register',             'سجل المخاطر',            'Current risk register with all entries',                  'سجل المخاطر الحالي مع جميع الإدخالات',         'grc://risk/register',           'risk',        'risk',       'data',     'risk.getRisks',                    'elevated', true, 1),
('compliance_status',    'Compliance Status',         'حالة الامتثال',           'Compliance status across all adopted frameworks',         'حالة الامتثال عبر جميع الأطر المتبناة',        'grc://compliance/status',       'compliance',  'compliance', 'data',     'compliance.getGapAnalysis',        'elevated', true, 2),
('evidence_inventory',   'Evidence Inventory',        'جرد الأدلة',             'Complete evidence inventory with freshness status',       'جرد الأدلة الكامل مع حالة الحداثة',            'grc://evidence/inventory',      'evidence',    'evidence',   'data',     'evidence.getAllEvidence',           'elevated', true, 3),
('policy_catalog',       'Policy Catalog',            'كتالوج السياسات',        'All policies with lifecycle status',                      'جميع السياسات مع حالة دورة الحياة',            'grc://governance/policies',     'governance',  'policy',     'data',     'governance.getPolicies',           'normal',   true, 4),
('vendor_portfolio',     'Vendor Portfolio',          'محفظة الموردين',         'Vendor portfolio with risk assessments',                  'محفظة الموردين مع تقييمات المخاطر',             'grc://vendor/portfolio',        'vendor',      'vendor',     'data',     'vendor.getVendors',                'elevated', true, 5),
('audit_trail',          'Audit Trail',               'مسار التدقيق',           'System audit trail and activity log',                     'مسار التدقيق وسجل النشاط',                      'grc://audit/trail',             'audit',       'audit',      'data',     'audit.queryAuditTrail',            'high',     true, 6),
('bcp_plans',            'BCP Plans',                 'خطط الاستمرارية',        'Business continuity and disaster recovery plans',         'خطط استمرارية الأعمال والتعافي من الكوارث',     'grc://bcp/plans',               'bcp',         'bcp',        'data',     'bcp.getBCPPlans',                  'elevated', true, 7),
('training_status',      'Training Status',           'حالة التدريب',           'Training compliance and assignment status',               'حالة امتثال التدريب والتعيينات',                'grc://training/status',         'training',    'training',   'data',     'training.getTrainingComplianceSnapshot', 'normal', true, 8),
('incident_log',         'Incident Log',              'سجل الحوادث',            'Security incident log and investigation status',          'سجل الحوادث الأمنية وحالة التحقيق',             'grc://incident/log',            'incident',    'incident',   'data',     'incident.getIncidents',            'high',     true, 9),
('executive_dashboard',  'Executive Dashboard',       'لوحة القيادة التنفيذية', 'Executive GRC dashboard data',                            'بيانات لوحة القيادة التنفيذية للحوكمة والمخاطر والامتثال', 'grc://reporting/dashboard', 'reporting', 'reporting', 'dashboard', 'report.generateExecutiveSnapshot', 'normal',   true, 10)
ON CONFLICT (resource_name) DO NOTHING;
