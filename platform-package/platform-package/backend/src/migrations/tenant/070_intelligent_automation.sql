-- ============================================================================
-- AGRC-OS EXECUTION PLATFORM - INTELLIGENT AUTOMATION
-- Migration 025: Auto-Initiation Rules, SLA Configuration, and Smart Triggers
-- Multi-Tenant Architecture: Applied per tenant_<tenant_id> schema
-- ============================================================================

-- ============================================================================
-- WORKFLOW AUTO-INITIATION TRIGGERS
-- ============================================================================

-- Insert comprehensive workflow triggers for common GRC scenarios
INSERT INTO workflow_triggers (
  trigger_name,
  trigger_description,
  trigger_type,
  source_system,
  trigger_conditions,
  target_workflow_type,
  workflow_parameters,
  priority_override,
  schedule_cron,
  schedule_timezone,
  active
) VALUES

-- Regulatory Change Triggers
(
  'New Saudi Regulation Published',
  'Triggers policy update workflow when new Saudi regulations are published',
  'event',
  'regulatory_monitor',
  jsonb_build_object(
    'source', 'regulatory_monitor',
    'event', 'new_regulation',
    'country', 'SAU',
    'regulators', ARRAY['NCA', 'SAMA', 'SDAIA', 'ZATCA', 'CMA', 'MHRSD']
  ),
  'policy_update',
  jsonb_build_object(
    'priority', 'high',
    'deadline_days', 90,
    'require_legal_review', true,
    'notify_teams', ARRAY['PRIVACY', 'CYBER_GOV', 'QUALITY', 'ERM']
  ),
  'high',
  NULL,
  'Asia/Riyadh',
  true
),

(
  'Framework Update Detection',
  'Triggers control reassessment when frameworks are updated',
  'event',
  'framework_monitor',
  jsonb_build_object(
    'event', 'framework_updated',
    'frameworks', ARRAY['NCA-ECC', 'SAMA-CSF', 'PDPL'],
    'change_type', ARRAY['new_control', 'control_modified', 'control_removed']
  ),
  'control_reassessment',
  jsonb_build_object(
    'priority', 'high',
    'assessment_scope', 'affected_controls',
    'require_evidence_update', true
  ),
  'high',
  NULL,
  'Asia/Riyadh',
  true
),

-- Scheduled Evidence Collection
(
  'Quarterly Evidence Collection - Q1',
  'Automated evidence collection for Q1 (January)',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'frequency', 'quarterly',
    'quarter', 1,
    'evidence_types', ARRAY['all_controls'],
    'frameworks', ARRAY['NCA-ECC', 'SAMA-CSF', 'PDPL']
  ),
  'evidence_collection',
  jsonb_build_object(
    'collection_period', 'Q1',
    'validation_required', true,
    'auto_reminders', true,
    'reminder_frequency_days', 7
  ),
  'medium',
  '0 0 1 1 *', -- January 1st at midnight
  'Asia/Riyadh',
  true
),

(
  'Quarterly Evidence Collection - Q2',
  'Automated evidence collection for Q2 (April)',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'frequency', 'quarterly',
    'quarter', 2,
    'evidence_types', ARRAY['all_controls'],
    'frameworks', ARRAY['NCA-ECC', 'SAMA-CSF', 'PDPL']
  ),
  'evidence_collection',
  jsonb_build_object(
    'collection_period', 'Q2',
    'validation_required', true,
    'auto_reminders', true,
    'reminder_frequency_days', 7
  ),
  'medium',
  '0 0 1 4 *', -- April 1st at midnight
  'Asia/Riyadh',
  true
),

(
  'Quarterly Evidence Collection - Q3',
  'Automated evidence collection for Q3 (July)',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'frequency', 'quarterly',
    'quarter', 3,
    'evidence_types', ARRAY['all_controls'],
    'frameworks', ARRAY['NCA-ECC', 'SAMA-CSF', 'PDPL']
  ),
  'evidence_collection',
  jsonb_build_object(
    'collection_period', 'Q3',
    'validation_required', true,
    'auto_reminders', true,
    'reminder_frequency_days', 7
  ),
  'medium',
  '0 0 1 7 *', -- July 1st at midnight
  'Asia/Riyadh',
  true
),

(
  'Quarterly Evidence Collection - Q4',
  'Automated evidence collection for Q4 (October)',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'frequency', 'quarterly',
    'quarter', 4,
    'evidence_types', ARRAY['all_controls'],
    'frameworks', ARRAY['NCA-ECC', 'SAMA-CSF', 'PDPL']
  ),
  'evidence_collection',
  jsonb_build_object(
    'collection_period', 'Q4',
    'validation_required', true,
    'auto_reminders', true,
    'reminder_frequency_days', 7
  ),
  'medium',
  '0 0 1 10 *', -- October 1st at midnight
  'Asia/Riyadh',
  true
),

-- Monthly Reviews
(
  'Monthly Policy Review',
  'Triggers policy review workflow monthly',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'review_type', 'policy',
    'scope', 'due_for_review'
  ),
  'policy_review',
  jsonb_build_object(
    'review_depth', 'standard',
    'notify_owners', true
  ),
  'low',
  '0 0 1 * *', -- 1st of every month
  'Asia/Riyadh',
  true
),

(
  'Monthly Vendor Risk Review',
  'Triggers vendor risk assessment monthly',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'review_type', 'vendor_risk',
    'scope', 'critical_vendors'
  ),
  'vendor_assessment',
  jsonb_build_object(
    'assessment_type', 'continuous_monitoring',
    'include_performance', true
  ),
  'medium',
  '0 0 15 * *', -- 15th of every month
  'Asia/Riyadh',
  true
),

-- Risk-Based Triggers
(
  'High Risk Identified',
  'Triggers immediate risk mitigation workflow for high risks',
  'condition',
  'risk_engine',
  jsonb_build_object(
    'risk_score', jsonb_build_object('operator', '>=', 'value', 80),
    'likelihood', jsonb_build_object('operator', 'IN', 'value', ARRAY['high', 'very_high']),
    'impact', jsonb_build_object('operator', 'IN', 'value', ARRAY['high', 'critical'])
  ),
  'risk_mitigation',
  jsonb_build_object(
    'priority', 'critical',
    'escalate_to', 'EXEC_STRATEGY',
    'require_action_plan', true,
    'sla_hours', 24
  ),
  'critical',
  NULL,
  'Asia/Riyadh',
  true
),

(
  'Critical Control Failure',
  'Triggers remediation workflow when critical control fails',
  'event',
  'control_testing',
  jsonb_build_object(
    'source', 'control_testing',
    'result', 'failed',
    'control_criticality', ARRAY['critical', 'high'],
    'frameworks', ARRAY['NCA-ECC', 'SAMA-CSF']
  ),
  'remediation_workflow',
  jsonb_build_object(
    'priority', 'critical',
    'notify_teams', ARRAY['ERM', 'AUDIT', 'EXEC_STRATEGY'],
    'require_root_cause', true,
    'require_action_plan', true
  ),
  'critical',
  NULL,
  'Asia/Riyadh',
  true
),

-- Incident Response Triggers
(
  'Security Incident Detected',
  'Triggers incident response workflow',
  'event',
  'siem',
  jsonb_build_object(
    'source', 'siem',
    'severity', jsonb_build_object('operator', 'IN', 'value', ARRAY['high', 'critical']),
    'confirmed', true
  ),
  'incident_response',
  jsonb_build_object(
    'activate_soc', true,
    'notify_teams', ARRAY['SOC_OPS', 'CYBER_GOV', 'BCM_DR'],
    'require_forensics', true
  ),
  'critical',
  NULL,
  'Asia/Riyadh',
  true
),

(
  'Data Breach Detected',
  'Triggers data breach response per PDPL requirements',
  'event',
  'dlp',
  jsonb_build_object(
    'event_type', 'data_breach',
    'data_classification', ARRAY['personal', 'sensitive', 'confidential']
  ),
  'breach_response',
  jsonb_build_object(
    'regulatory_notification', true,
    'notification_deadline_hours', 72,
    'notify_teams', ARRAY['PRIVACY', 'CYBER_GOV', 'EXEC_STRATEGY'],
    'sdaia_notification_required', true
  ),
  'critical',
  NULL,
  'Asia/Riyadh',
  true
),

-- Audit Triggers
(
  'Annual Audit Planning',
  'Triggers annual audit planning process',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'audit_type', 'annual_plan',
    'scope', 'enterprise'
  ),
  'audit_planning',
  jsonb_build_object(
    'planning_horizon', 'annual',
    'risk_based_approach', true,
    'regulatory_requirements', true
  ),
  'medium',
  '0 0 1 11 *', -- November 1st for next year planning
  'Asia/Riyadh',
  true
),

(
  'Audit Finding Follow-up',
  'Triggers follow-up for overdue audit findings',
  'schedule',
  'scheduler',
  jsonb_build_object(
    'finding_status', 'open',
    'days_overdue', jsonb_build_object('operator', '>', 'value', 30)
  ),
  'finding_followup',
  jsonb_build_object(
    'escalate_if_critical', true,
    'require_status_update', true
  ),
  'high',
  '0 9 * * 1', -- Every Monday at 9 AM
  'Asia/Riyadh',
  true
)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAUDI REGULATORY SLA REQUIREMENTS
-- ============================================================================

-- Insert SLA requirements from Saudi regulations
INSERT INTO regulatory_sla_requirements (
  regulator_id,
  framework_code,
  requirement_name,
  process_type,
  required_sla_hours,
  required_sla_description,
  escalation_required,
  escalation_levels,
  penalties_for_breach,
  applicable_sectors,
  effective_date,
  source_regulation,
  source_article
) VALUES

-- SAMA Requirements
(
  'SAMA',
  'SAMA-CSF',
  'Cybersecurity Incident Reporting',
  'incident_reporting',
  2,
  'Report cybersecurity incidents to SAMA within 2 hours of detection',
  true,
  3,
  jsonb_build_object(
    'first_breach', 'warning',
    'repeated', 'fine_up_to_5m_sar',
    'severe', 'license_review'
  ),
  ARRAY['K', 'K64', 'K65'], -- Financial sectors
  '2020-01-01',
  'SAMA Cyber Security Framework',
  'Article 3.2.1 - Incident Reporting'
),

(
  'SAMA',
  'SAMA-CSF',
  'Vulnerability Remediation - Critical',
  'vulnerability_remediation',
  24,
  'Critical vulnerabilities must be remediated within 24 hours',
  true,
  2,
  jsonb_build_object(
    'breach', 'increased_oversight',
    'repeated', 'mandatory_audit'
  ),
  ARRAY['K', 'K64', 'K65'],
  '2020-01-01',
  'SAMA Cyber Security Framework',
  'Article 2.3.4 - Vulnerability Management'
),

-- NCA Requirements
(
  'NCA',
  'NCA-ECC',
  'Security Breach Notification',
  'breach_notification',
  72,
  'Notify NCA of security breaches within 72 hours',
  true,
  2,
  jsonb_build_object(
    'first_breach', 'warning',
    'repeated', 'fine_percentage_revenue',
    'concealment', 'criminal_liability'
  ),
  ARRAY['ALL'], -- All sectors
  '2018-11-01',
  'NCA Essential Cybersecurity Controls',
  'ECC-1:2018 Requirement 2-8-3'
),

(
  'NCA',
  'NCA-ECC',
  'Access Review Completion',
  'access_review',
  720, -- 30 days
  'Complete user access reviews within 30 days of initiation',
  true,
  2,
  jsonb_build_object(
    'breach', 'compliance_notice',
    'repeated', 'mandatory_improvement_plan'
  ),
  ARRAY['ALL'],
  '2018-11-01',
  'NCA Essential Cybersecurity Controls',
  'ECC-1:2018 Requirement 2-4-1'
),

-- SDAIA PDPL Requirements
(
  'SDAIA',
  'PDPL',
  'Personal Data Breach Notification',
  'data_breach_notification',
  72,
  'Notify SDAIA and affected individuals within 72 hours of personal data breach',
  true,
  3,
  jsonb_build_object(
    'first_breach', 'warning_fine_up_to_1m',
    'severe', 'fine_up_to_5m_sar',
    'willful', 'criminal_prosecution'
  ),
  ARRAY['ALL'],
  '2023-09-14',
  'Personal Data Protection Law',
  'Article 42 - Breach Notification'
),

(
  'SDAIA',
  'PDPL',
  'Data Subject Request Response',
  'dsr_response',
  720, -- 30 days
  'Respond to data subject requests within 30 days',
  true,
  2,
  jsonb_build_object(
    'breach', 'fine_up_to_500k',
    'repeated', 'fine_up_to_1m_sar'
  ),
  ARRAY['ALL'],
  '2023-09-14',
  'Personal Data Protection Law',
  'Article 11 - Data Subject Rights'
),

-- ZATCA Requirements
(
  'ZATCA',
  'E-INVOICING',
  'E-Invoice Submission',
  'invoice_submission',
  24,
  'Submit e-invoices to ZATCA within 24 hours',
  true,
  2,
  jsonb_build_object(
    'breach', 'fine_percentage_invoice',
    'repeated', 'suspension',
    'fraud', 'criminal_charges'
  ),
  ARRAY['ALL'],
  '2021-12-04',
  'E-Invoicing Regulation Phase 2',
  'Article 5.2 - Submission Requirements'
),

(
  'ZATCA',
  'TAX',
  'VAT Return Filing',
  'tax_filing',
  720, -- 30 days
  'File VAT returns within 30 days of period end',
  true,
  2,
  jsonb_build_object(
    'late_filing', 'penalty_5_to_25_percent',
    'non_filing', 'penalty_up_to_50_percent'
  ),
  ARRAY['ALL'],
  '2018-01-01',
  'VAT Implementing Regulations',
  'Article 67 - Filing Deadlines'
),

-- CMA Requirements
(
  'CMA',
  'CMA-CGR',
  'Material Event Disclosure',
  'material_disclosure',
  2,
  'Disclose material events within 2 hours during trading',
  true,
  3,
  jsonb_build_object(
    'breach', 'public_warning',
    'repeated', 'trading_suspension',
    'insider_trading', 'criminal_prosecution'
  ),
  ARRAY['K'], -- Financial markets
  '2017-01-01',
  'Corporate Governance Regulations',
  'Article 89 - Disclosure Policy'
),

-- MHRSD Requirements
(
  'MHRSD',
  'LABOR-LAW',
  'Work Injury Reporting',
  'injury_reporting',
  24,
  'Report work injuries to MHRSD within 24 hours',
  true,
  2,
  jsonb_build_object(
    'breach', 'fine_up_to_10k_sar',
    'repeated', 'increased_inspections',
    'serious_injury_unreported', 'criminal_liability'
  ),
  ARRAY['ALL'],
  '2020-01-01',
  'Saudi Labor Law',
  'Article 142 - Injury Reporting'
)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- EVIDENCE AUTO-COLLECTION SCHEDULES
-- ============================================================================

-- Insert auto-collection schedules for common evidence types
INSERT INTO evidence_auto_collection (
  schedule_name,
  control_id,
  evidence_type,
  evidence_category,
  collection_frequency,
  collection_day_of_month,
  collection_time,
  collection_timezone,
  source_system,
  source_type,
  collection_query,
  validation_rules,
  validation_required,
  auto_approve_if_valid,
  assigned_team_id,
  retention_days,
  active
) VALUES
(
  'Daily Security Logs Collection',
  NULL,
  'security_logs',
  'technical',
  'daily',
  NULL,
  '02:00:00',
  'Asia/Riyadh',
  'siem',
  'api',
  '/api/v1/logs/export?type=security&period=daily',
  jsonb_build_object(
    'min_records', 1000,
    'required_fields', ARRAY['timestamp', 'event_id', 'severity', 'source'],
    'format', 'json'
  ),
  true,
  true,
  (SELECT team_id FROM teams WHERE team_code = 'SOC_OPS'),
  90,
  true
),
(
  'Weekly Vulnerability Scan Reports',
  NULL,
  'vulnerability_scan',
  'technical',
  'weekly',
  1, -- Monday
  '03:00:00',
  'Asia/Riyadh',
  'vulnerability_scanner',
  'api',
  '/api/scans/weekly-report',
  jsonb_build_object(
    'severity_threshold', 'medium',
    'scan_coverage', 90,
    'format', 'pdf'
  ),
  true,
  false,
  (SELECT team_id FROM teams WHERE team_code = 'CYBER_GOV'),
  365,
  true
),
(
  'Monthly Access Reviews',
  NULL,
  'access_review',
  'compliance',
  'monthly',
  5,
  '09:00:00',
  'Asia/Riyadh',
  'iam_system',
  'database',
  'SELECT * FROM access_review_report WHERE month = CURRENT_MONTH',
  jsonb_build_object(
    'completeness', 100,
    'review_required', ARRAY['privileged', 'service_accounts', 'external']
  ),
  true,
  false,
  (SELECT team_id FROM teams WHERE team_code = 'IAM_GOV'),
  730,
  true
),
(
  'Quarterly Control Testing Evidence',
  NULL,
  'control_testing',
  'compliance',
  'quarterly',
  10,
  '10:00:00',
  'Asia/Riyadh',
  'grc_platform',
  'database',
  'SELECT * FROM control_test_results WHERE quarter = CURRENT_QUARTER',
  jsonb_build_object(
    'min_sample_size', 25,
    'confidence_level', 95,
    'documentation_required', true
  ),
  true,
  false,
  (SELECT team_id FROM teams WHERE team_code = 'AUDIT'),
  2555, -- 7 years
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EVIDENCE RETENTION RULES BASED ON SAUDI REGULATIONS
-- ============================================================================

INSERT INTO evidence_retention_rules (
  rule_name,
  evidence_type,
  evidence_category,
  regulator_id,
  framework_code,
  regulation_reference,
  min_retention_years,
  max_retention_years,
  retention_trigger,
  disposal_approval_required,
  disposal_approval_teams,
  disposal_method,
  archival_required,
  archive_after_years,
  notify_before_disposal_days,
  notify_teams,
  active
) VALUES
(
  'ZATCA Financial Records Retention',
  'financial_records',
  'financial',
  'ZATCA',
  'TAX',
  'VAT Implementing Regulations Article 70',
  10,
  15,
  'fiscal_year_end',
  true,
  ARRAY['FINANCE', 'AUDIT', 'EXEC_STRATEGY'],
  'archive',
  true,
  5,
  90,
  ARRAY['FINANCE', 'AUDIT'],
  true
),
(
  'NCA Security Logs Retention',
  'security_logs',
  'technical',
  'NCA',
  'NCA-ECC',
  'ECC-1:2018 Requirement 2-9-2',
  1,
  3,
  'creation_date',
  true,
  ARRAY['CYBER_GOV', 'SOC_OPS', 'AUDIT'],
  'delete',
  true,
  1,
  30,
  ARRAY['CYBER_GOV', 'SOC_OPS'],
  true
),
(
  'SDAIA Personal Data Processing Records',
  'personal_data_processing',
  'privacy',
  'SDAIA',
  'PDPL',
  'PDPL Article 45 - Record Keeping',
  3,
  5,
  'creation_date',
  true,
  ARRAY['PRIVACY', 'DATA_GOV', 'AUDIT'],
  'anonymize',
  true,
  2,
  60,
  ARRAY['PRIVACY', 'DATA_GOV'],
  true
),
(
  'CMA Audit Reports Retention',
  'audit_reports',
  'compliance',
  'CMA',
  'CMA-CGR',
  'Corporate Governance Regulations Article 104',
  7,
  10,
  'approval_date',
  true,
  ARRAY['AUDIT', 'ERM', 'EXEC_STRATEGY'],
  'archive',
  true,
  3,
  90,
  ARRAY['AUDIT', 'ERM'],
  true
),
(
  'SAMA Incident Reports Retention',
  'incident_reports',
  'operational',
  'SAMA',
  'SAMA-CSF',
  'SAMA Cyber Security Framework Article 3.2.5',
  5,
  7,
  'creation_date',
  true,
  ARRAY['CYBER_GOV', 'SOC_OPS', 'AUDIT', 'ERM'],
  'archive',
  true,
  2,
  60,
  ARRAY['CYBER_GOV', 'SOC_OPS'],
  true
),
(
  'MHRSD Employee Records Retention',
  'employee_records',
  'hr',
  'MHRSD',
  'LABOR-LAW',
  'Saudi Labor Law Article 56',
  4,
  10,
  'contract_end',
  true,
  ARRAY['HR_GOV', 'AUDIT', 'PRIVACY'],
  'archive',
  true,
  2,
  90,
  ARRAY['HR_GOV'],
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SLA AUTO-CONFIGURATION
-- ============================================================================

-- Auto-configure SLAs based on regulatory requirements
INSERT INTO sla_config (
  process_type,
  team_id,
  initial_sla_hours,
  warning_threshold_percent,
  critical_threshold_percent,
  escalation_1_hours,
  escalation_1_to_team_id,
  escalation_2_hours,
  escalation_2_to_team_id,
  escalation_3_hours,
  escalation_3_to_team_id,
  auto_escalate,
  auto_configured,
  configured_from_regulation,
  business_hours_only,
  active
)
SELECT
  r.process_type,
  t.team_id,
  r.required_sla_hours,
  75,
  90,
  GREATEST(r.required_sla_hours * 0.5, 2)::INTEGER,
  (SELECT team_id FROM teams WHERE team_code = 'ERM'),
  GREATEST(r.required_sla_hours * 0.75, 4)::INTEGER,
  (SELECT team_id FROM teams WHERE team_code = 'CYBER_GOV'),
  r.required_sla_hours,
  (SELECT team_id FROM teams WHERE team_code = 'EXEC_STRATEGY'),
  true,
  true,
  r.sla_requirement_id,
  CASE WHEN r.required_sla_hours <= 24 THEN false ELSE true END,
  true
FROM regulatory_sla_requirements r
CROSS JOIN teams t
WHERE t.team_code IN (
  CASE r.process_type
    WHEN 'incident_reporting' THEN 'SOC_OPS'
    WHEN 'breach_notification' THEN 'PRIVACY'
    WHEN 'vulnerability_remediation' THEN 'CYBER_GOV'
    WHEN 'access_review' THEN 'IAM_GOV'
    WHEN 'data_breach_notification' THEN 'PRIVACY'
    WHEN 'dsr_response' THEN 'PRIVACY'
    WHEN 'invoice_submission' THEN 'FINANCE'
    WHEN 'tax_filing' THEN 'FINANCE'
    WHEN 'material_disclosure' THEN 'EXEC_STRATEGY'
    WHEN 'injury_reporting' THEN 'HR_GOV'
    ELSE 'ERM'
  END
)
ON CONFLICT (process_type, team_id, priority_level) DO NOTHING;

-- ============================================================================
-- INTELLIGENT AUTOMATION RULES
-- ============================================================================

INSERT INTO automation_rules (
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  trigger_event,
  trigger_conditions,
  actions,
  action_parameters,
  execution_order,
  active
) VALUES
(
  'AUTO_VALIDATE_EVIDENCE',
  'Auto-validate standard evidence formats',
  'Automatically validates evidence that meets standard format requirements',
  'validation',
  'evidence_submitted',
  jsonb_build_object(
    'evidence_types', ARRAY['security_logs', 'access_reports', 'scan_results'],
    'format_compliant', true
  ),
  jsonb_build_array(
    jsonb_build_object(
      'action', 'validate_evidence',
      'validation_type', 'format'
    ),
    jsonb_build_object(
      'action', 'validate_evidence',
      'validation_type', 'completeness'
    ),
    jsonb_build_object(
      'action', 'approve_if_valid',
      'conditions', jsonb_build_object('validation_score', '>= 90')
    )
  ),
  NULL,
  5,
  true
),
(
  'AUTO_CREATE_REMEDIATION',
  'Auto-create remediation tasks for failed controls',
  'Creates remediation action items when controls fail testing',
  'workflow',
  'control_test_failed',
  jsonb_build_object(
    'control_criticality', ARRAY['critical', 'high'],
    'failure_type', ARRAY['design', 'operating']
  ),
  jsonb_build_array(
    jsonb_build_object(
      'action', 'create_action_item',
      'type', 'remediation'
    ),
    jsonb_build_object(
      'action', 'assign_to_team',
      'use_raci', true
    ),
    jsonb_build_object(
      'action', 'set_sla',
      'based_on', 'control_criticality'
    ),
    jsonb_build_object(
      'action', 'notify_stakeholders',
      'include', ARRAY['process_owner', 'erm', 'audit']
    )
  ),
  jsonb_build_object(
    'priority_mapping', jsonb_build_object(
      'critical', 'critical',
      'high', 'high',
      'medium', 'medium',
      'low', 'low'
    )
  ),
  15,
  true
),
(
  'SMART_ESCALATION',
  'Smart escalation based on context',
  'Intelligently escalates based on issue type, severity, and time',
  'escalation',
  'sla_warning',
  jsonb_build_object(
    'breach_percentage', '>= 75',
    'priority', ARRAY['critical', 'high']
  ),
  jsonb_build_array(
    jsonb_build_object(
      'action', 'analyze_context',
      'factors', ARRAY['issue_type', 'team_workload', 'dependencies']
    ),
    jsonb_build_object(
      'action', 'determine_escalation_path',
      'use_raci', true,
      'consider_availability', true
    ),
    jsonb_build_object(
      'action', 'escalate_with_context',
      'include_analysis', true,
      'suggest_actions', true
    )
  ),
  NULL,
  25,
  true
),
(
  'EVIDENCE_EXPIRY_WARNING',
  'Warn before evidence expires',
  'Sends warnings before evidence expires and needs renewal',
  'notification',
  'evidence_expiry_approaching',
  jsonb_build_object(
    'days_until_expiry', '<= 30',
    'evidence_criticality', ARRAY['critical', 'high']
  ),
  jsonb_build_array(
    jsonb_build_object(
      'action', 'create_renewal_task',
      'lead_time_days', 30
    ),
    jsonb_build_object(
      'action', 'notify_owner',
      'frequency', 'weekly'
    ),
    jsonb_build_object(
      'action', 'escalate_if_ignored',
      'after_days', 14
    )
  ),
  NULL,
  30,
  true
)
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================================
-- STATISTICS
-- ============================================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
  v_sla_req_count INTEGER;
  v_collection_count INTEGER;
  v_retention_count INTEGER;
  v_automation_count INTEGER;
  v_sla_config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count FROM workflow_triggers WHERE active = true;
  SELECT COUNT(*) INTO v_sla_req_count FROM regulatory_sla_requirements;
  SELECT COUNT(*) INTO v_collection_count FROM evidence_auto_collection WHERE active = true;
  SELECT COUNT(*) INTO v_retention_count FROM evidence_retention_rules WHERE active = true;
  SELECT COUNT(*) INTO v_automation_count FROM automation_rules WHERE active = true;
  SELECT COUNT(*) INTO v_sla_config_count FROM sla_config WHERE auto_configured = true;

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'INTELLIGENT AUTOMATION CONFIGURATION COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Workflow Triggers: %', v_trigger_count;
  RAISE NOTICE 'Regulatory SLA Requirements: %', v_sla_req_count;
  RAISE NOTICE 'Auto-Collection Schedules: %', v_collection_count;
  RAISE NOTICE 'Retention Rules: %', v_retention_count;
  RAISE NOTICE 'Automation Rules: %', v_automation_count;
  RAISE NOTICE 'Auto-Configured SLAs: %', v_sla_config_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'AGRC-OS is now a fully automated execution platform!';
  RAISE NOTICE '=================================================';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE workflow_triggers IS 'Automated workflow initiation based on events, schedules, and conditions';
COMMENT ON TABLE regulatory_sla_requirements IS 'SLA requirements from Saudi Arabian regulations';
COMMENT ON TABLE evidence_auto_collection IS 'Scheduled automatic evidence collection from various sources';
COMMENT ON TABLE evidence_retention_rules IS 'Evidence retention and disposal rules per Saudi regulations';
COMMENT ON TABLE automation_rules IS 'Intelligent automation rules for process orchestration';