-- §7.3 Module Registry — canonical module registration surface
CREATE TABLE IF NOT EXISTS module_registry (
  module_code    VARCHAR(50)  PRIMARY KEY,
  module_name_en VARCHAR(120) NOT NULL,
  module_name_ar VARCHAR(120),
  purpose        TEXT,
  owner_team     VARCHAR(100),
  product_key    VARCHAR(50)  DEFAULT 'agrc',
  dependencies   JSONB        DEFAULT '[]',
  inputs         JSONB        DEFAULT '[]',
  outputs        JSONB        DEFAULT '[]',
  events_consumed JSONB       DEFAULT '[]',
  events_emitted  JSONB       DEFAULT '[]',
  health_status  VARCHAR(20)  DEFAULT 'unknown' CHECK (health_status IN ('healthy','degraded','unhealthy','unknown')),
  health_checked_at TIMESTAMPTZ,
  lifecycle_state VARCHAR(30) DEFAULT 'provisioned' CHECK (lifecycle_state IN ('provisioned','active','degraded','suspended','decommissioned')),
  ai_enabled     BOOLEAN      DEFAULT false,
  is_extractable BOOLEAN      DEFAULT true,
  metadata       JSONB        DEFAULT '{}',
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- §7.3 Audit Registry — per-module audit configuration
CREATE TABLE IF NOT EXISTS module_audit_config (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code    VARCHAR(50)  NOT NULL REFERENCES module_registry(module_code),
  audit_level    VARCHAR(20)  DEFAULT 'standard' CHECK (audit_level IN ('minimal','standard','full','forensic')),
  auditable_entities  JSONB   DEFAULT '[]',
  retention_days      INTEGER DEFAULT 365,
  require_hash_chain  BOOLEAN DEFAULT false,
  require_attribution BOOLEAN DEFAULT true,
  pii_fields          JSONB   DEFAULT '[]',
  export_formats      JSONB   DEFAULT '["json","csv"]',
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(module_code)
);

-- §7.6 AI Capability Registry — per-module AI boundaries
CREATE TABLE IF NOT EXISTS ai_capability_registry (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code    VARCHAR(50)  NOT NULL REFERENCES module_registry(module_code),
  agent_roles    JSONB        DEFAULT '[]',
  allowed_tools  JSONB        DEFAULT '[]',
  allowed_output_types JSONB  DEFAULT '["draft","recommendation","analysis"]',
  memory_scope   VARCHAR(30)  DEFAULT 'workspace' CHECK (memory_scope IN ('session','workflow','workspace','product','platform')),
  approval_boundaries JSONB   DEFAULT '{}',
  escalation_policy   JSONB   DEFAULT '{}',
  max_autonomy_level  VARCHAR(20) DEFAULT 'hybrid' CHECK (max_autonomy_level IN ('human_only','hybrid_shadow','hybrid_active','autonomous')),
  tenant_constraints  JSONB   DEFAULT '{}',
  product_constraints JSONB   DEFAULT '{}',
  audit_requirements  JSONB   DEFAULT '{"log_all_decisions": true, "log_tool_use": true}',
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(module_code)
);

-- §7.3 Module health check results
CREATE TABLE IF NOT EXISTS module_health_checks (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code    VARCHAR(50)  NOT NULL,
  check_type     VARCHAR(30)  NOT NULL CHECK (check_type IN ('db','api','dependency','permissions','lifecycle','ai','full')),
  status         VARCHAR(20)  NOT NULL CHECK (status IN ('healthy','degraded','unhealthy','unknown')),
  response_ms    INTEGER,
  details        JSONB        DEFAULT '{}',
  checked_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_health_checks_module ON module_health_checks(module_code, checked_at DESC);

-- §A.7 Workflow mode declarations
ALTER TABLE module_workflow_registry
  ADD COLUMN IF NOT EXISTS supported_operating_modes JSONB DEFAULT '["human_only","hybrid_active"]',
  ADD COLUMN IF NOT EXISTS default_operating_mode VARCHAR(30) DEFAULT 'hybrid_active',
  ADD COLUMN IF NOT EXISTS upgrade_conditions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS downgrade_conditions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approval_per_mode JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tools_per_mode JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS memory_scope_per_mode JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audit_level_per_mode JSONB DEFAULT '{"human_only":"standard","hybrid_active":"full","autonomous":"forensic"}',
  ADD COLUMN IF NOT EXISTS failure_handling JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rollback_path TEXT,
  ADD COLUMN IF NOT EXISTS closure_conditions JSONB DEFAULT '{}';

-- §7.3 Entitlement mapping per module
CREATE TABLE IF NOT EXISTS module_entitlement_map (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL,
  module_code    VARCHAR(50)  NOT NULL,
  entitled       BOOLEAN      DEFAULT true,
  tier           VARCHAR(30)  DEFAULT 'standard',
  feature_flags  JSONB        DEFAULT '{}',
  max_users      INTEGER,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);

-- Seed module_registry with canonical modules
INSERT INTO module_registry (module_code, module_name_en, module_name_ar, purpose, ai_enabled) VALUES
  ('foundation',   'Foundation',        'الأساسيات',           'Core organizational structure, departments, teams, business units', false),
  ('governance',   'Governance',        'الحوكمة',             'Governance policies, committees, initiatives, milestones', true),
  ('risk',         'Risk Management',   'إدارة المخاطر',      'Risk identification, assessment, treatment, monitoring', true),
  ('compliance',   'Compliance',        'الامتثال',            'Regulatory compliance, frameworks, controls, assessments', true),
  ('evidence',     'Evidence',          'الأدلة',              'Evidence collection, validation, linking to controls', true),
  ('audit',        'Audit',             'التدقيق',             'Internal audit planning, execution, findings, reports', true),
  ('workflow',     'Workflow',          'سير العمل',           'Workflow engine, approvals, task management, SLAs', false),
  ('analytics',    'Analytics',         'التحليلات',           'Dashboards, KPIs, reporting, trend analysis', true),
  ('reports',      'Reports',           'التقارير',            'Report generation, scheduling, distribution', false),
  ('ai',           'AI Services',       'خدمات الذكاء الاصطناعي', 'AI agents, decisions, recommendations, NLQ', true),
  ('integrations', 'Integrations',      'التكاملات',           'External system connectors, data sync, APIs', false),
  ('ai-governance','AI Governance',     'حوكمة الذكاء الاصطناعي', 'AI model risk, agent performance, bias detection', true),
  ('qiyas',        'Qiyas',            'قياس',                'Governance measurement, maturity scoring, benchmarking', true)
ON CONFLICT (module_code) DO UPDATE SET
  module_name_en = EXCLUDED.module_name_en,
  module_name_ar = EXCLUDED.module_name_ar,
  purpose = EXCLUDED.purpose,
  ai_enabled = EXCLUDED.ai_enabled,
  updated_at = NOW();

-- Seed module_audit_config for all modules
INSERT INTO module_audit_config (module_code, audit_level, require_hash_chain, require_attribution) VALUES
  ('foundation',    'standard', false, true),
  ('governance',    'full',     true,  true),
  ('risk',          'full',     true,  true),
  ('compliance',    'full',     true,  true),
  ('evidence',      'forensic', true,  true),
  ('audit',         'forensic', true,  true),
  ('workflow',      'full',     true,  true),
  ('analytics',     'standard', false, true),
  ('reports',       'standard', false, true),
  ('ai',            'full',     true,  true),
  ('integrations',  'standard', false, true),
  ('ai-governance', 'full',     true,  true),
  ('qiyas',         'full',     true,  true)
ON CONFLICT (module_code) DO NOTHING;

-- Seed ai_capability_registry for AI-enabled modules
INSERT INTO ai_capability_registry (module_code, agent_roles, allowed_tools, max_autonomy_level, memory_scope) VALUES
  ('governance',    '["governance_advisor","committee_coordinator"]', '["draft","summarize","recommend","schedule"]', 'hybrid_active', 'workspace'),
  ('risk',          '["risk_analyst","risk_advisor"]', '["assess","score","recommend","draft","summarize"]', 'hybrid_active', 'workspace'),
  ('compliance',    '["compliance_checker","evidence_validator"]', '["check","validate","map","draft","summarize"]', 'hybrid_active', 'workspace'),
  ('evidence',      '["evidence_collector","evidence_validator"]', '["collect","validate","classify","link"]', 'hybrid_active', 'workspace'),
  ('audit',         '["audit_planner","finding_analyst"]', '["plan","analyze","draft","summarize","recommend"]', 'hybrid_shadow', 'workspace'),
  ('ai',            '["meta_agent","orchestrator"]', '["route","coordinate","decide","recommend"]', 'autonomous', 'workspace'),
  ('ai-governance', '["model_risk_assessor","bias_detector"]', '["assess","detect","score","recommend"]', 'hybrid_active', 'workspace'),
  ('qiyas',         '["maturity_scorer","benchmark_analyst"]', '["score","benchmark","recommend","trend"]', 'hybrid_active', 'workspace')
ON CONFLICT (module_code) DO NOTHING;
