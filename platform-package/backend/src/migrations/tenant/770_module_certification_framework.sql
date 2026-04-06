-- Wave 2: Module Certification Framework
-- Adds certification gates, dependency graph, pack catalog, SLA tracking, and preflight runs.

-- ── Module Certifications ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_certifications (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL UNIQUE,
  certification_state VARCHAR(32) NOT NULL DEFAULT 'INTERNAL_BETA'
    CHECK (certification_state IN ('CERTIFIED_A_PLUS_PLUS', 'INTERNAL_BETA', 'HIDDEN', 'DISABLED', 'DEPRECATED')),
  certified_at    TIMESTAMPTZ,
  certified_by    VARCHAR(128),
  gate_results    JSONB NOT NULL DEFAULT '{}',
  gates_passed    INT NOT NULL DEFAULT 0,
  gates_total     INT NOT NULL DEFAULT 16,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_certifications_state ON module_certifications (certification_state);

-- ── Module Dependency Graph ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_dependency_graph (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  depends_on      VARCHAR(64) NOT NULL,
  dependency_type VARCHAR(32) NOT NULL DEFAULT 'required'
    CHECK (dependency_type IN ('required', 'recommended', 'optional')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, depends_on)
);

CREATE INDEX IF NOT EXISTS idx_module_dep_graph_code ON module_dependency_graph (module_code);

-- ── Module Entity Links ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_entity_links (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  entity_table    VARCHAR(128) NOT NULL,
  entity_role     VARCHAR(32) NOT NULL DEFAULT 'core'
    CHECK (entity_role IN ('core', 'config', 'workflow', 'linkage', 'observability')),
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, entity_table)
);

-- ── Module SLA Tracking ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_sla_tracking (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  sla_type        VARCHAR(64) NOT NULL,
  threshold_hours INT NOT NULL,
  breach_count    INT NOT NULL DEFAULT 0,
  last_breach_at  TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, sla_type)
);

-- ── Module Preflight Runs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_preflight_runs (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  run_type        VARCHAR(32) NOT NULL DEFAULT 'activation'
    CHECK (run_type IN ('activation', 'certification', 'health_check')),
  gates_checked   INT NOT NULL DEFAULT 0,
  gates_passed    INT NOT NULL DEFAULT 0,
  gate_details    JSONB NOT NULL DEFAULT '[]',
  overall_result  VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (overall_result IN ('passed', 'failed', 'partial', 'pending')),
  run_by          VARCHAR(128),
  run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preflight_runs_module ON module_preflight_runs (module_code, run_at DESC);

-- ── Module Inbound Event Registry ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_inbound_events (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  event_name      VARCHAR(128) NOT NULL,
  source_module   VARCHAR(64) NOT NULL,
  handler_action  VARCHAR(128),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, event_name, source_module)
);

-- ── Product Packs (Pack Selection) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_products (
  id              SERIAL PRIMARY KEY,
  pack_code       VARCHAR(64) NOT NULL UNIQUE,
  pack_name_en    VARCHAR(255) NOT NULL,
  pack_name_ar    VARCHAR(255) NOT NULL,
  description_en  TEXT,
  description_ar  TEXT,
  target_audience_en TEXT,
  target_audience_ar TEXT,
  badge_en        VARCHAR(128),
  badge_ar        VARCHAR(128),
  icon_class      VARCHAR(64),
  sort_order      INT NOT NULL DEFAULT 0,
  estimated_setup_minutes INT DEFAULT 15,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_modules (
  id              SERIAL PRIMARY KEY,
  pack_code       VARCHAR(64) NOT NULL REFERENCES platform_products(pack_code),
  module_code     VARCHAR(64) NOT NULL,
  is_core         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  UNIQUE (pack_code, module_code)
);

CREATE TABLE IF NOT EXISTS tenant_module_entitlements (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  pack_code       VARCHAR(64),
  entitlement_source VARCHAR(32) NOT NULL DEFAULT 'pack'
    CHECK (entitlement_source IN ('pack', 'manual', 'trial', 'inference')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code)
);

-- ── Seed default packs ───────────────────────────────────────────────────
INSERT INTO platform_products (pack_code, pack_name_en, pack_name_ar, description_en, description_ar, target_audience_en, target_audience_ar, badge_en, badge_ar, icon_class, sort_order, estimated_setup_minutes)
VALUES
  ('governance_starter', 'Governance Starter', 'بداية الحوكمة', 'Essential governance, strategy, team management, workflow automation, and records management.', 'الحوكمة الأساسية والإستراتيجية وإدارة الفرق وأتمتة سير العمل.', 'Organizations starting their governance journey', 'المؤسسات التي تبدأ رحلة الحوكمة', 'Good Starting Point', 'نقطة بداية جيدة', 'pi-flag', 1, 10),
  ('core_grc', 'Core GRC', 'الحوكمة والمخاطر والامتثال الأساسي', 'Compliance frameworks, risk management, policy lifecycle, controls library, evidence collection, and issue tracking.', 'أُطر الامتثال وإدارة المخاطر ودورة حياة السياسات ومكتبة الضوابط وجمع الأدلة.', 'Compliance and risk teams in regulated industries', 'فرق الامتثال والمخاطر في القطاعات المنظمة', 'Best for Saudi Compliance', 'الأفضل للامتثال السعودي', 'pi-shield', 2, 15),
  ('internal_audit', 'Internal Audit', 'التدقيق الداخلي', 'Audit planning, fieldwork, evidence management, issue tracking, and control testing with workpaper automation.', 'تخطيط التدقيق والعمل الميداني وإدارة الأدلة وتتبع المشاكل واختبار الضوابط.', 'Internal audit departments and audit committees', 'إدارات التدقيق الداخلي ولجان المراجعة', 'Audit-Ready', 'جاهز للتدقيق', 'pi-search', 3, 12),
  ('extended_risk', 'Extended Risk', 'المخاطر الموسعة', 'Third-party risk, incident response, business continuity, asset governance, and privacy management.', 'مخاطر الأطراف الثالثة والاستجابة للحوادث واستمرارية الأعمال وحوكمة الأصول والخصوصية.', 'Organizations with complex risk landscapes and supply chains', 'المؤسسات ذات المشاهد المعقدة للمخاطر وسلاسل التوريد', 'Enterprise-Grade', 'مستوى مؤسسي', 'pi-exclamation-triangle', 4, 20),
  ('aios', 'AI Operations System', 'نظام عمليات الذكاء الاصطناعي', 'AI governance, knowledge management, maturity analytics, and multi-agent AI operations with 17+ autonomous agents.', 'حوكمة الذكاء الاصطناعي وإدارة المعرفة وتحليلات النضج وعمليات الذكاء الاصطناعي متعدد الوكلاء.', 'AI-forward organizations and technology leaders', 'المؤسسات المتقدمة في الذكاء الاصطناعي وقادة التقنية', 'AI-Powered', 'مدعوم بالذكاء الاصطناعي', 'pi-bolt', 5, 15),
  ('full_enterprise', 'Full Enterprise', 'المؤسسة الكاملة', 'Complete AGRC operating system — all modules, all frameworks, all agents, full automation with 50+ MCP tools and 21+ temporal workers.', 'نظام التشغيل الكامل — جميع الموديولات والأُطر والوكلاء مع أتمتة كاملة.', 'Large enterprises requiring comprehensive GRC coverage', 'المؤسسات الكبيرة التي تحتاج تغطية شاملة', 'Recommended', 'موصى به', 'pi-globe', 6, 25)
ON CONFLICT (pack_code) DO NOTHING;

INSERT INTO product_modules (pack_code, module_code, is_core, sort_order)
VALUES
  ('governance_starter', 'governance', TRUE, 1), ('governance_starter', 'foundation', TRUE, 2),
  ('governance_starter', 'workflow', TRUE, 3), ('governance_starter', 'inbox', TRUE, 4),
  ('governance_starter', 'records', TRUE, 5), ('governance_starter', 'team', TRUE, 6),

  ('core_grc', 'compliance', TRUE, 1), ('core_grc', 'risk', TRUE, 2),
  ('core_grc', 'policy', TRUE, 3), ('core_grc', 'evidence', TRUE, 4),
  ('core_grc', 'issues', TRUE, 5), ('core_grc', 'action', TRUE, 6),
  ('core_grc', 'governance', TRUE, 7), ('core_grc', 'foundation', TRUE, 8),

  ('internal_audit', 'audit', TRUE, 1), ('internal_audit', 'evidence', TRUE, 2),
  ('internal_audit', 'issues', TRUE, 3), ('internal_audit', 'risk', TRUE, 4),
  ('internal_audit', 'compliance', TRUE, 5),

  ('extended_risk', 'vendor', TRUE, 1), ('extended_risk', 'incident', TRUE, 2),
  ('extended_risk', 'bcp', TRUE, 3), ('extended_risk', 'asset', TRUE, 4),
  ('extended_risk', 'privacy', TRUE, 5), ('extended_risk', 'exception', TRUE, 6),
  ('extended_risk', 'remediation', TRUE, 7),

  ('aios', 'ai-governance', TRUE, 1), ('aios', 'analytics', TRUE, 2),
  ('aios', 'qiyas', TRUE, 3), ('aios', 'ai', TRUE, 4),

  ('full_enterprise', 'risk', TRUE, 1), ('full_enterprise', 'compliance', TRUE, 2),
  ('full_enterprise', 'policy', TRUE, 3), ('full_enterprise', 'evidence', TRUE, 4),
  ('full_enterprise', 'audit', TRUE, 5), ('full_enterprise', 'governance', TRUE, 6),
  ('full_enterprise', 'foundation', TRUE, 7), ('full_enterprise', 'reporting', TRUE, 8),
  ('full_enterprise', 'incident', TRUE, 9), ('full_enterprise', 'vendor', TRUE, 10),
  ('full_enterprise', 'bcp', TRUE, 11), ('full_enterprise', 'asset', TRUE, 12),
  ('full_enterprise', 'exception', TRUE, 13), ('full_enterprise', 'remediation', TRUE, 14),
  ('full_enterprise', 'action', TRUE, 15), ('full_enterprise', 'training', TRUE, 16),
  ('full_enterprise', 'ai-governance', TRUE, 17), ('full_enterprise', 'privacy', TRUE, 18),
  ('full_enterprise', 'qiyas', TRUE, 19), ('full_enterprise', 'integrations', TRUE, 20)
ON CONFLICT (pack_code, module_code) DO NOTHING;

-- ── Seed module dependency graph ─────────────────────────────────────────
INSERT INTO module_dependency_graph (module_code, depends_on, dependency_type)
VALUES
  ('compliance', 'foundation', 'required'),
  ('risk', 'foundation', 'required'),
  ('policy', 'foundation', 'required'),
  ('evidence', 'compliance', 'recommended'),
  ('evidence', 'audit', 'recommended'),
  ('audit', 'risk', 'recommended'),
  ('audit', 'compliance', 'recommended'),
  ('incident', 'risk', 'recommended'),
  ('vendor', 'risk', 'recommended'),
  ('bcp', 'risk', 'recommended'),
  ('bcp', 'asset', 'recommended'),
  ('asset', 'foundation', 'required'),
  ('exception', 'policy', 'recommended'),
  ('exception', 'compliance', 'recommended'),
  ('remediation', 'risk', 'recommended'),
  ('remediation', 'compliance', 'recommended'),
  ('action', 'foundation', 'required'),
  ('training', 'foundation', 'optional'),
  ('ai-governance', 'foundation', 'required'),
  ('privacy', 'compliance', 'recommended'),
  ('privacy', 'foundation', 'required'),
  ('qiyas', 'compliance', 'recommended'),
  ('integrations', 'foundation', 'required'),
  ('reporting', 'foundation', 'required'),
  ('governance', 'foundation', 'required'),
  ('issues', 'foundation', 'required'),
  ('records', 'foundation', 'required')
ON CONFLICT (module_code, depends_on) DO NOTHING;

-- ── Seed module entity links ─────────────────────────────────────────────
INSERT INTO module_entity_links (module_code, entity_table, entity_role, is_required)
VALUES
  ('risk', 'risks', 'core', TRUE),
  ('risk', 'risk_assessments', 'workflow', FALSE),
  ('compliance', 'frameworks', 'core', TRUE),
  ('compliance', 'controls', 'core', TRUE),
  ('policy', 'policies', 'core', TRUE),
  ('evidence', 'evidence_items', 'core', TRUE),
  ('evidence', 'evidence_schedules', 'config', FALSE),
  ('audit', 'audit_engagements', 'core', TRUE),
  ('audit', 'audit_plans', 'core', TRUE),
  ('foundation', 'organizations', 'core', TRUE),
  ('foundation', 'business_units', 'core', TRUE),
  ('foundation', 'departments', 'core', TRUE),
  ('governance', 'committees', 'core', TRUE),
  ('reporting', 'report_definitions', 'core', TRUE),
  ('incident', 'incidents', 'core', TRUE),
  ('vendor', 'vendors', 'core', TRUE),
  ('bcp', 'bcp_plans', 'core', TRUE),
  ('asset', 'assets', 'core', TRUE),
  ('exception', 'exceptions', 'core', TRUE),
  ('remediation', 'remediation_tasks', 'core', TRUE),
  ('action', 'action_items', 'core', TRUE),
  ('training', 'training_catalog', 'core', TRUE),
  ('training', 'training_assignments', 'core', TRUE),
  ('ai-governance', 'ai_asset_inventory', 'core', TRUE),
  ('privacy', 'ropa_entries', 'core', TRUE),
  ('privacy', 'privacy_retention_policies', 'config', TRUE),
  ('qiyas', 'qiyas_assessments', 'core', TRUE),
  ('integrations', 'integration_configs', 'core', TRUE)
ON CONFLICT (module_code, entity_table) DO NOTHING;

-- ── Seed inbound event registry ──────────────────────────────────────────
INSERT INTO module_inbound_events (module_code, event_name, source_module, handler_action)
VALUES
  ('risk', 'compliance.gap_detected', 'compliance', 'create_risk_from_gap'),
  ('risk', 'audit.finding.issued', 'audit', 'create_risk_from_finding'),
  ('risk', 'incident.escalated', 'incident', 'elevate_risk_score'),
  ('compliance', 'policy.published', 'policy', 'update_control_mapping'),
  ('compliance', 'evidence.approved', 'evidence', 'update_compliance_posture'),
  ('evidence', 'compliance.assessment_completed', 'compliance', 'trigger_evidence_review'),
  ('audit', 'risk.treatment_updated', 'risk', 'update_audit_scope'),
  ('incident', 'asset.classified', 'asset', 'update_incident_impact'),
  ('vendor', 'risk.exceeded_appetite', 'risk', 'flag_vendor_risk'),
  ('remediation', 'audit.finding.issued', 'audit', 'create_remediation_task'),
  ('remediation', 'compliance.gap_detected', 'compliance', 'create_remediation_task'),
  ('action', 'remediation.created', 'remediation', 'create_action_item'),
  ('privacy', 'incident.escalated', 'incident', 'assess_breach_notification'),
  ('exception', 'policy.expired', 'policy', 'expire_related_exceptions'),
  ('reporting', 'compliance.posture_changed', 'compliance', 'trigger_report_refresh'),
  ('integrations', 'foundation.scope_changed', 'foundation', 'reconfigure_integration_scope'),
  ('training', 'compliance.gap_detected', 'compliance', 'suggest_training_campaign'),
  ('bcp', 'incident.escalated', 'incident', 'activate_continuity_plan'),
  ('governance', 'policy.published', 'policy', 'update_governance_register'),
  ('ai-governance', 'risk.auto_scored', 'risk', 'update_ai_risk_model')
ON CONFLICT (module_code, event_name, source_module) DO NOTHING;
