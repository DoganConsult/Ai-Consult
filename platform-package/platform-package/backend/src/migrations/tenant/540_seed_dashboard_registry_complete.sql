BEGIN;

-- ============================================================================
-- Seed Dashboard Widget Registry for Missing Modules
-- ============================================================================

INSERT INTO dashboard_widget_registry
(widget_key, label_en, label_ar, module_code, component_key, default_width, default_height, default_config, is_system, is_active, sort_order)
VALUES
-- Remediation widgets (using overdue-actions-widget as remediation tracks overdue fixes)
('remediation-open-tasks', 'Open Remediation Tasks', 'مهام المعالجة المفتوحة', 'remediation', 'overdue-actions-widget', 4, 2, '{}'::jsonb, true, true, 110),
('remediation-completion-rate', 'Completion Rate', 'معدل الإنجاز', 'remediation', 'assessment-progress-widget', 4, 2, '{}'::jsonb, true, true, 120),
('remediation-overdue-count', 'Overdue Count', 'عدد المتأخرات', 'remediation', 'overdue-actions-widget', 4, 2, '{}'::jsonb, true, true, 130),
('remediation-timeline', 'Remediation Timeline', 'الجدول الزمني للمعالجة', 'remediation', 'engine-trend-widget', 12, 4, '{}'::jsonb, true, true, 140),

-- Action widgets (using overdue-actions-widget - perfect match!)
('action-open-items', 'Open Action Items', 'عناصر الإجراءات المفتوحة', 'action', 'overdue-actions-widget', 3, 2, '{}'::jsonb, true, true, 150),
('action-completed-items', 'Completed Items', 'العناصر المكتملة', 'action', 'assessment-progress-widget', 3, 2, '{}'::jsonb, true, true, 160),
('action-overdue-items', 'Overdue Items', 'العناصر المتأخرة', 'action', 'overdue-actions-widget', 3, 2, '{}'::jsonb, true, true, 170),
('action-by-owner', 'Actions by Owner', 'الإجراءات حسب المالك', 'action', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 180),
('action-timeline', 'Action Timeline', 'الجدول الزمني للإجراءات', 'action', 'engine-trend-widget', 12, 4, '{}'::jsonb, true, true, 190),

-- Exception widgets (using audit-exposure-widget as exceptions are audit-related)
('exception-pending-requests', 'Pending Exception Requests', 'طلبات الاستثناء المعلقة', 'exception', 'audit-exposure-widget', 4, 2, '{}'::jsonb, true, true, 200),
('exception-approved-count', 'Approved Exceptions', 'الاستثناءات المعتمدة', 'exception', 'audit-exposure-widget', 4, 2, '{}'::jsonb, true, true, 210),
('exception-expiring-soon', 'Expiring Soon', 'تنتهي قريباً', 'exception', 'policy-review-debt-widget', 4, 2, '{}'::jsonb, true, true, 220),
('exception-by-control', 'Exceptions by Control', 'الاستثناءات حسب الضابط', 'exception', 'audit-exposure-widget', 6, 4, '{}'::jsonb, true, true, 230),
('exception-timeline', 'Exception Timeline', 'الجدول الزمني للاستثناءات', 'exception', 'engine-trend-widget', 6, 4, '{}'::jsonb, true, true, 240),

-- BCP widgets (using risk-heatmap-widget as BCP is risk-related)
('bcp-active-plans', 'Active BCP Plans', 'خطط استمرارية الأعمال النشطة', 'bcp', 'risk-heatmap-widget', 4, 2, '{}'::jsonb, true, true, 250),
('bcp-test-status', 'Test Status', 'حالة الاختبار', 'bcp', 'assessment-progress-widget', 4, 2, '{}'::jsonb, true, true, 260),
('bcp-recovery-time', 'Recovery Time', 'وقت الاسترداد', 'bcp', 'kri-status-widget', 4, 2, '{}'::jsonb, true, true, 270),
('bcp-plan-coverage', 'Plan Coverage', 'تغطية الخطة', 'bcp', 'evidence-coverage-widget', 6, 4, '{}'::jsonb, true, true, 280),
('bcp-test-schedule', 'Test Schedule', 'جدول الاختبار', 'bcp', 'engine-trend-widget', 6, 4, '{}'::jsonb, true, true, 290),

-- Asset widgets (using risk-heatmap-widget as assets are risk-related)
('asset-total-count', 'Total Assets', 'إجمالي الأصول', 'asset', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 300),
('asset-by-classification', 'Assets by Classification', 'الأصول حسب التصنيف', 'asset', 'risk-heatmap-widget', 3, 2, '{}'::jsonb, true, true, 310),
('asset-critical-count', 'Critical Assets', 'الأصول الحرجة', 'asset', 'kri-status-widget', 3, 2, '{}'::jsonb, true, true, 320),
('asset-ownership-map', 'Ownership Map', 'خريطة الملكية', 'asset', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 330),
('asset-inventory-chart', 'Inventory Chart', 'مخطط المخزون', 'asset', 'risk-heatmap-widget', 6, 4, '{}'::jsonb, true, true, 340),
('asset-risk-exposure', 'Risk Exposure', 'التعرض للمخاطر', 'asset', 'risk-heatmap-widget', 6, 4, '{}'::jsonb, true, true, 350),

-- Foundation widgets (using executive-summary-widget for admin/foundation views)
('foundation-user-count', 'User Count', 'عدد المستخدمين', 'foundation', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 360),
('foundation-role-distribution', 'Role Distribution', 'توزيع الأدوار', 'foundation', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 370),
('foundation-org-structure', 'Organization Structure', 'هيكل المؤسسة', 'foundation', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 380),
('foundation-access-reviews', 'Access Reviews', 'مراجعات الوصول', 'foundation', 'audit-exposure-widget', 3, 2, '{}'::jsonb, true, true, 390),
('foundation-user-activity', 'User Activity', 'نشاط المستخدم', 'foundation', 'engine-trend-widget', 6, 4, '{}'::jsonb, true, true, 400),
('foundation-permission-matrix', 'Permission Matrix', 'مصفوفة الصلاحيات', 'foundation', 'executive-summary-widget', 6, 4, '{}'::jsonb, true, true, 410),

-- Reporting widgets (using engine widgets for analytics/reporting)
('reporting-scheduled-reports', 'Scheduled Reports', 'التقارير المجدولة', 'reporting', 'engine-executive-summary-widget', 4, 2, '{}'::jsonb, true, true, 420),
('reporting-generated-today', 'Generated Today', 'المولدة اليوم', 'reporting', 'engine-executive-summary-widget', 4, 2, '{}'::jsonb, true, true, 430),
('reporting-pending-approval', 'Pending Approval', 'في انتظار الموافقة', 'reporting', 'overdue-actions-widget', 4, 2, '{}'::jsonb, true, true, 440),
('reporting-report-catalog', 'Report Catalog', 'كتالوج التقارير', 'reporting', 'executive-summary-widget', 6, 4, '{}'::jsonb, true, true, 450),
('reporting-generation-timeline', 'Generation Timeline', 'الجدول الزمني للتوليد', 'reporting', 'engine-trend-widget', 6, 4, '{}'::jsonb, true, true, 460),

-- Training widgets (using assessment-progress-widget for training progress)
('training-active-campaigns', 'Active Campaigns', 'الحملات النشطة', 'training', 'assessment-progress-widget', 4, 2, '{}'::jsonb, true, true, 470),
('training-completion-rate', 'Completion Rate', 'معدل الإنجاز', 'training', 'assessment-progress-widget', 4, 2, '{}'::jsonb, true, true, 480),
('training-overdue-training', 'Overdue Training', 'التدريب المتأخر', 'training', 'overdue-actions-widget', 4, 2, '{}'::jsonb, true, true, 490),
('training-campaign-progress', 'Campaign Progress', 'تقدم الحملة', 'training', 'assessment-progress-widget', 6, 4, '{}'::jsonb, true, true, 500),
('training-by-department', 'Training by Department', 'التدريب حسب القسم', 'training', 'executive-summary-widget', 6, 4, '{}'::jsonb, true, true, 510),

-- Qiyas widgets (using maturity-score-widget and assessment-progress-widget - perfect match!)
('qiyas-active-assessments', 'Active Assessments', 'التقييمات النشطة', 'qiyas', 'assessment-progress-widget', 4, 2, '{}'::jsonb, true, true, 520),
('qiyas-average-score', 'Average Score', 'الدرجة المتوسطة', 'qiyas', 'maturity-score-widget', 4, 2, '{}'::jsonb, true, true, 530),
('qiyas-completion-rate', 'Completion Rate', 'معدل الإنجاز', 'qiyas', 'assessment-progress-widget', 4, 2, '{}'::jsonb, true, true, 540),
('qiyas-score-trend', 'Score Trend', 'اتجاه الدرجة', 'qiyas', 'engine-trend-widget', 6, 4, '{}'::jsonb, true, true, 550),
('qiyas-by-framework', 'Assessments by Framework', 'التقييمات حسب الإطار', 'qiyas', 'maturity-score-widget', 6, 4, '{}'::jsonb, true, true, 560),

-- Integrations widgets (using executive-summary-widget for admin/system views)
('integrations-active-connectors', 'Active Connectors', 'الموصلات النشطة', 'integrations', 'executive-summary-widget', 4, 2, '{}'::jsonb, true, true, 570),
('integrations-connection-status', 'Connection Status', 'حالة الاتصال', 'integrations', 'kri-status-widget', 4, 2, '{}'::jsonb, true, true, 580),
('integrations-sync-errors', 'Sync Errors', 'أخطاء المزامنة', 'integrations', 'audit-exposure-widget', 4, 2, '{}'::jsonb, true, true, 590),
('integrations-connector-status', 'Connector Status', 'حالة الموصل', 'integrations', 'kri-status-widget', 6, 4, '{}'::jsonb, true, true, 600),
('integrations-sync-timeline', 'Sync Timeline', 'الجدول الزمني للمزامنة', 'integrations', 'engine-trend-widget', 6, 4, '{}'::jsonb, true, true, 610),

-- Admin widgets (using executive-summary-widget for admin views)
('admin-access-reviews', 'Access Reviews', 'مراجعات الوصول', 'admin', 'audit-exposure-widget', 4, 2, '{}'::jsonb, true, true, 620),
('admin-user-activity', 'User Activity', 'نشاط المستخدم', 'admin', 'engine-trend-widget', 4, 2, '{}'::jsonb, true, true, 630),
('admin-system-health', 'System Health', 'صحة النظام', 'admin', 'kri-status-widget', 4, 2, '{}'::jsonb, true, true, 640),
('admin-configuration-status', 'Configuration Status', 'حالة التكوين', 'admin', 'executive-summary-widget', 6, 4, '{}'::jsonb, true, true, 650),
('admin-audit-log-summary', 'Audit Log Summary', 'ملخص سجل التدقيق', 'admin', 'audit-exposure-widget', 6, 4, '{}'::jsonb, true, true, 660),

-- Notification widgets (using executive-summary-widget as fallback - activity-feed not in DASHBOARD_WIDGET_COMPONENTS)
('notification-unread-count', 'Unread Notifications', 'الإشعارات غير المقروءة', 'notification', 'executive-summary-widget', 4, 2, '{}'::jsonb, true, true, 670),
('notification-by-type', 'Notifications by Type', 'الإشعارات حسب النوع', 'notification', 'executive-summary-widget', 4, 2, '{}'::jsonb, true, true, 680),
('notification-priority-queue', 'Priority Queue', 'قائمة الأولويات', 'notification', 'overdue-actions-widget', 4, 2, '{}'::jsonb, true, true, 690),
('notification-feed', 'Notification Feed', 'خلاصة الإشعارات', 'notification', 'executive-summary-widget', 12, 4, '{}'::jsonb, true, true, 700),

-- Analytics widgets (using engine-trend-widget for analytics/trends)
('analytics-compliance-trends', 'Compliance Trends', 'اتجاهات الامتثال', 'analytics', 'engine-trend-widget', 6, 3, '{}'::jsonb, true, true, 710),
('analytics-risk-trends', 'Risk Trends', 'اتجاهات المخاطر', 'analytics', 'engine-trend-widget', 6, 3, '{}'::jsonb, true, true, 720),
('analytics-evidence-metrics', 'Evidence Metrics', 'مقاييس الأدلة', 'analytics', 'evidence-coverage-widget', 4, 3, '{}'::jsonb, true, true, 730),
('analytics-audit-metrics', 'Audit Metrics', 'مقاييس التدقيق', 'analytics', 'audit-exposure-widget', 4, 3, '{}'::jsonb, true, true, 740),
('analytics-predictive-insights', 'Predictive Insights', 'الرؤى التنبؤية', 'analytics', 'engine-executive-summary-widget', 4, 3, '{}'::jsonb, true, true, 750),

-- Team widgets (using executive-summary-widget for team management)
('team-total-teams', 'Total Teams', 'إجمالي الفرق', 'team', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 760),
('team-total-members', 'Total Members', 'إجمالي الأعضاء', 'team', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 770),
('team-by-department', 'Teams by Department', 'الفرق حسب القسم', 'team', 'executive-summary-widget', 3, 2, '{}'::jsonb, true, true, 780),
('team-assignment-coverage', 'Assignment Coverage', 'تغطية التعيين', 'team', 'evidence-coverage-widget', 3, 2, '{}'::jsonb, true, true, 790),
('team-structure-tree', 'Team Structure', 'هيكل الفريق', 'team', 'executive-summary-widget', 6, 4, '{}'::jsonb, true, true, 800),
('team-workload-distribution', 'Workload Distribution', 'توزيع عبء العمل', 'team', 'executive-summary-widget', 6, 4, '{}'::jsonb, true, true, 810),

-- Workflow widgets (using overdue-actions-widget for workflow status)
('workflow-active-instances', 'Active Workflows', 'سير العمل النشط', 'workflow', 'overdue-actions-widget', 4, 2, '{}'::jsonb, true, true, 820),
('workflow-completed-today', 'Completed Today', 'المكتملة اليوم', 'workflow', 'assessment-progress-widget', 4, 2, '{}'::jsonb, true, true, 830),
('workflow-pending-approvals', 'Pending Approvals', 'الموافقات المعلقة', 'workflow', 'overdue-actions-widget', 4, 2, '{}'::jsonb, true, true, 840),
('workflow-execution-timeline', 'Execution Timeline', 'الجدول الزمني للتنفيذ', 'workflow', 'engine-trend-widget', 6, 4, '{}'::jsonb, true, true, 850),
('workflow-sla-compliance', 'SLA Compliance', 'امتثال SLA', 'workflow', 'kri-status-widget', 6, 4, '{}'::jsonb, true, true, 860),

-- Policy widgets (using policy-review-debt-widget - perfect match!)
('policy-total-policies', 'Total Policies', 'إجمالي السياسات', 'policy', 'policy-review-debt-widget', 3, 2, '{}'::jsonb, true, true, 870),
('policy-pending-review', 'Pending Review', 'في انتظار المراجعة', 'policy', 'policy-review-debt-widget', 3, 2, '{}'::jsonb, true, true, 880),
('policy-expiring-soon', 'Expiring Soon', 'تنتهي قريباً', 'policy', 'policy-review-debt-widget', 3, 2, '{}'::jsonb, true, true, 890),
('policy-approval-queue', 'Approval Queue', 'قائمة الموافقة', 'policy', 'overdue-actions-widget', 3, 2, '{}'::jsonb, true, true, 900),
('policy-lifecycle-status', 'Lifecycle Status', 'حالة دورة الحياة', 'policy', 'policy-review-debt-widget', 6, 4, '{}'::jsonb, true, true, 910),
('policy-review-schedule', 'Review Schedule', 'جدول المراجعة', 'policy', 'policy-review-debt-widget', 6, 4, '{}'::jsonb, true, true, 920)
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

-- ============================================================================
-- Seed Dashboard Registry for Missing Modules
-- ============================================================================

INSERT INTO dashboard_registry
(dashboard_code, name_en, name_ar, audience, module_code, route, layout, default_filters, is_system, is_active, sort_order)
VALUES
-- Remediation Hub
(
  'remediation_hub',
  'Remediation Operations',
  'عمليات المعالجة',
  'compliance_officer',
  'remediation',
  '/remediation',
  '{"version":1,"widgets":[{"widgetKey":"remediation-open-tasks","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"remediation-completion-rate","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"remediation-overdue-count","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"remediation-timeline","x":0,"y":2,"w":12,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 110
),
-- Action Hub
(
  'action_hub',
  'Action Items',
  'عناصر الإجراءات',
  'compliance_officer',
  'action',
  '/action',
  '{"version":1,"widgets":[{"widgetKey":"action-open-items","x":0,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"action-completed-items","x":3,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"action-overdue-items","x":6,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"action-by-owner","x":9,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"action-timeline","x":0,"y":2,"w":12,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 120
),
-- Exception Hub
(
  'exception_hub',
  'Exception Management',
  'إدارة الاستثناءات',
  'compliance_officer',
  'exception',
  '/exception',
  '{"version":1,"widgets":[{"widgetKey":"exception-pending-requests","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"exception-approved-count","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"exception-expiring-soon","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"exception-by-control","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"exception-timeline","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 130
),
-- BCP Hub
(
  'bcp_hub',
  'Business Continuity',
  'استمرارية الأعمال',
  'risk_owner',
  'bcp',
  '/bcp',
  '{"version":1,"widgets":[{"widgetKey":"bcp-active-plans","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"bcp-test-status","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"bcp-recovery-time","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"bcp-plan-coverage","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"bcp-test-schedule","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 140
),
-- Asset Hub
(
  'asset_hub',
  'Asset Management',
  'إدارة الأصول',
  'risk_owner',
  'asset',
  '/asset',
  '{"version":1,"widgets":[{"widgetKey":"asset-total-count","x":0,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"asset-by-classification","x":3,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"asset-critical-count","x":6,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"asset-ownership-map","x":9,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"asset-inventory-chart","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"asset-risk-exposure","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 150
),
-- Foundation Hub
(
  'foundation_hub',
  'Foundation & Administration',
  'الأساسيات والإدارة',
  'grc_manager',
  'foundation',
  '/foundation',
  '{"version":1,"widgets":[{"widgetKey":"foundation-user-count","x":0,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"foundation-role-distribution","x":3,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"foundation-org-structure","x":6,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"foundation-access-reviews","x":9,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"foundation-user-activity","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"foundation-permission-matrix","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 160
),
-- Reporting Hub
(
  'reporting_hub',
  'Reporting Center',
  'مركز التقارير',
  'compliance_officer',
  'reporting',
  '/reporting',
  '{"version":1,"widgets":[{"widgetKey":"reporting-scheduled-reports","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"reporting-generated-today","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"reporting-pending-approval","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"reporting-report-catalog","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"reporting-generation-timeline","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 170
),
-- Training Hub
(
  'training_hub',
  'Training & Awareness',
  'التدريب والتوعية',
  'grc_manager',
  'training',
  '/training',
  '{"version":1,"widgets":[{"widgetKey":"training-active-campaigns","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"training-completion-rate","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"training-overdue-training","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"training-campaign-progress","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"training-by-department","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 180
),
-- Qiyas Hub
(
  'qiyas_hub',
  'Qiyas Assessments',
  'تقييمات قياس',
  'grc_manager',
  'qiyas',
  '/qiyas',
  '{"version":1,"widgets":[{"widgetKey":"qiyas-active-assessments","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"qiyas-average-score","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"qiyas-completion-rate","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"qiyas-score-trend","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"qiyas-by-framework","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 190
),
-- Integrations Hub
(
  'integrations_hub',
  'Integrations & Connectors',
  'التكاملات والموصلات',
  'grc_manager',
  'integrations',
  '/integrations',
  '{"version":1,"widgets":[{"widgetKey":"integrations-active-connectors","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"integrations-connection-status","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"integrations-sync-errors","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"integrations-connector-status","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"integrations-sync-timeline","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 200
),
-- Admin Hub
(
  'admin_hub',
  'Administration',
  'الإدارة',
  'platform_admin',
  'admin',
  '/admin',
  '{"version":1,"widgets":[{"widgetKey":"admin-access-reviews","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"admin-user-activity","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"admin-system-health","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"admin-configuration-status","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"admin-audit-log-summary","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 210
),
-- Notification Hub
(
  'notification_hub',
  'Notifications',
  'الإشعارات',
  '*',
  'notification',
  '/notification',
  '{"version":1,"widgets":[{"widgetKey":"notification-unread-count","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"notification-by-type","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"notification-priority-queue","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"notification-feed","x":0,"y":2,"w":12,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 220
),
-- Analytics Hub
(
  'analytics_hub',
  'Analytics & Insights',
  'التحليلات والرؤى',
  'compliance_officer',
  'analytics',
  '/analytics',
  '{"version":1,"widgets":[{"widgetKey":"analytics-compliance-trends","x":0,"y":0,"w":6,"h":3,"config":{}},{"widgetKey":"analytics-risk-trends","x":6,"y":0,"w":6,"h":3,"config":{}},{"widgetKey":"analytics-evidence-metrics","x":0,"y":3,"w":4,"h":3,"config":{}},{"widgetKey":"analytics-audit-metrics","x":4,"y":3,"w":4,"h":3,"config":{}},{"widgetKey":"analytics-predictive-insights","x":8,"y":3,"w":4,"h":3,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 230
),
-- Team Hub
(
  'team_hub',
  'Team Management',
  'إدارة الفرق',
  'grc_manager',
  'team',
  '/team',
  '{"version":1,"widgets":[{"widgetKey":"team-total-teams","x":0,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"team-total-members","x":3,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"team-by-department","x":6,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"team-assignment-coverage","x":9,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"team-structure-tree","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"team-workload-distribution","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 240
),
-- Workflow Hub
(
  'workflow_hub',
  'Workflow Operations',
  'عمليات سير العمل',
  'compliance_officer',
  'workflow',
  '/workflow',
  '{"version":1,"widgets":[{"widgetKey":"workflow-active-instances","x":0,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"workflow-completed-today","x":4,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"workflow-pending-approvals","x":8,"y":0,"w":4,"h":2,"config":{}},{"widgetKey":"workflow-execution-timeline","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"workflow-sla-compliance","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 250
),
-- Policy Hub
(
  'policy_hub',
  'Policy Management',
  'إدارة السياسات',
  'compliance_officer',
  'policy',
  '/policy',
  '{"version":1,"widgets":[{"widgetKey":"policy-total-policies","x":0,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"policy-pending-review","x":3,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"policy-expiring-soon","x":6,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"policy-approval-queue","x":9,"y":0,"w":3,"h":2,"config":{}},{"widgetKey":"policy-lifecycle-status","x":0,"y":2,"w":6,"h":4,"config":{}},{"widgetKey":"policy-review-schedule","x":6,"y":2,"w":6,"h":4,"config":{}}]}'::jsonb,
  '{}'::jsonb, true, true, 260
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

-- ============================================================================
-- Seed Dashboard Role Bindings
-- ============================================================================

INSERT INTO dashboard_role_bindings
(dashboard_code, role_code, is_default, is_allowed)
VALUES
('remediation_hub', 'compliance_officer', true, true),
('remediation_hub', 'risk_owner', false, true),
('action_hub', 'compliance_officer', true, true),
('action_hub', 'risk_owner', false, true),
('exception_hub', 'compliance_officer', true, true),
('exception_hub', 'grc_manager', false, true),
('bcp_hub', 'risk_owner', true, true),
('bcp_hub', 'compliance_officer', false, true),
('asset_hub', 'risk_owner', true, true),
('asset_hub', 'compliance_officer', false, true),
('foundation_hub', 'grc_manager', true, true),
('foundation_hub', 'platform_admin', false, true),
('reporting_hub', 'compliance_officer', true, true),
('reporting_hub', 'risk_owner', false, true),
('reporting_hub', 'auditor', false, true),
('training_hub', 'grc_manager', true, true),
('training_hub', 'compliance_officer', false, true),
('qiyas_hub', 'grc_manager', true, true),
('qiyas_hub', 'compliance_officer', false, true),
('integrations_hub', 'grc_manager', true, true),
('integrations_hub', 'platform_admin', false, true),
('admin_hub', 'platform_admin', true, true),
('admin_hub', 'executive_owner', false, true),
('notification_hub', '*', true, true),
('analytics_hub', 'compliance_officer', true, true),
('analytics_hub', 'risk_owner', false, true),
('analytics_hub', 'auditor', false, true),
('team_hub', 'grc_manager', true, true),
('team_hub', 'compliance_officer', false, true),
('workflow_hub', 'compliance_officer', true, true),
('workflow_hub', 'risk_owner', false, true),
('policy_hub', 'compliance_officer', true, true),
('policy_hub', 'grc_manager', false, true)
ON CONFLICT (dashboard_code, role_code) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  is_allowed = EXCLUDED.is_allowed;

COMMIT;
