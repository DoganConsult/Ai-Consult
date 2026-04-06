-- ============================================
-- Migration 017: AGRC-OS UI config, drawer, dashboards
-- Tables: workspace_profile, widget_registry, dashboard_layouts, drawer_templates
-- ALTER action_items: priority, type
-- Seeds: role_profiles (7), widget_registry (20), dashboard_layouts (6), drawer_templates (6)
-- ============================================
-- Expects tenant schema to be set (e.g. search_path) when run per-tenant.

-- ── Ensure action_items exists before altering (created by migration 017 or database.ts) ──
CREATE TABLE IF NOT EXISTS action_items (
    item_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    source_type      VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_id        VARCHAR(100) NOT NULL DEFAULT '',
    assigned_to      VARCHAR(64) NOT NULL DEFAULT '',
    deadline         DATE,
    reminder_schedule JSONB DEFAULT '[1, 3, 7]',
    status           VARCHAR(30) DEFAULT 'pending',
    escalated_to     VARCHAR(64),
    priority         INT NOT NULL DEFAULT 5,
    type             VARCHAR(50) DEFAULT 'task',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Extend action_items (idempotent) ──────────────────────────────────────
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 5;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'task';

-- ── workspace_profile (one row per tenant) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_profile (
  tenant_id VARCHAR(64) PRIMARY KEY,
  industry VARCHAR(100) NOT NULL DEFAULT 'other',
  org_size VARCHAR(50) NOT NULL DEFAULT '1-50',
  sectors JSONB DEFAULT '[]',
  default_dashboard VARCHAR(100) NOT NULL DEFAULT 'big_picture',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── widget_registry (reference catalog per tenant schema) ───────────────────
CREATE TABLE IF NOT EXISTS widget_registry (
  widget_key VARCHAR(80) PRIMARY KEY,
  label_en VARCHAR(200) NOT NULL,
  label_ar VARCHAR(200),
  category VARCHAR(50) NOT NULL DEFAULT 'overview',
  default_width INT NOT NULL DEFAULT 2,
  default_height INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── dashboard_layouts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  layout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code VARCHAR(80) NOT NULL UNIQUE,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  layout JSONB NOT NULL DEFAULT '{"widgets":[]}',
  audience VARCHAR(80) NOT NULL DEFAULT 'all',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_audience ON dashboard_layouts(audience);

-- ── drawer_templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drawer_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(80) NOT NULL UNIQUE,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  zones JSONB NOT NULL DEFAULT '[]',
  context_type VARCHAR(80) NOT NULL DEFAULT 'entity',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drawer_templates_context ON drawer_templates(context_type);

-- ── Seed role_profiles (7) ──────────────────────────────────────────────────
INSERT INTO role_profiles (role, modules, dashboard_widgets, default_landing_page, custom, updated_at)
VALUES
  ('owner', '["*"]', '["risk_heatmap","compliance_score","executive_summary","audit_readiness"]', '/dashboard', false, NOW()),
  ('admin', '["governance","risk","compliance","evidence","reports","assessment","workflow","ai"]', '["risk_heatmap","compliance_score","control_progress","evidence_locker","audit_readiness","executive_summary"]', '/dashboard', false, NOW()),
  ('compliance_officer', '["governance","compliance","evidence","reports","assessment","workflow"]', '["compliance_score","framework_coverage","control_progress","evidence_locker","audit_readiness"]', '/dashboard', false, NOW()),
  ('risk_manager', '["risk","compliance","evidence","reports","assessment","workflow"]', '["risk_heatmap","risk_summary","compliance_score","control_progress","vendor_risk"]', '/dashboard', false, NOW()),
  ('auditor', '["governance","risk","compliance","evidence","reports","assessment"]', '["audit_readiness","evidence_locker","compliance_score","risk_heatmap"]', '/dashboard', false, NOW()),
  ('viewer', '["governance","risk","compliance","evidence","reports"]', '["compliance_score","risk_heatmap","executive_summary"]', '/dashboard', false, NOW()),
  ('it_security', '["risk","compliance","evidence","workflow"]', '["risk_heatmap","control_progress","incident_tracker","evidence_locker"]', '/dashboard', false, NOW())
ON CONFLICT (role) DO UPDATE SET
  modules = EXCLUDED.modules,
  dashboard_widgets = EXCLUDED.dashboard_widgets,
  default_landing_page = EXCLUDED.default_landing_page,
  updated_at = NOW();

-- ── Seed widget_registry (20) ───────────────────────────────────────────────
INSERT INTO widget_registry (widget_key, label_en, label_ar, category, default_width, default_height, sort_order)
VALUES
  ('risk_heatmap', 'Risk Heatmap', 'خريطة المخاطر الحرارية', 'risk', 2, 1, 1),
  ('compliance_score', 'Compliance Score', 'نسبة الامتثال', 'compliance', 1, 1, 2),
  ('compliance_overview', 'Compliance Overview', 'نظرة عامة على الامتثال', 'compliance', 2, 1, 3),
  ('executive_summary', 'Executive Summary', 'ملخص تنفيذي', 'overview', 2, 1, 4),
  ('audit_readiness', 'Audit Readiness', 'جاهزية التدقيق', 'evidence', 1, 1, 5),
  ('control_progress', 'Control Progress', 'تقدم الضوابط', 'compliance', 2, 1, 6),
  ('evidence_locker', 'Evidence Locker', 'خزنة الأدلة', 'evidence', 1, 1, 7),
  ('framework_coverage', 'Framework Coverage', 'تغطية الأطر', 'compliance', 2, 1, 8),
  ('risk_summary', 'Risk Summary', 'ملخص المخاطر', 'risk', 1, 1, 9),
  ('vendor_risk', 'Vendor Risk Snapshot', 'مخاطر الموردين', 'risk', 1, 1, 10),
  ('incident_tracker', 'Incident Tracker', 'متتبع الحوادث', 'security', 1, 1, 11),
  ('policy_scorecard', 'Policy Scorecard', 'بطاقة السياسات', 'compliance', 1, 1, 12),
  ('compliance_trend', 'Compliance Trend', 'اتجاه الامتثال', 'compliance', 2, 1, 13),
  ('risk_distribution', 'Risk Distribution', 'توزيع المخاطر', 'risk', 1, 1, 14),
  ('framework_radar', 'Framework Radar', 'رادار الأطر', 'compliance', 2, 1, 15),
  ('maturity_gauge', 'Maturity Gauge', 'مقياس النضج', 'overview', 1, 1, 16),
  ('evidence_freshness', 'Evidence Freshness', 'حداثة الأدلة', 'evidence', 1, 1, 17),
  ('assessment_progress', 'Assessment Progress', 'تقدم التقييم', 'assessment', 1, 1, 18),
  ('top_risks', 'Top Risks', 'أهم المخاطر', 'risk', 1, 1, 19),
  ('ai_summary', 'AI Summary', 'ملخص الذكاء الاصطناعي', 'ai', 2, 1, 20)
ON CONFLICT (widget_key) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  category = EXCLUDED.category,
  default_width = EXCLUDED.default_width,
  default_height = EXCLUDED.default_height,
  sort_order = EXCLUDED.sort_order;

-- ── Seed dashboard_layouts (6) ───────────────────────────────────────────────
INSERT INTO dashboard_layouts (dashboard_code, name_en, name_ar, layout, audience, sort_order, updated_at)
VALUES
  ('big_picture', 'Big Picture', 'الصورة الكبيرة', '{"widgets":[{"id":"executive_summary","x":0,"y":0,"w":2,"h":1},{"id":"compliance_score","x":2,"y":0,"w":1,"h":1},{"id":"risk_heatmap","x":0,"y":1,"w":2,"h":1},{"id":"audit_readiness","x":2,"y":1,"w":1,"h":1}]}', 'all', 1, NOW()),
  ('executive', 'Executive', 'تنفيذي', '{"widgets":[{"id":"executive_summary","x":0,"y":0,"w":2,"h":1},{"id":"compliance_score","x":2,"y":0,"w":1,"h":1},{"id":"risk_heatmap","x":0,"y":1,"w":2,"h":1},{"id":"maturity_gauge","x":2,"y":1,"w":1,"h":1}]}', 'executive', 2, NOW()),
  ('compliance_ops', 'Compliance Operations', 'عمليات الامتثال', '{"widgets":[{"id":"compliance_overview","x":0,"y":0,"w":2,"h":1},{"id":"framework_coverage","x":0,"y":1,"w":2,"h":1},{"id":"control_progress","x":0,"y":2,"w":2,"h":1},{"id":"evidence_locker","x":2,"y":0,"w":1,"h":1},{"id":"audit_readiness","x":2,"y":1,"w":1,"h":1}]}', 'compliance', 3, NOW()),
  ('risk_ops', 'Risk Operations', 'عمليات المخاطر', '{"widgets":[{"id":"risk_heatmap","x":0,"y":0,"w":2,"h":1},{"id":"risk_summary","x":2,"y":0,"w":1,"h":1},{"id":"top_risks","x":0,"y":1,"w":1,"h":1},{"id":"vendor_risk","x":1,"y":1,"w":1,"h":1},{"id":"compliance_score","x":2,"y":1,"w":1,"h":1}]}', 'risk', 4, NOW()),
  ('evidence_ops', 'Evidence Operations', 'عمليات الأدلة', '{"widgets":[{"id":"evidence_locker","x":0,"y":0,"w":1,"h":1},{"id":"evidence_freshness","x":1,"y":0,"w":1,"h":1},{"id":"audit_readiness","x":2,"y":0,"w":1,"h":1},{"id":"control_progress","x":0,"y":1,"w":2,"h":1}]}', 'evidence', 5, NOW()),
  ('audit_ops', 'Audit Operations', 'عمليات التدقيق', '{"widgets":[{"id":"audit_readiness","x":0,"y":0,"w":1,"h":1},{"id":"evidence_locker","x":1,"y":0,"w":1,"h":1},{"id":"compliance_overview","x":0,"y":1,"w":2,"h":1},{"id":"assessment_progress","x":2,"y":0,"w":1,"h":1}]}', 'auditor', 6, NOW())
ON CONFLICT (dashboard_code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  layout = EXCLUDED.layout,
  audience = EXCLUDED.audience,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ── Seed drawer_templates (6) ───────────────────────────────────────────────
INSERT INTO drawer_templates (template_key, name_en, name_ar, zones, context_type, sort_order, updated_at)
VALUES
  ('entity_detail', 'Entity Detail', 'تفاصيل الكيان', '[{"id":"header","title_en":"Details","title_ar":"التفاصيل"},{"id":"actions","title_en":"Actions","title_ar":"الإجراءات"},{"id":"timeline","title_en":"Timeline","title_ar":"الجدول الزمني"},{"id":"related","title_en":"Related","title_ar":"مرتبط"}]', 'entity', 1, NOW()),
  ('risk_detail', 'Risk Detail', 'تفاصيل المخاطر', '[{"id":"header","title_en":"Risk","title_ar":"المخاطر"},{"id":"treatment","title_en":"Treatment","title_ar":"المعالجة"},{"id":"controls","title_en":"Controls","title_ar":"الضوابط"},{"id":"timeline","title_en":"History","title_ar":"السجل"}]', 'risk', 2, NOW()),
  ('control_detail', 'Control Detail', 'تفاصيل الضابط', '[{"id":"header","title_en":"Control","title_ar":"الضابط"},{"id":"evidence","title_en":"Evidence","title_ar":"الأدلة"},{"id":"tests","title_en":"Tests","title_ar":"الاختبارات"},{"id":"timeline","title_en":"History","title_ar":"السجل"}]', 'control', 3, NOW()),
  ('policy_detail', 'Policy Detail', 'تفاصيل السياسة', '[{"id":"header","title_en":"Policy","title_ar":"السياسة"},{"id":"approvals","title_en":"Approvals","title_ar":"الموافقات"},{"id":"related","title_en":"Related","title_ar":"مرتبط"}]', 'policy', 4, NOW()),
  ('assessment_detail', 'Assessment Detail', 'تفاصيل التقييم', '[{"id":"header","title_en":"Assessment","title_ar":"التقييم"},{"id":"progress","title_en":"Progress","title_ar":"التقدم"},{"id":"findings","title_en":"Findings","title_ar":"النتائج"}]', 'assessment', 5, NOW()),
  ('evidence_detail', 'Evidence Detail', 'تفاصيل الدليل', '[{"id":"header","title_en":"Evidence","title_ar":"الدليل"},{"id":"custody","title_en":"Custody","title_ar":"العهدة"},{"id":"linked_controls","title_en":"Linked Controls","title_ar":"الضوابط المرتبطة"}]', 'evidence', 6, NOW())
ON CONFLICT (template_key) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  zones = EXCLUDED.zones,
  context_type = EXCLUDED.context_type,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
