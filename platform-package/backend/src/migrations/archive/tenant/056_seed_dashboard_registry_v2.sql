BEGIN;

INSERT INTO dashboard_widget_registry
(widget_key, label_en, label_ar, module_code, component_key, default_width, default_height, default_config, is_system, is_active, sort_order)
VALUES
('executive-summary', 'Executive Summary', 'الملخص التنفيذي', 'dashboard', 'executive-summary-widget', 6, 3, '{}'::jsonb, true, true, 10),
('risk-heatmap', 'Risk Heatmap', 'الخريطة الحرارية للمخاطر', 'risk', 'risk-heatmap-widget', 6, 4, '{}'::jsonb, true, true, 20),
('overdue-actions', 'Overdue Actions', 'الإجراءات المتأخرة', 'governance', 'overdue-actions-widget', 6, 3, '{}'::jsonb, true, true, 30),
('audit-exposure', 'Audit Exposure', 'تعرض التدقيق', 'audit', 'audit-exposure-widget', 6, 3, '{}'::jsonb, true, true, 40),
('privacy-incidents', 'Privacy Incidents', 'حوادث الخصوصية', 'privacy', 'privacy-incidents-widget', 6, 3, '{}'::jsonb, true, true, 50),
('maturity-score', 'Maturity Score', 'درجة النضج', 'qiyas', 'maturity-score-widget', 6, 3, '{}'::jsonb, true, true, 60),
('assessment-progress', 'Assessment Progress', 'تقدم التقييم', 'qiyas', 'assessment-progress-widget', 6, 3, '{}'::jsonb, true, true, 70),
('recommendations', 'Recommendations', 'التوصيات', 'qiyas', 'recommendations-widget', 6, 4, '{}'::jsonb, true, true, 80),
('evidence-coverage', 'Evidence Coverage', 'تغطية الأدلة', 'evidence', 'evidence-coverage-widget', 6, 3, '{}'::jsonb, true, true, 90),
('kri-status', 'KRI Status', 'حالة مؤشرات المخاطر', 'risk', 'kri-status-widget', 6, 3, '{}'::jsonb, true, true, 100)
ON CONFLICT (widget_key) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  module_code = EXCLUDED.module_code,
  component_key = EXCLUDED.component_key,
  default_width = EXCLUDED.default_width,
  default_height = EXCLUDED.default_height,
  default_config = EXCLUDED.default_config,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO dashboard_registry
(dashboard_code, name_en, name_ar, audience, module_code, route, layout, default_filters, is_system, is_active, sort_order)
VALUES
(
  'agrc-executive',
  'AGRC Executive Dashboard',
  'لوحة القيادة التنفيذية للحوكمة والمخاطر والامتثال',
  'executive_owner',
  'dashboard',
  '/executive/overview',
  '{"version":1,"widgets":[{"widgetKey":"executive-summary","x":0,"y":0,"w":6,"h":3,"config":{}},{"widgetKey":"risk-heatmap","x":6,"y":0,"w":6,"h":4,"config":{}},{"widgetKey":"overdue-actions","x":0,"y":4,"w":6,"h":3,"config":{}},{"widgetKey":"audit-exposure","x":6,"y":4,"w":6,"h":3,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 10
),
(
  'government-command',
  'Government Command Dashboard',
  'لوحة القيادة الحكومية',
  'executive_owner',
  'dashboard',
  '/executive/overview',
  '{"version":1,"widgets":[{"widgetKey":"executive-summary","x":0,"y":0,"w":6,"h":3,"config":{}},{"widgetKey":"overdue-actions","x":6,"y":0,"w":6,"h":3,"config":{}},{"widgetKey":"risk-heatmap","x":0,"y":3,"w":12,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 20
),
(
  'risk-operations',
  'Risk Operations Dashboard',
  'لوحة عمليات المخاطر',
  'risk_manager',
  'risk',
  '/risk/register',
  '{"version":1,"widgets":[{"widgetKey":"risk-heatmap","x":0,"y":0,"w":8,"h":4,"config":{}},{"widgetKey":"kri-status","x":8,"y":0,"w":4,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 30
),
(
  'audit-evidence',
  'Audit & Evidence Dashboard',
  'لوحة التدقيق والأدلة',
  'auditor',
  'audit',
  '/audit/engagements',
  '{"version":1,"widgets":[{"widgetKey":"audit-exposure","x":0,"y":0,"w":6,"h":3,"config":{}},{"widgetKey":"evidence-coverage","x":6,"y":0,"w":6,"h":3,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 40
),
(
  'privacy-assurance',
  'Privacy Assurance Dashboard',
  'لوحة ضمان الخصوصية',
  'privacy_officer',
  'privacy',
  '/privacy/overview',
  '{"version":1,"widgets":[{"widgetKey":"privacy-incidents","x":0,"y":0,"w":6,"h":3,"config":{}},{"widgetKey":"evidence-coverage","x":6,"y":0,"w":6,"h":3,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 50
),
(
  'qiyas-executive',
  'Qiyas Executive Dashboard',
  'لوحة قياس التنفيذية',
  'assessment_lead',
  'qiyas',
  '/qiyas/overview',
  '{"version":1,"widgets":[{"widgetKey":"maturity-score","x":0,"y":0,"w":4,"h":3,"config":{}},{"widgetKey":"assessment-progress","x":4,"y":0,"w":4,"h":3,"config":{}},{"widgetKey":"recommendations","x":8,"y":0,"w":4,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 60
)
ON CONFLICT (dashboard_code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  audience = EXCLUDED.audience,
  module_code = EXCLUDED.module_code,
  route = EXCLUDED.route,
  layout = EXCLUDED.layout,
  default_filters = EXCLUDED.default_filters,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO dashboard_role_bindings
(dashboard_code, role_code, is_default, is_allowed)
VALUES
('agrc-executive', 'executive_owner', true, true),
('government-command', 'executive_owner', false, true),
('risk-operations', 'risk_manager', true, true),
('audit-evidence', 'auditor', true, true),
('privacy-assurance', 'privacy_officer', true, true),
('qiyas-executive', 'assessment_lead', true, true)
ON CONFLICT (dashboard_code, role_code) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  is_allowed = EXCLUDED.is_allowed;

COMMIT;
