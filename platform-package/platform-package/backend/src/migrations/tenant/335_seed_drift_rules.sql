-- =============================================
-- Tenant Migration 285: Seed Compliance Drift Rules
-- Phase 2, Step 2.1: 17 built-in rules across
-- all 8 drift categories
-- Regulatory: ISO 27001, SOC 2, NCA ECC,
--             DORA, EU AI Act, Gartner TRiSM
-- =============================================

INSERT INTO compliance_drift_rules (
  rule_code, name_en, name_ar, category,
  detection_query, expected_state, severity,
  check_interval_minutes, auto_remediate, remediation_action,
  framework_refs, detection_mode, enforcement_action,
  impact_score_formula, escalation_target, is_active
) VALUES

-- =========================================
-- PERMISSION rules (PERM-001 .. PERM-003)
-- =========================================
(
  'PERM-001',
  'Unbundled Permission Detected',
  'اكتشاف إذن غير مجمّع',
  'permission',
  E'SELECT u.id AS entity_id, up.permission_code\n FROM user_permissions up\n JOIN users u ON u.id = up.user_id\n LEFT JOIN bundle_permissions bp\n   ON bp.permission_code = up.permission_code\n   AND bp.bundle_id IN (SELECT bundle_id FROM user_bundles WHERE user_id = u.id AND is_active)\n WHERE bp.id IS NULL\n   AND up.is_active = TRUE;',
  '{"all_permissions_in_active_bundle": true}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['ISO 27001 A.5.15'],
  'scheduled',
  'warn',
  'count(affected_users) * 2.0',
  NULL,
  TRUE
),
(
  'PERM-002',
  'Orphaned Account With Active Permissions',
  'حساب يتيم بأذونات نشطة',
  'permission',
  E'SELECT u.id AS entity_id, u.email, u.last_login_at\n FROM users u\n JOIN user_permissions up ON up.user_id = u.id AND up.is_active = TRUE\n WHERE u.last_login_at < NOW() - INTERVAL ''30 days''\n   AND u.is_active = TRUE;',
  '{"inactive_users_have_no_permissions": true, "max_inactive_days": 30}',
  'critical',
  15,
  FALSE,
  'Disable user permissions and notify admin',
  ARRAY['SOC 2 CC6'],
  'scheduled',
  'escalate',
  'count(orphaned_accounts) * 5.0',
  'security_officer',
  TRUE
),
(
  'PERM-003',
  'Access Review Overdue',
  'مراجعة الوصول متأخرة',
  'permission',
  E'SELECT u.id AS entity_id, u.email,\n       ar.last_review_at,\n       NOW() - ar.last_review_at AS overdue_interval\n FROM users u\n LEFT JOIN access_reviews ar ON ar.user_id = u.id\n WHERE ar.last_review_at IS NULL\n    OR ar.last_review_at < NOW() - INTERVAL ''90 days'';',
  '{"max_days_since_last_review": 90}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['SOC 2 CC6.1'],
  'scheduled',
  'warn',
  'count(overdue_reviews) * 1.5',
  NULL,
  TRUE
),

-- =========================================
-- CONTROL rules (CTRL-001 .. CTRL-002)
-- =========================================
(
  'CTRL-001',
  'Implemented Control Without Recent Evidence',
  'ضابط منفّذ بدون دليل حديث',
  'control',
  E'SELECT c.id AS entity_id, c.control_code, c.title_en\n FROM controls c\n LEFT JOIN evidence e ON e.control_id = c.id\n   AND e.created_at > NOW() - INTERVAL ''90 days''\n WHERE c.implementation_status = ''implemented''\n   AND e.id IS NULL;',
  '{"implemented_controls_have_evidence_within_days": 90}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['ISO 27001 A.8.16'],
  'scheduled',
  'warn',
  'count(stale_controls) * 3.0',
  NULL,
  TRUE
),
(
  'CTRL-002',
  'Open Nonconformity Exceeding SLA',
  'عدم مطابقة مفتوحة تجاوزت اتفاقية مستوى الخدمة',
  'control',
  E'SELECT nc.id AS entity_id, nc.reference_code,\n       nc.created_at,\n       NOW() - nc.created_at AS age\n FROM nonconformities nc\n WHERE nc.status = ''open''\n   AND nc.created_at < NOW() - INTERVAL ''30 days'';',
  '{"max_open_nonconformity_days": 30}',
  'critical',
  15,
  FALSE,
  'Escalate to compliance manager and create corrective action',
  ARRAY['NCA ECC 2-1'],
  'scheduled',
  'escalate',
  'count(overdue_ncs) * 5.0 + sum(severity_weight)',
  'compliance_manager',
  TRUE
),

-- =========================================
-- POLICY rules (PLCY-001 .. PLCY-002)
-- =========================================
(
  'PLCY-001',
  'Policy Without Attestation in 365 Days',
  'سياسة بدون إقرار خلال 365 يوماً',
  'policy',
  E'SELECT p.id AS entity_id, p.policy_code, p.title_en\n FROM policies p\n LEFT JOIN policy_attestations pa ON pa.policy_id = p.id\n   AND pa.attested_at > NOW() - INTERVAL ''365 days''\n WHERE p.status = ''approved''\n   AND pa.id IS NULL;',
  '{"approved_policies_attested_within_days": 365}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['ISO 27001 A.5.36'],
  'scheduled',
  'warn',
  'count(unattested_policies) * 2.0',
  NULL,
  TRUE
),
(
  'PLCY-002',
  'Policy Not Reviewed After Significant Change',
  'سياسة لم تُراجَع بعد تغيير جوهري',
  'policy',
  E'SELECT p.id AS entity_id, p.policy_code,\n       ce.event_type, ce.occurred_at\n FROM policies p\n JOIN change_events ce ON ce.entity_type = ''policy''\n   AND ce.entity_id = p.id\n   AND ce.significance = ''major''\n WHERE ce.occurred_at > p.last_reviewed_at\n   AND p.status = ''approved'';',
  '{"policy_reviewed_after_significant_change": true}',
  'critical',
  15,
  FALSE,
  'Flag policy for immediate review and notify policy owner',
  ARRAY['ISO 27001 A.5.1'],
  'scheduled',
  'escalate',
  'count(unreviewed_policies) * 4.0',
  'policy_owner',
  TRUE
),

-- =========================================
-- CONFIG rules (CONF-001 .. CONF-002)
-- =========================================
(
  'CONF-001',
  'Workspace Enforcement Mode Changed From Blueprint',
  'تغيير وضع التطبيق في مساحة العمل عن المخطط',
  'config',
  E'SELECT w.id AS entity_id, w.workspace_code,\n       w.enforcement_mode AS actual,\n       bp.enforcement_mode AS expected\n FROM workspaces w\n JOIN workspace_blueprints bp ON bp.id = w.blueprint_id\n WHERE w.enforcement_mode <> bp.enforcement_mode;',
  '{"enforcement_mode_matches_blueprint": true}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['DORA Art.6'],
  'realtime',
  'warn',
  'count(drifted_workspaces) * 2.5',
  NULL,
  TRUE
),
(
  'CONF-002',
  'SIEM Integration Inactive or Log Source Silent',
  'تكامل SIEM غير نشط أو مصدر السجلات صامت',
  'config',
  E'SELECT si.id AS entity_id, si.integration_name,\n       si.last_heartbeat_at,\n       NOW() - si.last_heartbeat_at AS silence_duration\n FROM siem_integrations si\n WHERE si.is_active = TRUE\n   AND (si.last_heartbeat_at IS NULL\n        OR si.last_heartbeat_at < NOW() - INTERVAL ''1 hour'');',
  '{"siem_active_and_sending": true, "max_silence_minutes": 60}',
  'critical',
  15,
  FALSE,
  'Alert SOC and attempt integration reconnection',
  ARRAY['NCA ECC 7-1'],
  'scheduled',
  'block',
  'count(silent_integrations) * 8.0',
  'soc_team',
  TRUE
),

-- =========================================
-- AI MODEL rules (AIMD-001 .. AIMD-002)
-- =========================================
(
  'AIMD-001',
  'Model Accuracy Below Threshold for 7 Days',
  'دقة النموذج أقل من الحد الأدنى لمدة 7 أيام',
  'ai_model',
  E'SELECT am.id AS entity_id, am.model_name,\n       AVG(mm.accuracy) AS avg_accuracy,\n       am.accuracy_threshold\n FROM ai_models am\n JOIN model_metrics mm ON mm.model_id = am.id\n   AND mm.recorded_at > NOW() - INTERVAL ''7 days''\n GROUP BY am.id, am.model_name, am.accuracy_threshold\n HAVING AVG(mm.accuracy) < am.accuracy_threshold;',
  '{"accuracy_above_threshold": true, "consecutive_days_below": 7}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['Gartner TRiSM'],
  'scheduled',
  'warn',
  'count(degraded_models) * 3.0',
  NULL,
  TRUE
),
(
  'AIMD-002',
  'Model Retraining Overdue per SLA',
  'إعادة تدريب النموذج متأخرة حسب اتفاقية الخدمة',
  'ai_model',
  E'SELECT am.id AS entity_id, am.model_name,\n       am.last_retrained_at,\n       am.retrain_sla_days,\n       NOW() - am.last_retrained_at AS overdue\n FROM ai_models am\n WHERE am.last_retrained_at < NOW() - (am.retrain_sla_days || '' days'')::INTERVAL;',
  '{"retrained_within_sla": true}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['Gartner TRiSM'],
  'scheduled',
  'warn',
  'count(overdue_models) * 2.5',
  NULL,
  TRUE
),

-- =========================================
-- EVIDENCE rules (EVID-001 .. EVID-003)
-- =========================================
(
  'EVID-001',
  'Evidence Collection Schedule Missed Consecutively',
  'جدول جمع الأدلة فُوِّت بشكل متتابع',
  'evidence',
  E'SELECT es.id AS entity_id, es.schedule_name,\n       es.consecutive_misses\n FROM evidence_schedules es\n WHERE es.consecutive_misses >= 2\n   AND es.is_active = TRUE;',
  '{"max_consecutive_misses": 1}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['NCA ECC 5-2'],
  'scheduled',
  'warn',
  'count(missed_schedules) * 2.0',
  NULL,
  TRUE
),
(
  'EVID-002',
  'Vulnerability Scan Not Completed Within Schedule',
  'فحص الثغرات لم يُكمَل ضمن الجدول المحدد',
  'evidence',
  E'SELECT vs.id AS entity_id, vs.scan_name,\n       vs.last_completed_at,\n       vs.schedule_interval,\n       NOW() - vs.last_completed_at AS overdue\n FROM vulnerability_scans vs\n WHERE vs.is_active = TRUE\n   AND vs.last_completed_at < NOW() - vs.schedule_interval;',
  '{"scan_completed_within_schedule": true}',
  'critical',
  15,
  FALSE,
  'Trigger emergency vulnerability scan and notify security team',
  ARRAY['NCA ECC 5-3'],
  'scheduled',
  'escalate',
  'count(overdue_scans) * 6.0',
  'security_team',
  TRUE
),
(
  'EVID-003',
  'Incident Response Plan Not Reviewed Within 12 Months',
  'خطة الاستجابة للحوادث لم تُراجَع خلال 12 شهراً',
  'evidence',
  E'SELECT irp.id AS entity_id, irp.plan_name,\n       irp.last_reviewed_at,\n       NOW() - irp.last_reviewed_at AS overdue\n FROM incident_response_plans irp\n WHERE irp.last_reviewed_at < NOW() - INTERVAL ''12 months''\n   AND irp.is_active = TRUE;',
  '{"reviewed_within_months": 12}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['NCA ECC 4-3'],
  'scheduled',
  'warn',
  'count(stale_ir_plans) * 3.0',
  NULL,
  TRUE
),

-- =========================================
-- SLA rules (SLA-001 .. SLA-002)
-- =========================================
(
  'SLA-001',
  'Overdue Tasks Exceeding 10% of Active Tasks',
  'المهام المتأخرة تتجاوز 10% من المهام النشطة',
  'sla',
  E'SELECT w.id AS entity_id, w.workspace_code,\n       COUNT(*) FILTER (WHERE t.due_date < NOW()) AS overdue_count,\n       COUNT(*) AS total_active,\n       ROUND(100.0 * COUNT(*) FILTER (WHERE t.due_date < NOW()) / NULLIF(COUNT(*), 0), 2) AS overdue_pct\n FROM tasks t\n JOIN workspaces w ON w.id = t.workspace_id\n WHERE t.status IN (''open'', ''in_progress'')\n GROUP BY w.id, w.workspace_code\n HAVING COUNT(*) FILTER (WHERE t.due_date < NOW()) > 0.1 * COUNT(*);',
  '{"max_overdue_percentage": 10}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['SOC 2 CC7.2'],
  'scheduled',
  'warn',
  'overdue_pct * 0.5',
  NULL,
  TRUE
),
(
  'SLA-002',
  'Critical Incident Not Reported to NCA Within Timeframe',
  'حادث حرج لم يُبلَّغ للهيئة الوطنية ضمن الإطار الزمني',
  'sla',
  E'SELECT i.id AS entity_id, i.incident_code,\n       i.severity, i.detected_at,\n       i.reported_to_nca_at,\n       NOW() - i.detected_at AS elapsed\n FROM incidents i\n WHERE i.severity = ''critical''\n   AND i.reported_to_nca_at IS NULL\n   AND i.detected_at < NOW() - INTERVAL ''2 hours'';',
  '{"critical_incidents_reported_within_hours": 2}',
  'critical',
  15,
  FALSE,
  'Immediately escalate to CISO and compliance officer for NCA notification',
  ARRAY['NCA ECC 8-1'],
  'scheduled',
  'escalate',
  'count(unreported_incidents) * 10.0',
  'ciso',
  TRUE
),

-- =========================================
-- RISK rules (RISK-001)
-- =========================================
(
  'RISK-001',
  'Vendor SLA Breaches Exceeding Threshold',
  'انتهاكات اتفاقية مستوى الخدمة للمورد تجاوزت الحد',
  'risk',
  E'SELECT v.id AS entity_id, v.vendor_name,\n       COUNT(*) AS breach_count,\n       v.sla_breach_threshold\n FROM vendors v\n JOIN vendor_sla_breaches vsb ON vsb.vendor_id = v.id\n   AND vsb.occurred_at > NOW() - INTERVAL ''90 days''\n GROUP BY v.id, v.vendor_name, v.sla_breach_threshold\n HAVING COUNT(*) > v.sla_breach_threshold;',
  '{"breaches_within_threshold": true, "evaluation_window_days": 90}',
  'warning',
  60,
  FALSE,
  NULL,
  ARRAY['SOC 2 CC9.2'],
  'scheduled',
  'warn',
  'count(breach_vendors) * 3.0',
  NULL,
  TRUE
)

ON CONFLICT (rule_code) DO UPDATE SET
  name_en                = EXCLUDED.name_en,
  name_ar                = EXCLUDED.name_ar,
  category               = EXCLUDED.category,
  detection_query        = EXCLUDED.detection_query,
  expected_state         = EXCLUDED.expected_state,
  severity               = EXCLUDED.severity,
  check_interval_minutes = EXCLUDED.check_interval_minutes,
  auto_remediate         = EXCLUDED.auto_remediate,
  remediation_action     = EXCLUDED.remediation_action,
  framework_refs         = EXCLUDED.framework_refs,
  detection_mode         = EXCLUDED.detection_mode,
  enforcement_action     = EXCLUDED.enforcement_action,
  impact_score_formula   = EXCLUDED.impact_score_formula,
  escalation_target      = EXCLUDED.escalation_target,
  is_active              = EXCLUDED.is_active,
  updated_at             = NOW();
