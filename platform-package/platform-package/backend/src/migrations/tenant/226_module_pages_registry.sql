-- ============================================================================
-- Migration 226: Module Pages Registry
-- ============================================================================
-- Page-level registry linking every navigable page to its module, permission,
-- agent binding, and nav item. This is the canonical source for:
--   1. Which pages exist per module
--   2. What permission is required to access each page
--   3. Which agent is bound to each page
--   4. How pages map to nav items
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_pages (
  page_code           TEXT PRIMARY KEY,
  module_code         TEXT NOT NULL,
  product_key         VARCHAR(50) NOT NULL DEFAULT 'agrc',
  route               TEXT NOT NULL,
  display_name_en     TEXT NOT NULL,
  display_name_ar     TEXT,
  permission_code     TEXT NOT NULL,
  legacy_permission   TEXT,
  agent_id            VARCHAR(10),
  nav_item_key        TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_default_landing  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  page_type           TEXT NOT NULL DEFAULT 'standard'
    CHECK (page_type IN ('standard', 'detail', 'wizard', 'dialog', 'dashboard', 'hub')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_module ON module_pages(module_code);
CREATE INDEX IF NOT EXISTS idx_mp_route ON module_pages(route);
CREATE INDEX IF NOT EXISTS idx_mp_product ON module_pages(product_key);
CREATE INDEX IF NOT EXISTS idx_mp_agent ON module_pages(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mp_active ON module_pages(module_code, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- Seed: Pages for all 25 modules
-- ============================================================================
-- Convention:
--   page_code   = {module}_{page}          e.g., 'risk_overview'
--   permission  = {resource}:{action}      e.g., 'risk:read'  (legacy format)
--                 {mod}.{res}.{act}        e.g., 'risk.record.read' (enterprise)
--   agent_id    = 'A{nn}'                  e.g., 'A02' (from agent registry)
-- ============================================================================

INSERT INTO module_pages
  (page_code, module_code, route, display_name_en, display_name_ar,
   permission_code, legacy_permission, agent_id, sort_order, is_default_landing, page_type)
VALUES

  -- ═══════════════════════════════════════════════════════════════════════════
  -- RISK MODULE (13 pages) — Agent A02
  -- ═══════════════════════════════════════════════════════════════════════════
  ('risk_overview',     'risk', '/risk/overview',     'Risk Overview',       'نظرة عامة على المخاطر',
   'risk.dashboard.read', 'risk:read', 'A02', 1, TRUE, 'dashboard'),
  ('risk_register',     'risk', '/risk/register',     'Risk Register',       'سجل المخاطر',
   'risk.record.read', 'risk:read', 'A02', 2, FALSE, 'standard'),
  ('risk_heatmap',      'risk', '/risk/heatmap',      'Risk Heatmap',        'خريطة المخاطر الحرارية',
   'risk.record.read', 'risk:read', 'A02', 3, FALSE, 'dashboard'),
  ('risk_treatments',   'risk', '/risk/treatments',   'Risk Treatments',     'معالجة المخاطر',
   'risk.record.read', 'risk:read', 'A02', 4, FALSE, 'standard'),
  ('risk_kris',         'risk', '/risk/kris',         'Key Risk Indicators', 'مؤشرات المخاطر الرئيسية',
   'risk.record.read', 'risk:read', 'A02', 5, FALSE, 'standard'),
  ('risk_appetite',     'risk', '/risk/appetite',     'Risk Appetite',       'شهية المخاطر',
   'risk.record.read', 'risk:read', 'A02', 6, FALSE, 'standard'),
  ('risk_scoring',      'risk', '/risk/scoring',      'Scoring Methodology', 'منهجية التقييم',
   'risk.record.read', 'risk:read', 'A02', 7, FALSE, 'standard'),
  ('risk_metrics',      'risk', '/risk/metrics',      'Risk Metrics',        'مقاييس المخاطر',
   'risk.record.read', 'risk:read', 'A02', 8, FALSE, 'dashboard'),
  ('risk_assessments',  'risk', '/risk/assessments',  'Risk Assessments',    'تقييمات المخاطر',
   'risk.record.read', 'risk:read', 'A02', 9, FALSE, 'standard'),
  ('risk_acceptance',   'risk', '/risk/acceptance',   'Risk Acceptance',     'قبول المخاطر',
   'risk.record.read', 'risk:read', 'A02', 10, FALSE, 'standard'),
  ('risk_scenarios',    'risk', '/risk/scenarios',    'Risk Scenarios',      'سيناريوهات المخاطر',
   'risk.record.read', 'risk:read', 'A02', 11, FALSE, 'standard'),
  ('risk_bowtie',       'risk', '/risk/bowtie',       'Bowties',             'تحليل ربطة القوس',
   'risk.record.read', 'risk:read', 'A02', 12, FALSE, 'standard'),
  ('risk_vulnerabilities', 'risk', '/vulnerabilities', 'Vulnerabilities',   'الثغرات',
   'risk.record.read', 'risk:read', 'A02', 13, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- COMPLIANCE MODULE (20 pages) — Agent A03
  -- ═══════════════════════════════════════════════════════════════════════════
  ('compliance_overview',    'compliance', '/compliance/overview',    'Compliance Overview',     'نظرة عامة على الامتثال',
   'compliance.dashboard.read', 'framework:read', 'A03', 1, TRUE, 'dashboard'),
  ('compliance_frameworks',  'compliance', '/compliance/frameworks',  'Frameworks',              'أطر العمل',
   'compliance.framework.read', 'framework:read', 'A03', 2, FALSE, 'standard'),
  ('compliance_controls',    'compliance', '/compliance/controls',    'Controls',                'الضوابط',
   'compliance.control.read', 'compliance:read', 'A03', 3, FALSE, 'standard'),
  ('compliance_obligations', 'compliance', '/compliance/obligations', 'Obligations',             'الالتزامات',
   'compliance.obligation.read', 'compliance:read', 'A03', 4, FALSE, 'standard'),
  ('compliance_assessments', 'compliance', '/compliance/assessments', 'Assessments',             'التقييمات',
   'compliance.assessment.read', 'assessment:read', 'A03', 5, FALSE, 'standard'),
  ('compliance_gaps',        'compliance', '/compliance/gaps',        'Compliance Gaps',         'فجوات الامتثال',
   'compliance.gap.read', 'framework:read', 'A03', 6, FALSE, 'standard'),
  ('compliance_mappings',    'compliance', '/compliance/mappings',    'Framework Mappings',      'خرائط أطر العمل',
   'compliance.framework.read', 'framework:read', 'A03', 7, FALSE, 'standard'),
  ('compliance_posture',     'compliance', '/compliance/posture',     'Compliance Posture',      'وضع الامتثال',
   'compliance.dashboard.read', 'framework:read', 'A03', 8, FALSE, 'dashboard'),
  ('compliance_templates',   'compliance', '/compliance/templates',   'Compliance Templates',    'قوالب الامتثال',
   'compliance.control.read', 'framework:read', 'A03', 9, FALSE, 'standard'),
  ('compliance_findings',    'compliance', '/compliance/findings',    'Compliance Findings',     'نتائج الامتثال',
   'compliance.finding.read', 'framework:read', 'A03', 10, FALSE, 'standard'),
  ('compliance_sox',         'compliance', '/compliance/sox',         'SOX Compliance',          'امتثال SOX',
   'compliance.framework.read', 'framework:read', 'A03', 11, FALSE, 'standard'),
  ('compliance_esg',         'compliance', '/compliance/esg',         'ESG Compliance',          'امتثال ESG',
   'compliance.framework.read', 'framework:read', 'A03', 12, FALSE, 'standard'),
  ('compliance_rcsa',        'compliance', '/compliance/rcsa',        'RCSA Campaigns',          'حملات RCSA',
   'compliance.assessment.read', 'framework:read', 'A03', 13, FALSE, 'standard'),
  ('compliance_roadmap',     'compliance', '/compliance/roadmap',     'Compliance Roadmap',      'خارطة طريق الامتثال',
   'compliance.dashboard.read', 'framework:read', 'A03', 14, FALSE, 'standard'),
  ('compliance_calendar',    'compliance', '/compliance/calendar',    'Compliance Calendar',     'تقويم الامتثال',
   'compliance.dashboard.read', 'framework:read', 'A03', 15, FALSE, 'standard'),
  ('compliance_monitoring',  'compliance', '/compliance/monitoring',  'Controls Monitoring',     'مراقبة الضوابط',
   'compliance.control.read', 'control:read', 'A03', 16, FALSE, 'standard'),
  ('compliance_reg_changes', 'compliance', '/compliance/regulatory-changes', 'Regulatory Changes', 'التغييرات التنظيمية',
   'compliance.framework.read', 'framework:read', 'A03', 17, FALSE, 'standard'),
  ('compliance_scoring',     'compliance', '/scoring-engine',        'Scoring Engine',          'محرك التقييم',
   'compliance.control.read', 'compliance:read', 'A03', 18, FALSE, 'standard'),
  ('compliance_testing',     'compliance', '/control-testing',       'Control Testing',         'اختبار الضوابط',
   'compliance.control.read', 'control:read', 'A03', 19, FALSE, 'standard'),
  ('compliance_lifecycle',   'compliance', '/control-lifecycle',     'Control Lifecycle',       'دورة حياة الضوابط',
   'compliance.control.read', 'control:read', 'A03', 20, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- GOVERNANCE MODULE (23 pages) — Agent A01
  -- ═══════════════════════════════════════════════════════════════════════════
  ('governance_overview',       'governance', '/governance/overview',       'Governance Overview',       'نظرة عامة على الحوكمة',
   'governance.dashboard.read', 'governance:read', 'A01', 1, TRUE, 'dashboard'),
  ('governance_policies',       'governance', '/governance/policies',       'Policies',                  'السياسات',
   'governance.policy.read', 'governance:read', 'A01', 2, FALSE, 'standard'),
  ('governance_procedures',     'governance', '/governance/procedures',     'Procedures & Standards',    'الإجراءات والمعايير',
   'governance.procedure.read', 'governance:read', 'A01', 3, FALSE, 'standard'),
  ('governance_committees',     'governance', '/governance/committees',     'Committees',                'اللجان',
   'governance.committee.read', 'governance:read', 'A01', 4, FALSE, 'standard'),
  ('governance_decisions',      'governance', '/governance/decisions',      'Decisions',                 'القرارات',
   'governance.decision.read', 'governance:read', 'A01', 5, FALSE, 'standard'),
  ('governance_actions',        'governance', '/governance/actions',        'Actions',                   'الإجراءات',
   'governance.action.read', 'governance:read', 'A01', 6, FALSE, 'standard'),
  ('governance_exceptions',     'governance', '/governance/exceptions',     'Exceptions',                'الاستثناءات',
   'governance.exception.read', 'governance:read', 'A01', 7, FALSE, 'standard'),
  ('governance_mandates',       'governance', '/governance/mandates',       'Mandates',                  'التفويضات',
   'governance.mandate.read', 'governance:read', 'A01', 8, FALSE, 'standard'),
  ('governance_reviews',        'governance', '/governance/reviews',        'Policy Reviews',            'مراجعات السياسات',
   'governance.review.read', 'governance:read', 'A01', 9, FALSE, 'standard'),
  ('governance_acknowledgements','governance', '/governance/acknowledgements','Acknowledgements',        'الإقرارات',
   'governance.acknowledgement.read', 'governance:read', 'A01', 10, FALSE, 'standard'),
  ('governance_objectives',     'governance', '/governance/objectives',     'Objectives',                'الأهداف',
   'governance.objective.read', 'governance:read', 'A01', 11, FALSE, 'standard'),
  ('governance_delegations',    'governance', '/governance/delegations',    'Delegations',               'التفويضات',
   'governance.delegation.read', 'delegation:read', 'A01', 12, FALSE, 'standard'),
  ('governance_responsibilities','governance', '/governance/responsibilities','Responsibilities',        'المسؤوليات',
   'governance.responsibility.read', 'governance:read', 'A01', 13, FALSE, 'standard'),
  ('governance_raci',           'governance', '/governance/raci',           'RACI Matrix',               'مصفوفة RACI',
   'governance.raci.read', 'governance:read', 'A01', 14, FALSE, 'standard'),
  ('governance_raci_templates', 'governance', '/governance/raci-templates', 'RACI Templates',            'قوالب RACI',
   'governance.raci.read', 'governance:read', 'A01', 15, FALSE, 'standard'),
  ('governance_obligations',    'governance', '/governance/obligations',    'Obligations',               'الالتزامات',
   'governance.obligation.read', 'governance:read', 'A01', 16, FALSE, 'standard'),
  ('governance_charters',       'governance', '/governance/charters',       'Charters',                  'المواثيق',
   'governance.charter.read', 'governance:read', 'A01', 17, FALSE, 'standard'),
  ('governance_health',         'governance', '/governance/health',         'Health Score',              'درجة الصحة',
   'governance.dashboard.read', 'governance:read', 'A01', 18, FALSE, 'dashboard'),
  ('governance_structure',      'governance', '/governance/structure',      'Organizational Structure',  'الهيكل التنظيمي',
   'governance.structure.read', 'governance:read', 'A01', 19, FALSE, 'standard'),
  ('governance_board_packs',    'governance', '/governance/board-packs',    'Board Packs',              'حزم مجلس الإدارة',
   'governance.board.read', 'governance:read', 'A01', 20, FALSE, 'standard'),
  ('governance_calendar',       'governance', '/governance/calendar',       'Cadence Calendar',          'تقويم الاجتماعات',
   'governance.calendar.read', 'governance:read', 'A01', 21, FALSE, 'standard'),
  ('governance_exec_summaries', 'governance', '/governance/executive-summaries', 'Executive Summaries',  'ملخصات تنفيذية',
   'governance.report.read', 'governance:read', 'A01', 22, FALSE, 'standard'),
  ('governance_timeline',       'governance', '/timeline',                   'Timeline',                 'الجدول الزمني',
   'governance.timeline.read', 'timeline:read', 'A01', 23, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- POLICY MODULE (5 pages) — Agent A04
  -- ═══════════════════════════════════════════════════════════════════════════
  ('policy_overview',    'policy', '/policy/overview',    'Policy Overview',    'نظرة عامة على السياسات',
   'policy.dashboard.read', 'policy:read', 'A04', 1, TRUE, 'dashboard'),
  ('policy_list',        'policy', '/policies',           'Policies',           'السياسات',
   'policy.record.read', 'policy:read', 'A04', 2, FALSE, 'standard'),
  ('policy_code',        'policy', '/policy-code',        'Policy Code',        'رمز السياسة',
   'policy.record.read', 'policy:read', 'A04', 3, FALSE, 'standard'),
  ('policy_versions',    'policy', '/policy-versions',    'Policy Versions',    'إصدارات السياسات',
   'policy.record.read', 'policy:read', 'A04', 4, FALSE, 'standard'),
  ('policy_procedures',  'policy', '/procedures',         'Procedures',         'الإجراءات',
   'policy.procedure.read', 'procedure:read', 'A04', 5, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- AUDIT MODULE (22 pages) — Agent A05
  -- ═══════════════════════════════════════════════════════════════════════════
  ('audit_overview',      'audit', '/audit/overview',      'Audit Overview',       'نظرة عامة على التدقيق',
   'audit.dashboard.read', 'audit:read', 'A05', 1, TRUE, 'dashboard'),
  ('audit_plan',          'audit', '/audit/plan',          'Audit Plan',           'خطة التدقيق',
   'audit.plan.read', 'audit:read', 'A05', 2, FALSE, 'standard'),
  ('audit_engagements',   'audit', '/audit/engagements',   'Audit Engagements',    'ارتباطات التدقيق',
   'audit.engagement.read', 'audit:read', 'A05', 3, FALSE, 'standard'),
  ('audit_findings',      'audit', '/audit/findings',      'Audit Findings',       'نتائج التدقيق',
   'audit.finding.read', 'audit:read', 'A05', 4, FALSE, 'standard'),
  ('audit_capa',          'audit', '/audit/capa',          'CAPA',                 'الإجراءات التصحيحية',
   'audit.capa.read', 'audit:read', 'A05', 5, FALSE, 'standard'),
  ('audit_validation',    'audit', '/audit/validation',    'Validation',           'التحقق',
   'audit.validation.read', 'audit:read', 'A05', 6, FALSE, 'standard'),
  ('audit_reports',       'audit', '/audit/reports',       'Audit Reports',        'تقارير التدقيق',
   'audit.report.read', 'audit:read', 'A05', 7, FALSE, 'standard'),
  ('audit_universe',      'audit', '/audit/universe',      'Audit Universe',       'عالم التدقيق',
   'audit.universe.read', 'audit:read', 'A05', 8, FALSE, 'standard'),
  ('audit_risk_planning', 'audit', '/audit/risk-planning', 'Risk Planning',        'تخطيط المخاطر',
   'audit.plan.read', 'audit:read', 'A05', 9, FALSE, 'standard'),
  ('audit_schedules',     'audit', '/audit/schedules',     'Schedules',            'الجداول',
   'audit.schedule.read', 'audit:read', 'A05', 10, FALSE, 'standard'),
  ('audit_working_papers','audit', '/audit/working-papers','Working Papers',       'أوراق العمل',
   'audit.workpaper.read', 'audit:read', 'A05', 11, FALSE, 'standard'),
  ('audit_team',          'audit', '/audit/team',          'Audit Team',           'فريق التدقيق',
   'audit.team.read', 'audit:read', 'A05', 12, FALSE, 'standard'),
  ('audit_repeat_findings','audit', '/audit/repeat-findings','Repeat Findings',    'النتائج المتكررة',
   'audit.finding.read', 'audit:read', 'A05', 13, FALSE, 'standard'),
  ('audit_qa_reviews',    'audit', '/audit/qa-reviews',    'QA Reviews',           'مراجعات الجودة',
   'audit.qa.read', 'audit:read', 'A05', 14, FALSE, 'standard'),
  ('audit_finding_trends','audit', '/audit/finding-trends','Finding Trends',       'اتجاهات النتائج',
   'audit.finding.read', 'audit:read', 'A05', 15, FALSE, 'dashboard'),
  ('audit_ratings',       'audit', '/audit/ratings',       'Audit Ratings',        'تقييمات التدقيق',
   'audit.rating.read', 'audit:read', 'A05', 16, FALSE, 'standard'),
  ('audit_capa_effect',   'audit', '/audit/capa-effectiveness','CAPA Effectiveness','فعالية التصحيحية',
   'audit.capa.read', 'audit:read', 'A05', 17, FALSE, 'dashboard'),
  ('audit_committee',     'audit', '/audit/committee',     'Committee Dashboard',  'لوحة اللجنة',
   'audit.committee.read', 'audit:read', 'A05', 18, FALSE, 'dashboard'),
  ('audit_external',      'audit', '/audit/external',      'External Audits',      'التدقيق الخارجي',
   'audit.engagement.read', 'audit:read', 'A05', 19, FALSE, 'standard'),
  ('audit_regulatory',    'audit', '/audit/regulatory',    'Regulatory Audits',    'التدقيق التنظيمي',
   'audit.engagement.read', 'audit:read', 'A05', 20, FALSE, 'standard'),
  ('audit_test_plans',    'audit', '/audit/test-plans',    'Test Plans',           'خطط الاختبار',
   'audit.testplan.read', 'audit:read', 'A05', 21, FALSE, 'standard'),
  ('audit_login_history', 'audit', '/login-history',       'Login History',        'سجل الدخول',
   'audit.log.read', 'audit:read', 'A05', 22, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- EVIDENCE MODULE (10 pages) — Agent A06
  -- ═══════════════════════════════════════════════════════════════════════════
  ('evidence_overview',    'evidence', '/evidence/overview',    'Evidence Overview',       'نظرة عامة على الأدلة',
   'evidence.dashboard.read', 'evidence:read', 'A06', 1, TRUE, 'dashboard'),
  ('evidence_vault',       'evidence', '/evidence/vault',       'Evidence Vault',          'خزنة الأدلة',
   'evidence.record.read', 'evidence:read', 'A06', 2, FALSE, 'standard'),
  ('evidence_requests',    'evidence', '/evidence/requests',    'Evidence Requests',       'طلبات الأدلة',
   'evidence.request.read', 'evidence:read', 'A06', 3, FALSE, 'standard'),
  ('evidence_reviews',     'evidence', '/evidence/reviews',     'Evidence Reviews',        'مراجعات الأدلة',
   'evidence.review.read', 'evidence:read', 'A06', 4, FALSE, 'standard'),
  ('evidence_expiry',      'evidence', '/evidence/expiry',      'Expiry & Coverage',       'الانتهاء والتغطية',
   'evidence.record.read', 'evidence:read', 'A06', 5, FALSE, 'dashboard'),
  ('evidence_mappings',    'evidence', '/evidence/mappings',    'Evidence Mappings',       'خرائط الأدلة',
   'evidence.mapping.read', 'evidence:read', 'A06', 6, FALSE, 'standard'),
  ('evidence_catalog',     'evidence', '/evidence/catalog',     'Evidence Catalog',        'كتالوج الأدلة',
   'evidence.record.read', 'evidence:read', 'A06', 7, FALSE, 'standard'),
  ('evidence_tasks',       'evidence', '/evidence/tasks',       'Evidence Tasks',          'مهام الأدلة',
   'evidence.task.read', 'evidence:read', 'A06', 8, FALSE, 'standard'),
  ('evidence_auto_collect','evidence', '/evidence/automated-collection','Automated Collection','الجمع الآلي',
   'evidence.record.read', 'evidence:read', 'A06', 9, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- INCIDENT MODULE (11 pages) — Agent A07
  -- ═══════════════════════════════════════════════════════════════════════════
  ('incident_overview',    'incident', '/incidents/overview',    'Incident Overview',      'نظرة عامة على الحوادث',
   'incident.dashboard.read', 'incident:read', 'A07', 1, TRUE, 'dashboard'),
  ('incident_register',    'incident', '/incidents/register',    'Incident Register',      'سجل الحوادث',
   'incident.record.read', 'incident:read', 'A07', 2, FALSE, 'standard'),
  ('incident_investigation','incident', '/incidents/investigation','Investigation',        'التحقيق',
   'incident.investigation.read', 'incident:read', 'A07', 3, FALSE, 'standard'),
  ('incident_war_room',    'incident', '/incidents/war-room',    'War Room',               'غرفة العمليات',
   'incident.record.read', 'incident:read', 'A07', 4, FALSE, 'standard'),
  ('incident_near_miss',   'incident', '/incidents/near-miss',   'Near-Miss Incidents',    'حوادث شبه واقعة',
   'incident.record.read', 'incident:read', 'A07', 5, FALSE, 'standard'),
  ('incident_pir',         'incident', '/incidents/pir',         'Post-Incident Review',   'مراجعة ما بعد الحادث',
   'incident.review.read', 'incident:read', 'A07', 6, FALSE, 'standard'),
  ('incident_trends',      'incident', '/incidents/trends',      'Trends & Analytics',     'الاتجاهات والتحليلات',
   'incident.dashboard.read', 'incident:read', 'A07', 7, FALSE, 'dashboard'),
  ('incident_regulatory',  'incident', '/incidents/regulatory',  'Regulatory Reporting',   'التقارير التنظيمية',
   'incident.report.read', 'incident:read', 'A07', 8, FALSE, 'standard'),
  ('incident_taxonomy',    'incident', '/incidents/taxonomy',    'Incident Taxonomy',      'تصنيف الحوادث',
   'incident.taxonomy.read', 'incident:read', 'A07', 9, FALSE, 'standard'),
  ('incident_lessons',     'incident', '/incidents/lessons',     'Lessons Learned',        'الدروس المستفادة',
   'incident.lesson.read', 'incident:read', 'A07', 10, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- EXCEPTION MODULE (2 pages) — Agent A01
  -- ═══════════════════════════════════════════════════════════════════════════
  ('exception_overview',  'exception', '/exception/overview',    'Exception Overview',     'نظرة عامة على الاستثناءات',
   'exception.dashboard.read', 'exception:read', 'A01', 1, TRUE, 'dashboard'),
  ('exception_manager',   'exception', '/exception-manager',     'Exception Manager',      'مدير الاستثناءات',
   'exception.record.read', 'exception:read', 'A01', 2, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- VENDOR MODULE (10 pages) — Agent A08
  -- ═══════════════════════════════════════════════════════════════════════════
  ('vendor_overview',      'vendor', '/vendor-risk/overview',      'Vendor Overview',        'نظرة عامة على الموردين',
   'vendor.dashboard.read', 'vendor:read', 'A08', 1, TRUE, 'dashboard'),
  ('vendor_register',      'vendor', '/vendor-risk/register',      'Vendor Register',        'سجل الموردين',
   'vendor.record.read', 'vendor:read', 'A08', 2, FALSE, 'standard'),
  ('vendor_assessments',   'vendor', '/vendor-risk/assessments',   'Risk Assessments',       'تقييمات المخاطر',
   'vendor.assessment.read', 'vendor:read', 'A08', 3, FALSE, 'standard'),
  ('vendor_due_diligence', 'vendor', '/vendor-risk/due-diligence', 'Due Diligence',          'العناية الواجبة',
   'vendor.diligence.read', 'vendor:read', 'A08', 4, FALSE, 'standard'),
  ('vendor_sla',           'vendor', '/vendor-risk/sla',           'SLA Monitoring',         'مراقبة SLA',
   'vendor.sla.read', 'vendor:read', 'A08', 5, FALSE, 'standard'),
  ('vendor_fourth_party',  'vendor', '/vendor-risk/fourth-party',  'Fourth-Party Risk',      'مخاطر الطرف الرابع',
   'vendor.record.read', 'vendor:read', 'A08', 6, FALSE, 'standard'),
  ('vendor_concentration', 'vendor', '/vendor-risk/concentration', 'Concentration Risk',     'مخاطر التركز',
   'vendor.record.read', 'vendor:read', 'A08', 7, FALSE, 'standard'),
  ('vendor_offboarding',   'vendor', '/vendor-risk/offboarding',   'Vendor Offboarding',     'إنهاء خدمات الموردين',
   'vendor.record.read', 'vendor:read', 'A08', 8, FALSE, 'standard'),
  ('vendor_monitoring',    'vendor', '/vendor-risk/monitoring',    'Continuous Monitoring',   'المراقبة المستمرة',
   'vendor.monitoring.read', 'vendor:read', 'A08', 9, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- BCP MODULE (10 pages) — Agent A09
  -- ═══════════════════════════════════════════════════════════════════════════
  ('bcp_overview',     'bcp', '/bcp/overview',     'BCP Overview',          'نظرة عامة على استمرارية الأعمال',
   'bcp.dashboard.read', 'bcp:read', 'A09', 1, TRUE, 'dashboard'),
  ('bcp_plans',        'bcp', '/bcp/plans',        'BCP Plans',             'خطط استمرارية الأعمال',
   'bcp.plan.read', 'bcp:read', 'A09', 2, FALSE, 'standard'),
  ('bcp_bia',          'bcp', '/bcp/bia',          'BIA Wizard',            'معالج تحليل أثر الأعمال',
   'bcp.bia.read', 'bcp:read', 'A09', 3, FALSE, 'wizard'),
  ('bcp_exercises',    'bcp', '/bcp/exercises',    'Exercises & DR Tests',  'التمارين واختبارات التعافي',
   'bcp.exercise.read', 'bcp:read', 'A09', 4, FALSE, 'standard'),
  ('bcp_crisis_comm',  'bcp', '/bcp/crisis-comm',  'Crisis Communication',  'التواصل في الأزمات',
   'bcp.crisis.read', 'bcp:read', 'A09', 5, FALSE, 'standard'),
  ('bcp_recovery',     'bcp', '/bcp/recovery',     'Recovery Strategies',   'استراتيجيات التعافي',
   'bcp.recovery.read', 'bcp:read', 'A09', 6, FALSE, 'standard'),
  ('bcp_activation',   'bcp', '/bcp/activation',   'Plan Activation',       'تفعيل الخطة',
   'bcp.plan.read', 'bcp:read', 'A09', 7, FALSE, 'standard'),
  ('bcp_dependencies', 'bcp', '/bcp/dependencies', 'Dependency Maps',       'خرائط التبعية',
   'bcp.dependency.read', 'bcp:read', 'A09', 8, FALSE, 'standard'),
  ('bcp_maturity',     'bcp', '/bcp/maturity',     'BCP Maturity',          'نضج استمرارية الأعمال',
   'bcp.maturity.read', 'bcp:read', 'A09', 9, FALSE, 'dashboard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- ASSET MODULE (2 pages) — Agent A01
  -- ═══════════════════════════════════════════════════════════════════════════
  ('asset_overview',   'asset', '/asset/overview',    'Asset Overview',        'نظرة عامة على الأصول',
   'asset.dashboard.read', 'asset:read', 'A01', 1, TRUE, 'dashboard'),
  ('asset_list',       'asset', '/assets',             'Assets',               'الأصول',
   'asset.record.read', 'asset:read', 'A01', 2, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- REMEDIATION MODULE (1 page) — Agent A01
  -- ═══════════════════════════════════════════════════════════════════════════
  ('remediation_overview', 'remediation', '/remediation/overview', 'Remediation Overview',  'نظرة عامة على المعالجة',
   'remediation.dashboard.read', 'remediation:read', 'A01', 1, TRUE, 'hub'),
  ('remediation_list',     'remediation', '/remediation',           'Remediation Items',    'عناصر المعالجة',
   'remediation.record.read', 'remediation:read', 'A01', 2, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- ACTION MODULE (2 pages) — Agent A01
  -- ═══════════════════════════════════════════════════════════════════════════
  ('action_overview',  'action', '/action/overview',  'Action Overview',       'نظرة عامة على الإجراءات',
   'action.dashboard.read', 'action:read', 'A01', 1, TRUE, 'hub'),
  ('action_items',     'action', '/action-items',      'Action Items',         'عناصر الإجراءات',
   'action.record.read', 'action:read', 'A01', 2, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- ASSESSMENT MODULE (4 pages) — Agent A03
  -- ═══════════════════════════════════════════════════════════════════════════
  ('assessment_overview',   'assessment', '/assessment/overview',     'Assessment Overview',    'نظرة عامة على التقييم',
   'assessment.dashboard.read', 'assessment:read', 'A03', 1, TRUE, 'dashboard'),
  ('assessment_list',       'assessment', '/assessments',             'Assessments',            'التقييمات',
   'assessment.record.read', 'assessment:read', 'A03', 2, FALSE, 'standard'),
  ('assessment_templates',  'assessment', '/assessment-templates',    'Assessment Templates',   'قوالب التقييم',
   'assessment.template.read', 'assessment:read', 'A03', 3, FALSE, 'standard'),
  ('assessment_nca',        'assessment', '/nca-assessment',          'NCA Assessment',         'تقييم NCA',
   'assessment.record.read', 'assessment:read', 'A03', 4, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- MATURITY / QIYAS MODULE (16 pages) — Agent A10
  -- ═══════════════════════════════════════════════════════════════════════════
  ('maturity_overview',      'maturity', '/qiyas',                   'Qiyas Dashboard',        'لوحة قياس',
   'maturity.dashboard.read', 'maturity:read', 'A10', 1, TRUE, 'dashboard'),
  ('maturity_models',        'maturity', '/qiyas/models',            'Qiyas Models',           'نماذج قياس',
   'maturity.model.read', 'maturity:read', 'A10', 2, FALSE, 'standard'),
  ('maturity_assessments',   'maturity', '/qiyas/assessments',       'Qiyas Assessments',      'تقييمات قياس',
   'maturity.assessment.read', 'maturity:read', 'A10', 3, FALSE, 'standard'),
  ('maturity_recommendations','maturity', '/qiyas/recommendations', 'Recommendations',        'التوصيات',
   'maturity.recommendation.read', 'maturity:read', 'A10', 4, FALSE, 'standard'),
  ('maturity_roadmap',       'maturity', '/qiyas/roadmap',           'Improvement Roadmap',    'خارطة التحسين',
   'maturity.roadmap.read', 'maturity:read', 'A10', 5, FALSE, 'standard'),
  ('maturity_calibration',   'maturity', '/qiyas/calibration',       'Calibration',            'المعايرة',
   'maturity.calibration.read', 'maturity:read', 'A10', 6, FALSE, 'standard'),
  ('maturity_evidence',      'maturity', '/qiyas/evidence-scoring',  'Evidence Scoring',       'تقييم الأدلة',
   'maturity.evidence.read', 'maturity:read', 'A10', 7, FALSE, 'standard'),
  ('maturity_heatmap',       'maturity', '/qiyas/maturity-heatmap',  'Maturity Heatmap',       'خريطة النضج الحرارية',
   'maturity.dashboard.read', 'maturity:read', 'A10', 8, FALSE, 'dashboard'),
  ('maturity_trends',        'maturity', '/qiyas/maturity-trends',   'Maturity Trends',        'اتجاهات النضج',
   'maturity.dashboard.read', 'maturity:read', 'A10', 9, FALSE, 'dashboard'),
  ('maturity_benchmarks',    'maturity', '/qiyas/benchmarks',        'Benchmarks',             'المعايير المرجعية',
   'maturity.benchmark.read', 'maturity:read', 'A10', 10, FALSE, 'standard'),
  ('maturity_certification', 'maturity', '/qiyas/certification',     'Certification',          'الشهادات',
   'maturity.certification.read', 'maturity:read', 'A10', 11, FALSE, 'standard'),
  ('maturity_respondents',   'maturity', '/qiyas/respondents',       'Respondents',            'المستجيبون',
   'maturity.respondent.read', 'maturity:read', 'A10', 12, FALSE, 'standard'),
  ('maturity_questions',     'maturity', '/qiyas/questions',         'Question Bank',          'بنك الأسئلة',
   'maturity.question.read', 'maturity:read', 'A10', 13, FALSE, 'standard'),
  ('maturity_scoping',       'maturity', '/qiyas/scoping',           'Scoping',                'تحديد النطاق',
   'maturity.scope.read', 'maturity:read', 'A10', 14, FALSE, 'wizard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TRAINING MODULE (9 pages)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('training_overview',      'training', '/training/overview',       'Training Overview',      'نظرة عامة على التدريب',
   'training.dashboard.read', 'training:read', NULL, 1, TRUE, 'dashboard'),
  ('training_campaigns',     'training', '/training/campaigns',      'Training Campaigns',     'حملات التدريب',
   'training.campaign.read', 'training:read', NULL, 2, FALSE, 'standard'),
  ('training_assignments',   'training', '/training/assignments',    'Training Assignments',   'تعيينات التدريب',
   'training.assignment.read', 'training:read', NULL, 3, FALSE, 'standard'),
  ('training_content',       'training', '/training/content',        'Content Library',        'مكتبة المحتوى',
   'training.content.read', 'training:read', NULL, 4, FALSE, 'standard'),
  ('training_certifications','training', '/training/certifications', 'Certifications',         'الشهادات',
   'training.certification.read', 'training:read', NULL, 5, FALSE, 'standard'),
  ('training_phishing',      'training', '/training/phishing',       'Phishing Simulations',   'محاكاة التصيد',
   'training.phishing.read', 'training:read', NULL, 6, FALSE, 'standard'),
  ('training_compliance',    'training', '/training/compliance',     'Compliance Tracker',     'متتبع الامتثال',
   'training.compliance.read', 'training:read', NULL, 7, FALSE, 'standard'),
  ('training_reports',       'training', '/training/reports',        'Training Reports',       'تقارير التدريب',
   'training.report.read', 'training:read', NULL, 8, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- KNOWLEDGE MODULE (2 pages)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('knowledge_overview',  'knowledge', '/knowledge/overview',  'Knowledge Overview',     'نظرة عامة على المعرفة',
   'knowledge.dashboard.read', 'knowledge:read', NULL, 1, TRUE, 'hub'),
  ('knowledge_hub',       'knowledge', '/knowledge-hub',        'Knowledge Hub',          'مركز المعرفة',
   'knowledge.record.read', 'knowledge:read', NULL, 2, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- AI GOVERNANCE MODULE (21 pages) — Agent A01
  -- ═══════════════════════════════════════════════════════════════════════════
  ('aig_overview',          'ai-governance', '/ai-governance/overview',          'AI Governance Overview',   'نظرة عامة حوكمة الذكاء',
   'ai_governance.dashboard.read', 'ai:read', 'A01', 1, TRUE, 'dashboard'),
  ('aig_assets',            'ai-governance', '/ai-governance/assets',            'AI Assets',                'أصول الذكاء الاصطناعي',
   'ai_governance.asset.read', 'ai:read', 'A01', 2, FALSE, 'standard'),
  ('aig_models',            'ai-governance', '/ai-governance/models',            'AI Models',                'نماذج الذكاء الاصطناعي',
   'ai_governance.model.read', 'ai:read', 'A01', 3, FALSE, 'standard'),
  ('aig_prompts',           'ai-governance', '/ai-governance/prompts',           'Prompts',                  'المطالبات',
   'ai_governance.prompt.read', 'ai:read', 'A01', 4, FALSE, 'standard'),
  ('aig_agents',            'ai-governance', '/ai-governance/agents',            'Agents',                   'الوكلاء',
   'ai_governance.agent.read', 'ai:read', 'A01', 5, FALSE, 'standard'),
  ('aig_bindings',          'ai-governance', '/ai-governance/bindings',          'Bindings',                 'الارتباطات',
   'ai_governance.binding.read', 'ai:read', 'A01', 6, FALSE, 'standard'),
  ('aig_enforcement',       'ai-governance', '/ai-governance/enforcement',       'Enforcement',              'الإنفاذ',
   'ai_governance.enforcement.read', 'ai:read', 'A01', 7, FALSE, 'standard'),
  ('aig_audit',             'ai-governance', '/ai-governance/audit',             'AI Audit',                 'تدقيق الذكاء الاصطناعي',
   'ai_governance.audit.read', 'ai:read', 'A01', 8, FALSE, 'standard'),
  ('aig_operations',        'ai-governance', '/ai-governance/operations',        'Operations',               'العمليات',
   'ai_governance.operations.read', 'ai:read', 'A01', 9, FALSE, 'standard'),
  ('aig_alerts',            'ai-governance', '/ai-governance/alerts',            'Alerts & Killswitch',      'التنبيهات والإيقاف',
   'ai_governance.alert.read', 'ai:read', 'A01', 10, FALSE, 'standard'),
  ('aig_board_summary',     'ai-governance', '/ai-governance/board-summary',     'Board Summary',            'ملخص مجلس الإدارة',
   'ai_governance.report.read', 'ai:read', 'A01', 11, FALSE, 'standard'),
  ('aig_maturity',          'ai-governance', '/ai-governance/maturity',          'AI Maturity Scorecard',    'بطاقة نضج الذكاء',
   'ai_governance.maturity.read', 'ai:read', 'A01', 12, FALSE, 'dashboard'),
  ('aig_model_drift',       'ai-governance', '/ai-governance/model-drift',       'Model Drift',              'انحراف النموذج',
   'ai_governance.model.read', 'ai:read', 'A01', 13, FALSE, 'standard'),
  ('aig_fairness',          'ai-governance', '/ai-governance/fairness',          'AI Fairness',              'عدالة الذكاء الاصطناعي',
   'ai_governance.fairness.read', 'ai:read', 'A01', 14, FALSE, 'standard'),
  ('aig_eu_classification', 'ai-governance', '/ai-governance/eu-classification', 'EU AI Classification',     'تصنيف الذكاء الأوروبي',
   'ai_governance.classification.read', 'ai:read', 'A01', 15, FALSE, 'standard'),
  ('aig_ethics_board',      'ai-governance', '/ai-governance/ethics-board',      'Ethics Board',             'لجنة الأخلاقيات',
   'ai_governance.ethics.read', 'ai:read', 'A01', 16, FALSE, 'standard'),
  ('aig_impact_assessment', 'ai-governance', '/ai-governance/impact-assessment', 'Impact Assessment',        'تقييم الأثر',
   'ai_governance.assessment.read', 'ai:read', 'A01', 17, FALSE, 'standard'),
  ('aig_reg_changes',       'ai-governance', '/ai-governance/regulatory-changes','Regulatory Changes',       'التغييرات التنظيمية',
   'ai_governance.regulation.read', 'ai:read', 'A01', 18, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- AI MODULE (12 pages) — Agent A01
  -- ═══════════════════════════════════════════════════════════════════════════
  ('ai_overview',       'ai', '/ai/overview',        'AI Overview',          'نظرة عامة على الذكاء',
   'ai.dashboard.read', 'copilot:read', 'A01', 1, TRUE, 'dashboard'),
  ('ai_hub',            'ai', '/ai-hub',              'AI Hub',               'مركز الذكاء الاصطناعي',
   'ai.hub.read', 'copilot:read', 'A01', 2, FALSE, 'hub'),
  ('ai_copilot',        'ai', '/copilot',             'Copilot',              'المساعد الذكي',
   'ai.copilot.read', 'copilot:read', 'A01', 3, FALSE, 'standard'),
  ('ai_copilot_chat',   'ai', '/copilot-chat',        'Copilot Chat',         'محادثة المساعد الذكي',
   'ai.copilot.read', 'copilot:read', 'A01', 4, FALSE, 'standard'),
  ('ai_execution_plans','ai', '/ai-execution-plans',  'Execution Plans',      'خطط التنفيذ',
   'ai.execution.read', 'ai:read', 'A01', 5, FALSE, 'standard'),
  ('ai_squad',          'ai', '/ai-squad',             'AI Squad',             'فريق الذكاء',
   'ai.squad.read', 'ai:read', 'A01', 6, FALSE, 'standard'),
  ('ai_queue',          'ai', '/ai-queue',             'AI Queue',             'قائمة الانتظار',
   'ai.queue.read', 'ai:read', 'A01', 7, FALSE, 'standard'),
  ('ai_hitl',           'ai', '/hitl-center',          'HITL Center',          'مركز HITL',
   'ai.hitl.read', 'ai:read', 'A01', 8, FALSE, 'standard'),
  ('ai_inference',      'ai', '/inference-admin',      'Inference Admin',      'إدارة الاستدلال',
   'ai.inference.manage', 'ai:manage', 'A01', 9, FALSE, 'standard'),
  ('ai_agent_hub',      'ai', '/agent-hub',            'Agent Hub',            'مركز الوكلاء',
   'ai.agent.read', 'agrc_os:read', 'A01', 10, FALSE, 'standard'),
  ('ai_engine',         'ai', '/admin/agrc-engine',    'AGRC Engine',          'محرك AGRC',
   'ai.engine.read', 'agrc_os:read', 'A01', 11, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- WORKSPACE MODULE (20 pages) — No default agent
  -- ═══════════════════════════════════════════════════════════════════════════
  ('workspace_home',        'workspace', '/workspace-home',         'Workspace Home',          'الصفحة الرئيسية',
   'workspace.dashboard.read', 'analytics:read', NULL, 1, TRUE, 'dashboard'),
  ('workspace_admin',       'workspace', '/admin',                   'Admin Dashboard',         'لوحة الإدارة',
   'workspace.admin.read', 'admin:read', NULL, 2, FALSE, 'dashboard'),
  ('workspace_settings',    'workspace', '/admin/settings',          'Settings',                'الإعدادات',
   'workspace.settings.read', 'platform:admin', NULL, 3, FALSE, 'standard'),
  ('workspace_team',        'workspace', '/team',                    'Team Management',         'إدارة الفريق',
   'workspace.team.read', 'users:manage', NULL, 4, FALSE, 'standard'),
  ('workspace_tenant_config','workspace', '/tenant-config',          'Tenant Configuration',    'تهيئة المستأجر',
   'workspace.config.read', 'admin:read', NULL, 5, FALSE, 'standard'),
  ('workspace_tier_mgmt',   'workspace', '/tier-management',         'Tier Management',         'إدارة المستوى',
   'workspace.tier.read', 'admin:read', NULL, 6, FALSE, 'standard'),
  ('workspace_roles',       'workspace', '/role-profiles',           'Role Profiles',           'ملفات الأدوار',
   'workspace.role.read', 'admin:write', NULL, 7, FALSE, 'standard'),
  ('workspace_bulk_import', 'workspace', '/bulk-import',             'Bulk Import',             'الاستيراد المجمع',
   'workspace.import.read', 'admin:read', NULL, 8, FALSE, 'standard'),
  ('workspace_profile',     'workspace', '/profile',                 'Profile',                 'الملف الشخصي',
   'workspace.profile.read', 'profile:read', NULL, 9, FALSE, 'standard'),
  ('workspace_security',    'workspace', '/security-settings',       'Security Settings',       'إعدادات الأمان',
   'workspace.security.read', 'profile:read', NULL, 10, FALSE, 'standard'),
  ('workspace_billing',     'workspace', '/billing',                 'Billing',                 'الفواتير',
   'workspace.billing.read', 'admin:read', NULL, 11, FALSE, 'standard'),
  ('workspace_service_health','workspace', '/service-health',        'Service Health',          'صحة الخدمة',
   'workspace.health.read', 'admin:read', NULL, 12, FALSE, 'standard'),
  ('workspace_jobs',        'workspace', '/jobs',                    'Background Jobs',         'المهام الخلفية',
   'workspace.jobs.read', 'admin:read', NULL, 13, FALSE, 'standard'),
  ('workspace_packs',       'workspace', '/admin/packs',             'Pack Installer',          'مثبت الحزم',
   'workspace.packs.read', 'admin:read', NULL, 14, FALSE, 'standard'),
  ('workspace_provisioning','workspace', '/admin/provisioning/orchestrator', 'Provisioning',    'التزويد',
   'workspace.provisioning.read', 'admin:read', NULL, 15, FALSE, 'standard'),
  ('workspace_form_builder','workspace', '/form-builder',            'Form Builder',            'منشئ النماذج',
   'workspace.forms.read', 'admin:read', NULL, 16, FALSE, 'standard'),
  ('workspace_custom_objects','workspace', '/custom-objects',        'Custom Objects',          'الكائنات المخصصة',
   'workspace.objects.read', 'admin:read', NULL, 17, FALSE, 'standard'),
  ('workspace_sla',         'workspace', '/sla-management',          'SLA Management',          'إدارة SLA',
   'workspace.sla.read', 'admin:read', NULL, 18, FALSE, 'standard'),
  ('workspace_ninety_day',  'workspace', '/ninety-day-plan',         '90 Day Plan',             'خطة 90 يوم',
   'workspace.plan.read', 'workspace:read', NULL, 19, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- WORKFLOW MODULE (11 pages)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('workflow_overview',     'workflow', '/workflow/overview',    'Workflow Overview',       'نظرة عامة على سير العمل',
   'workflow.dashboard.read', 'workflow:read', NULL, 1, TRUE, 'dashboard'),
  ('workflow_hub',          'workflow', '/workflow-hub',          'Workflow Hub',            'مركز سير العمل',
   'workflow.hub.read', 'workflow:read', NULL, 2, FALSE, 'hub'),
  ('workflow_designer',     'workflow', '/workflow-designer',    'Workflow Designer',       'مصمم سير العمل',
   'workflow.template.read', 'workflow:read', NULL, 3, FALSE, 'standard'),
  ('workflow_builder',      'workflow', '/workflow-builder',     'Workflow Builder',        'منشئ سير العمل',
   'workflow.template.read', 'workflow:read', NULL, 4, FALSE, 'standard'),
  ('workflow_templates',    'workflow', '/workflow-templates',   'Workflow Templates',      'قوالب سير العمل',
   'workflow.template.read', 'policy:read', NULL, 5, FALSE, 'standard'),
  ('workflow_automation',   'workflow', '/automation',           'Automation',              'الأتمتة',
   'workflow.automation.read', 'workflow:read', NULL, 6, FALSE, 'standard'),
  ('workflow_autonomous',   'workflow', '/autonomous-workflows', 'Autonomous Workflows',   'العمليات المستقلة',
   'workflow.autonomous.read', 'analytics:read', NULL, 7, FALSE, 'standard'),
  ('workflow_tasks',        'workflow', '/my-tasks',             'My Tasks',                'مهامي',
   'workflow.task.read', 'task:read', NULL, 8, FALSE, 'standard'),
  ('workflow_task_board',   'workflow', '/task-board',            'Task Board',             'لوحة المهام',
   'workflow.task.read', 'task:read', NULL, 9, FALSE, 'standard'),
  ('workflow_approvals',    'workflow', '/approval-center',      'Approval Center',         'مركز الموافقات',
   'workflow.approval.read', 'workflow:read', NULL, 10, FALSE, 'standard'),
  ('workflow_processes',    'workflow', '/processes',             'Processes',               'العمليات',
   'workflow.process.read', 'workflow:read', NULL, 11, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- REPORTING MODULE (10 pages)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('reporting_overview',    'reporting', '/reports/overview',     'Reports Overview',       'نظرة عامة على التقارير',
   'reports.dashboard.read', 'report:read', NULL, 1, TRUE, 'dashboard'),
  ('reporting_executive',   'reporting', '/reports/executive',    'Executive Dashboard',    'لوحة تنفيذية',
   'reports.executive.read', 'report:read', NULL, 2, FALSE, 'dashboard'),
  ('reporting_risk',        'reporting', '/reports/risk',         'Risk Analytics',         'تحليلات المخاطر',
   'reports.risk.read', 'report:read', NULL, 3, FALSE, 'dashboard'),
  ('reporting_compliance',  'reporting', '/reports/compliance',   'Compliance Analytics',   'تحليلات الامتثال',
   'reports.compliance.read', 'report:read', NULL, 4, FALSE, 'dashboard'),
  ('reporting_evidence',    'reporting', '/reports/evidence',     'Evidence Analytics',     'تحليلات الأدلة',
   'reports.evidence.read', 'report:read', NULL, 5, FALSE, 'dashboard'),
  ('reporting_audit',       'reporting', '/reports/audit',        'Audit Analytics',        'تحليلات التدقيق',
   'reports.audit.read', 'report:read', NULL, 6, FALSE, 'dashboard'),
  ('reporting_scheduled',   'reporting', '/reports/scheduled',    'Scheduled Reports',      'التقارير المجدولة',
   'reports.schedule.read', 'report:read', NULL, 7, FALSE, 'standard'),
  ('reporting_exports',     'reporting', '/reports/exports',      'Exports',                'التصدير',
   'reports.export.read', 'report:read', NULL, 8, FALSE, 'standard'),
  ('reporting_builder',     'reporting', '/reports/builder',      'Report Builder',         'منشئ التقارير',
   'reports.builder.read', 'report:read', NULL, 9, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- ANALYTICS MODULE (8 pages)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('analytics_overview',    'analytics', '/analytics/overview',     'Analytics Overview',     'نظرة عامة على التحليلات',
   'analytics.dashboard.read', 'analytics:read', NULL, 1, TRUE, 'dashboard'),
  ('analytics_hub',         'analytics', '/analytics-hub',           'Analytics Hub',          'مركز التحليلات',
   'analytics.hub.read', 'analytics:read', NULL, 2, FALSE, 'hub'),
  ('analytics_data_explorer','analytics', '/data-explorer',          'Data Explorer',          'مستكشف البيانات',
   'analytics.explorer.read', 'analytics:read', NULL, 3, FALSE, 'standard'),
  ('analytics_entity_graph','analytics', '/entity-graph',            'Entity Graph',           'رسم الكيانات',
   'analytics.graph.read', 'analytics:read', NULL, 4, FALSE, 'standard'),
  ('analytics_kpi',         'analytics', '/kpi/:key',                'KPI Detail',             'تفاصيل المؤشر',
   'analytics.kpi.read', 'analytics:read', NULL, 5, FALSE, 'detail'),
  ('analytics_dashboard',   'analytics', '/analytics-dashboard',     'Analytics Dashboard',    'لوحة التحليلات',
   'analytics.dashboard.read', 'analytics:read', NULL, 6, FALSE, 'dashboard'),
  ('analytics_exec_command','analytics', '/executive-command',       'Executive Command',      'القيادة التنفيذية',
   'analytics.executive.read', 'analytics:read', NULL, 7, FALSE, 'dashboard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- INTEGRATIONS MODULE (5 pages)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('integrations_overview',    'integrations', '/integrations/overview',    'Integrations Overview',   'نظرة عامة على التكاملات',
   'integrations.dashboard.read', 'integrations:read', NULL, 1, TRUE, 'dashboard'),
  ('integrations_connector_hub','integrations', '/connector-hub',           'Connector Hub',           'مركز الموصلات',
   'integrations.connector.read', 'integrations:read', NULL, 2, FALSE, 'hub'),
  ('integrations_health',      'integrations', '/connector-health',        'Connector Health',        'صحة الموصلات',
   'integrations.health.read', 'integrations:read', NULL, 3, FALSE, 'dashboard'),
  ('integrations_manager',     'integrations', '/connector-manager',       'Connector Manager',       'مدير الموصلات',
   'integrations.manager.read', 'integrations:read', NULL, 4, FALSE, 'standard'),
  ('integrations_marketplace', 'integrations', '/integration-marketplace', 'Marketplace',             'سوق التكاملات',
   'integrations.marketplace.read', 'integrations:read', NULL, 5, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- MESSAGING MODULE (2 pages)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('messaging_overview',      'messaging', '/messaging/overview',          'Messaging Overview',      'نظرة عامة على المراسلة',
   'messaging.dashboard.read', 'messaging:read', NULL, 1, TRUE, 'dashboard'),
  ('messaging_notifications', 'messaging', '/notifications',               'Notifications',           'الإشعارات',
   'messaging.notification.read', 'messaging:read', NULL, 2, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- FOUNDATION MODULE (4 pages) — Platform core
  -- ═══════════════════════════════════════════════════════════════════════════
  ('foundation_overview',     'foundation', '/foundation/overview',     'Foundation Overview',       'نظرة عامة على الأساسيات',
   'foundation.dashboard.read', 'foundation:read', NULL, 1, TRUE, 'dashboard'),
  ('foundation_entity_types', 'foundation', '/foundation/entity-types', 'Entity Types',              'أنواع الكيانات',
   'foundation.entity.read', 'foundation:read', NULL, 2, FALSE, 'standard'),
  ('foundation_lookups',      'foundation', '/foundation/lookups',      'Lookup Tables',             'جداول المراجع',
   'foundation.lookup.read', 'foundation:read', NULL, 3, FALSE, 'standard'),
  ('foundation_shared_defs',  'foundation', '/foundation/definitions',  'Shared Definitions',        'التعريفات المشتركة',
   'foundation.definition.read', 'foundation:read', NULL, 4, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- ADMIN MODULE (8 pages) — Platform core
  -- ═══════════════════════════════════════════════════════════════════════════
  ('admin_overview',          'admin', '/admin/overview',          'Admin Overview',              'نظرة عامة على الإدارة',
   'admin.dashboard.read', 'admin:read', NULL, 1, TRUE, 'dashboard'),
  ('admin_users',             'admin', '/admin/users',             'User Management',             'إدارة المستخدمين',
   'admin.user.read', 'users:manage', NULL, 2, FALSE, 'standard'),
  ('admin_roles',             'admin', '/admin/roles',             'Role Management',             'إدارة الأدوار',
   'admin.role.read', 'admin:read', NULL, 3, FALSE, 'standard'),
  ('admin_permissions',       'admin', '/admin/permissions',       'Permissions',                 'الصلاحيات',
   'admin.permission.read', 'admin:read', NULL, 4, FALSE, 'standard'),
  ('admin_audit_log',         'admin', '/admin/audit-log',         'Audit Log',                   'سجل التدقيق',
   'admin.audit.read', 'admin:read', NULL, 5, FALSE, 'standard'),
  ('admin_system_settings',   'admin', '/admin/settings',          'System Settings',             'إعدادات النظام',
   'admin.settings.read', 'admin:write', NULL, 6, FALSE, 'standard'),
  ('admin_tenant_config',     'admin', '/admin/tenant-config',     'Tenant Configuration',        'تكوين المستأجر',
   'admin.tenant.read', 'admin:write', NULL, 7, FALSE, 'standard'),
  ('admin_security',          'admin', '/admin/security',          'Security Settings',           'إعدادات الأمان',
   'admin.security.read', 'admin:write', NULL, 8, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- QIYAS MODULE (6 pages) — Enterprise tier
  -- ═══════════════════════════════════════════════════════════════════════════
  ('qiyas_overview',          'qiyas', '/qiyas/overview',          'Qiyas Overview',              'نظرة عامة على قياس',
   'qiyas.dashboard.read', 'qiyas:read', NULL, 1, TRUE, 'dashboard'),
  ('qiyas_benchmarks',        'qiyas', '/qiyas/benchmarks',        'Benchmark Index',             'مؤشر المقارنة المعيارية',
   'qiyas.benchmark.read', 'qiyas:read', NULL, 2, FALSE, 'standard'),
  ('qiyas_peer_compare',      'qiyas', '/qiyas/peer-comparison',   'Peer Comparison',             'مقارنة الأقران',
   'qiyas.peer.read', 'qiyas:read', NULL, 3, FALSE, 'standard'),
  ('qiyas_sector_index',      'qiyas', '/qiyas/sector-index',      'Sector Index',                'مؤشر القطاع',
   'qiyas.sector.read', 'qiyas:read', NULL, 4, FALSE, 'standard'),
  ('qiyas_maturity_map',      'qiyas', '/qiyas/maturity-map',      'Maturity Map',                'خريطة النضج',
   'qiyas.maturity.read', 'qiyas:read', NULL, 5, FALSE, 'dashboard'),
  ('qiyas_submissions',       'qiyas', '/qiyas/submissions',       'Submissions',                 'التقديمات',
   'qiyas.submission.read', 'qiyas:read', NULL, 6, FALSE, 'standard'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- PRIVACY MODULE (7 pages) — Enterprise tier
  -- ═══════════════════════════════════════════════════════════════════════════
  ('privacy_overview',        'privacy', '/privacy/overview',        'Privacy Overview',            'نظرة عامة على الخصوصية',
   'privacy.dashboard.read', 'privacy:read', NULL, 1, TRUE, 'dashboard'),
  ('privacy_dpia',            'privacy', '/privacy/dpia',            'DPIA Register',               'سجل تقييم الأثر',
   'privacy.dpia.read', 'privacy:read', NULL, 2, FALSE, 'standard'),
  ('privacy_consent',         'privacy', '/privacy/consent',         'Consent Management',          'إدارة الموافقات',
   'privacy.consent.read', 'privacy:read', NULL, 3, FALSE, 'standard'),
  ('privacy_data_map',        'privacy', '/privacy/data-map',        'Data Mapping',                'خريطة البيانات',
   'privacy.datamap.read', 'privacy:read', NULL, 4, FALSE, 'standard'),
  ('privacy_rights',          'privacy', '/privacy/rights',          'Data Subject Rights',         'حقوق أصحاب البيانات',
   'privacy.rights.read', 'privacy:read', NULL, 5, FALSE, 'standard'),
  ('privacy_incidents',       'privacy', '/privacy/incidents',       'Privacy Incidents',           'حوادث الخصوصية',
   'privacy.incident.read', 'privacy:read', NULL, 6, FALSE, 'standard'),
  ('privacy_compliance',      'privacy', '/privacy/compliance',      'Privacy Compliance',          'امتثال الخصوصية',
   'privacy.compliance.read', 'privacy:read', NULL, 7, FALSE, 'standard')

ON CONFLICT (page_code) DO UPDATE SET
  module_code       = EXCLUDED.module_code,
  route             = EXCLUDED.route,
  display_name_en   = EXCLUDED.display_name_en,
  display_name_ar   = EXCLUDED.display_name_ar,
  permission_code   = EXCLUDED.permission_code,
  legacy_permission = EXCLUDED.legacy_permission,
  agent_id          = EXCLUDED.agent_id,
  sort_order        = EXCLUDED.sort_order,
  is_default_landing= EXCLUDED.is_default_landing,
  page_type         = EXCLUDED.page_type,
  updated_at        = NOW();
