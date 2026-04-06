-- 054: Seed dashboard_layouts extensions, widget_registry extensions, role_bindings
-- Populates the new columns added by 053 and seeds role bindings

-- ── 1. Update existing dashboard_layouts with new column values ──────────────

UPDATE dashboard_layouts SET
  module_code = '*', route = '/dashboard/big_picture', category = 'tenant',
  icon = 'chart-bar', description = 'Full tenant overview with all major KPIs'
WHERE dashboard_code = 'big_picture' AND (route IS NULL OR route = '');

UPDATE dashboard_layouts SET
  module_code = '*', route = '/dashboard/executive', category = 'role',
  icon = 'crown', description = 'High-level KPIs, risk heatmap, compliance score, audit readiness'
WHERE dashboard_code = 'executive' AND (route IS NULL OR route = '');

UPDATE dashboard_layouts SET
  module_code = 'compliance', route = '/dashboard/compliance_ops', category = 'hub',
  icon = 'shield', description = 'Compliance assessments, findings, control testing'
WHERE dashboard_code = 'compliance_ops' AND (route IS NULL OR route = '');

UPDATE dashboard_layouts SET
  module_code = 'risk', route = '/dashboard/risk_ops', category = 'hub',
  icon = 'exclamation-triangle', description = 'Risk register, scoring, heatmap, treatment'
WHERE dashboard_code = 'risk_ops' AND (route IS NULL OR route = '');

UPDATE dashboard_layouts SET
  module_code = 'evidence', route = '/dashboard/evidence_ops', category = 'hub',
  icon = 'folder-open', description = 'Evidence plan, catalog, tasks, upload, versions'
WHERE dashboard_code = 'evidence_ops' AND (route IS NULL OR route = '');

UPDATE dashboard_layouts SET
  module_code = 'audit', route = '/dashboard/audit_ops', category = 'hub',
  icon = 'verified', description = 'Audit trail, package, workpapers, findings'
WHERE dashboard_code = 'audit_ops' AND (route IS NULL OR route = '');

-- ── 2. Insert additional dashboards from composer engine ─────────────────────

INSERT INTO dashboard_layouts (dashboard_code, name_en, name_ar, layout, audience, sort_order,
  module_code, route, category, icon, description)
VALUES
  ('governance_hub', 'Governance Hub', 'مركز الحوكمة',
   '{"columns":12,"widgets":[{"id":"compliance-gauge","x":0,"y":0,"w":3,"h":2},{"id":"policy-scorecard","x":3,"y":0,"w":3,"h":2},{"id":"control-progress","x":6,"y":0,"w":3,"h":2},{"id":"framework-coverage","x":0,"y":2,"w":6,"h":2},{"id":"framework-radar","x":6,"y":2,"w":6,"h":2}]}',
   'all', 10, 'governance', '/dashboard/governance_hub', 'hub', 'building', 'Policies, controls, governance structure'),

  ('incident_hub', 'Incident Hub', 'مركز الحوادث',
   '{"columns":12,"widgets":[{"id":"incident-tracker","x":0,"y":0,"w":4,"h":2},{"id":"exceptions-aging","x":4,"y":0,"w":4,"h":1},{"id":"bcp-status","x":8,"y":0,"w":4,"h":1}]}',
   'all', 11, 'incident', '/dashboard/incident_hub', 'hub', 'bolt', 'Incidents, exceptions, remediation, BCP'),

  ('vendor_hub', 'Vendor Hub', 'مركز الموردين',
   '{"columns":12,"widgets":[{"id":"vendor-risk","x":0,"y":0,"w":6,"h":2},{"id":"risk-heatmap","x":6,"y":0,"w":6,"h":2}]}',
   'all', 12, 'vendor', '/dashboard/vendor_hub', 'hub', 'truck', 'Vendor questionnaires, risk scoring, due diligence'),

  ('ai_suite', 'AI Suite', 'جناح الذكاء الاصطناعي',
   '{"columns":12,"widgets":[{"id":"ai-summary","x":0,"y":0,"w":6,"h":2},{"id":"program-health","x":6,"y":0,"w":3,"h":2},{"id":"momentum-indicator","x":9,"y":0,"w":3,"h":1}]}',
   'all', 13, '*', '/dashboard/ai_suite', 'hub', 'microchip-ai', 'AI hub, copilot, insights'),

  ('role_grc_owner', 'GRC Owner Dashboard', 'لوحة مدير الحوكمة',
   '{"columns":12,"widgets":[{"id":"compliance-gauge","x":0,"y":0,"w":3,"h":2},{"id":"evidence-locker","x":3,"y":0,"w":3,"h":2},{"id":"risk-heatmap","x":6,"y":0,"w":3,"h":2},{"id":"audit-readiness","x":9,"y":0,"w":3,"h":2},{"id":"framework-coverage","x":0,"y":2,"w":6,"h":2},{"id":"compliance-trend","x":6,"y":2,"w":6,"h":2}]}',
   'grc_owner', 14, '*', '/dashboard/role_grc_owner', 'role', 'shield', 'Full program view for GRC owners'),

  ('role_control_owner', 'Control Owner Dashboard', 'لوحة مالك الضوابط',
   '{"columns":12,"widgets":[{"id":"control-progress","x":0,"y":0,"w":6,"h":2},{"id":"evidence-locker","x":6,"y":0,"w":6,"h":2},{"id":"remediation-velocity","x":0,"y":2,"w":6,"h":1}]}',
   'control_owner', 15, '*', '/dashboard/role_control_owner', 'role', 'wrench', 'My controls, evidence due, remediation tasks'),

  ('role_auditor', 'Auditor Dashboard', 'لوحة المدقق',
   '{"columns":12,"widgets":[{"id":"audit-readiness","x":0,"y":0,"w":4,"h":2},{"id":"findings-bar","x":4,"y":0,"w":8,"h":2},{"id":"evidence-locker","x":0,"y":2,"w":6,"h":2}]}',
   'auditor', 16, '*', '/dashboard/role_auditor', 'role', 'verified', 'Test plans, evidence review, findings')

ON CONFLICT (dashboard_code) DO NOTHING;

-- ── 3. Update existing widget_registry with component_key ────────────────────

UPDATE widget_registry SET component_key = 'RiskHeatmapWidget', module_code = 'risk', data_endpoint = '/api/dashboard/risks' WHERE widget_key = 'risk_heatmap' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'ComplianceScoreWidget', module_code = 'compliance', data_endpoint = '/api/dashboard' WHERE widget_key = 'compliance_score' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'ComplianceOverviewWidget', module_code = 'compliance' WHERE widget_key = 'compliance_overview' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'ExecutiveSummaryWidget', module_code = '*' WHERE widget_key = 'executive_summary' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'AuditReadinessWidget', module_code = 'audit', data_endpoint = '/api/dashboard/audit-pack' WHERE widget_key = 'audit_readiness' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'ControlProgressWidget', module_code = 'compliance', data_endpoint = '/api/dashboard/controls' WHERE widget_key = 'control_progress' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'EvidenceLockerWidget', module_code = 'evidence', data_endpoint = '/api/dashboard/evidence-queue' WHERE widget_key = 'evidence_locker' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'FrameworkCoverageWidget', module_code = 'compliance', data_endpoint = '/api/dashboard/frameworks' WHERE widget_key = 'framework_coverage' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'RiskSummaryWidget', module_code = 'risk', data_endpoint = '/api/dashboard/risks' WHERE widget_key = 'risk_summary' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'VendorRiskWidget', module_code = 'vendor', data_endpoint = '/api/dashboard/risks' WHERE widget_key = 'vendor_risk' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'IncidentTrackerWidget', module_code = 'incident' WHERE widget_key = 'incident_tracker' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'PolicyScorecardWidget', module_code = 'governance' WHERE widget_key = 'policy_scorecard' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'ComplianceTrendWidget', module_code = 'compliance' WHERE widget_key = 'compliance_trend' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'RiskDistributionWidget', module_code = 'risk' WHERE widget_key = 'risk_distribution' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'FrameworkRadarWidget', module_code = 'compliance' WHERE widget_key = 'framework_radar' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'MaturityGaugeWidget', module_code = '*' WHERE widget_key = 'maturity_gauge' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'EvidenceFreshnessWidget', module_code = 'evidence' WHERE widget_key = 'evidence_freshness' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'AssessmentProgressWidget', module_code = 'audit' WHERE widget_key = 'assessment_progress' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'TopRisksWidget', module_code = 'risk', data_endpoint = '/api/dashboard/risk-prediction' WHERE widget_key = 'top_risks' AND component_key IS NULL;
UPDATE widget_registry SET component_key = 'AISummaryWidget', module_code = '*', data_endpoint = '/api/dashboard/ai-summary' WHERE widget_key = 'ai_summary' AND component_key IS NULL;

-- ── 4. Insert additional widgets ─────────────────────────────────────────────

INSERT INTO widget_registry (widget_key, label_en, label_ar, category, default_width, default_height, sort_order, component_key, module_code, data_endpoint)
VALUES
  ('program_health',       'Program Health',        'صحة البرنامج',         'overview',    3, 2, 21, 'ProgramHealthWidget',      '*',          '/api/dashboard/program-health'),
  ('exceptions_aging',     'Exceptions Aging',      'تقادم الاستثناءات',    'compliance',  4, 1, 22, 'ExceptionsAgingWidget',    'compliance',  '/api/dashboard/exceptions-aging'),
  ('control_drift',        'Control Drift',         'انحراف الضوابط',       'compliance',  4, 1, 23, 'ControlDriftWidget',       'compliance',  '/api/dashboard/control-drift'),
  ('evidence_queue',       'Evidence Queue',        'قائمة الأدلة المعلقة',  'evidence',    4, 2, 24, 'EvidenceQueueWidget',      'evidence',    '/api/dashboard/evidence-queue'),
  ('remediation_velocity', 'Remediation Velocity',  'سرعة المعالجة',        'compliance',  6, 1, 25, 'RemediationVelocityWidget','compliance',  NULL),
  ('momentum_indicator',   'Momentum Indicator',    'مؤشر الزخم',           'overview',    3, 1, 26, 'MomentumIndicatorWidget',  '*',           NULL),
  ('findings_bar',         'Findings Bar Chart',    'مخطط النتائج',          'audit',       6, 2, 27, 'FindingsBarWidget',        'audit',       NULL),
  ('bcp_status',           'BCP Status',            'حالة استمرارية الأعمال', 'incident',    4, 1, 28, 'BcpStatusWidget',          'incident',    NULL),
  ('compliance_gauge',     'Compliance Gauge',      'مقياس الامتثال',        'compliance',  3, 2, 29, 'ComplianceGaugeWidget',    'compliance',  '/api/dashboard'),
  ('activity_feed',        'Activity Feed',         'موجز النشاط',          'overview',    6, 2, 30, 'ActivityFeedWidget',       '*',           NULL)
ON CONFLICT (widget_key) DO NOTHING;

-- ── 5. Seed dashboard_role_bindings ──────────────────────────────────────────

INSERT INTO dashboard_role_bindings (dashboard_code, role_code, is_default, sort_order) VALUES
  -- Everyone can see big_picture
  ('big_picture',        '*',               TRUE,  1),
  -- Executive/owner roles
  ('executive',          'owner',           TRUE,  1),
  ('executive',          'tenant_admin',    TRUE,  1),
  ('executive',          'approver',        FALSE, 2),
  -- GRC owner
  ('role_grc_owner',     'compliance_officer', TRUE, 1),
  ('role_grc_owner',     'risk_manager',    TRUE,  1),
  ('role_grc_owner',     'admin',           FALSE, 2),
  -- Control owner
  ('role_control_owner', 'manager',         TRUE,  1),
  ('role_control_owner', 'user',            TRUE,  1),
  -- Auditor
  ('role_auditor',       'auditor',         TRUE,  1),
  -- Hub dashboards — all roles can access
  ('compliance_ops',     '*',               FALSE, 10),
  ('risk_ops',           '*',               FALSE, 11),
  ('evidence_ops',       '*',               FALSE, 12),
  ('audit_ops',          '*',               FALSE, 13),
  ('governance_hub',     '*',               FALSE, 14),
  ('incident_hub',       '*',               FALSE, 15),
  ('vendor_hub',         '*',               FALSE, 16),
  ('ai_suite',           '*',               FALSE, 17)
ON CONFLICT (dashboard_code, role_code) DO NOTHING;
