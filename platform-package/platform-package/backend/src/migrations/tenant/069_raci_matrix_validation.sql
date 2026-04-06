-- ============================================================================
-- AGRC-OS EXECUTION PLATFORM - RACI MATRIX WITH VALIDATION
-- Migration 024: Comprehensive RACI Matrix for GRC Processes
-- Multi-Tenant Architecture: Applied per tenant_<tenant_id> schema
-- ============================================================================

-- Ensure raci_matrix table exists
CREATE TABLE IF NOT EXISTS raci_matrix (
  raci_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_code VARCHAR(50) NOT NULL,
  process_code VARCHAR(50),
  stage_code VARCHAR(50),
  activity_code VARCHAR(50),
  scope_type VARCHAR(32) NOT NULL DEFAULT 'workspace',
  scope_id UUID,
  responsible_role_codes TEXT[] NOT NULL DEFAULT '{}',
  accountable_role_codes TEXT[] NOT NULL DEFAULT '{}',
  consulted_role_codes TEXT[] NOT NULL DEFAULT '{}',
  informed_role_codes TEXT[] NOT NULL DEFAULT '{}',
  description_en TEXT,
  description_ar TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raci_matrix_domain ON raci_matrix(domain_code);

-- Ensure raci_matrix table has all required columns
ALTER TABLE raci_matrix
  ADD COLUMN IF NOT EXISTS validation_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sla_hours INTEGER,
  ADD COLUMN IF NOT EXISTS escalation_threshold_hours INTEGER,
  ADD COLUMN IF NOT EXISTS notification_settings JSONB;

-- ============================================================================
-- EVIDENCE COLLECTION & VALIDATION RACI
-- ============================================================================

INSERT INTO raci_matrix (
  domain_code,
  process_code,
  stage_code,
  activity_code,
  responsible_role_codes,
  accountable_role_codes,
  consulted_role_codes,
  informed_role_codes,
  description_en,
  description_ar,
  active,
  scope_type
) VALUES

-- Evidence Collection Process
(
  'EVIDENCE',
  'COLLECTION',
  'INITIATION',
  'REQUEST',
  ARRAY['AUDIT'],
  ARRAY['ERM'],
  ARRAY['CYBER_GOV', 'DATA_GOV'],
  ARRAY['EXEC_STRATEGY', 'PMO'],
  'Initiate evidence collection request based on control requirements or audit needs',
  'بدء طلب جمع الأدلة بناءً على متطلبات الضوابط أو احتياجات التدقيق',
  true,
  'workspace'
),

(
  'EVIDENCE',
  'COLLECTION',
  'GATHERING',
  'COLLECT',
  ARRAY['SVC_OPS', 'APP_ENG', 'CLOUD_INFRA'],
  ARRAY['CYBER_GOV'],
  ARRAY['AUDIT', 'QUALITY'],
  ARRAY['ERM', 'PMO'],
  'Gather required evidence from systems, processes, and documentation',
  'جمع الأدلة المطلوبة من الأنظمة والعمليات والوثائق',
  true,
  'workspace'
),

-- Evidence Validation Workflow
(
  'EVIDENCE',
  'VALIDATION',
  'TECHNICAL',
  'CONTENT_CHECK',
  ARRAY['CYBER_GOV', 'DATA_GOV'],
  ARRAY['AUDIT'],
  ARRAY['QUALITY', 'ENT_ARCH'],
  ARRAY['ERM'],
  'Technical validation of evidence content, format, and completeness',
  'التحقق الفني من محتوى وشكل واكتمال الأدلة',
  true,
  'workspace'
),

(
  'EVIDENCE',
  'VALIDATION',
  'CROSS_TEAM',
  'PEER_REVIEW',
  ARRAY['CYBER_GOV', 'DATA_GOV', 'PRIVACY'],
  ARRAY['ERM'],
  ARRAY['AUDIT', 'QUALITY'],
  ARRAY['EXEC_STRATEGY'],
  'Cross-team validation ensuring evidence meets multi-domain requirements',
  'التحقق عبر الفرق لضمان تلبية الأدلة لمتطلبات متعددة المجالات',
  true,
  'workspace'
),

(
  'EVIDENCE',
  'VALIDATION',
  'APPROVAL',
  'FINAL_APPROVAL',
  ARRAY['AUDIT'],
  ARRAY['ERM'],
  ARRAY['EXEC_STRATEGY'],
  ARRAY['ALL_TEAMS'],
  'Final approval of validated evidence for compliance records',
  'الموافقة النهائية على الأدلة المحققة لسجلات الامتثال',
  true,
  'workspace'
),

-- Evidence Lifecycle Management
(
  'EVIDENCE',
  'LIFECYCLE',
  'RETENTION',
  'MANAGE',
  ARRAY['DATA_GOV', 'QUALITY'],
  ARRAY['PRIVACY'],
  ARRAY['AUDIT', 'FINANCE'],
  ARRAY['ERM'],
  'Manage evidence retention, archival, and disposal per regulatory requirements',
  'إدارة الاحتفاظ بالأدلة والأرشفة والتخلص وفقًا للمتطلبات التنظيمية',
  true,
  'workspace'
),

-- ============================================================================
-- RISK ASSESSMENT & MANAGEMENT RACI
-- ============================================================================

-- Risk Identification
(
  'RISK',
  'ASSESSMENT',
  'IDENTIFICATION',
  'IDENTIFY',
  ARRAY['ERM'],
  ARRAY['EXEC_STRATEGY'],
  ARRAY['CYBER_GOV', 'DATA_GOV', 'BCM_DR', 'VENDOR_RISK'],
  ARRAY['ALL_TEAMS'],
  'Identify and catalog risks across all business domains',
  'تحديد وفهرسة المخاطر عبر جميع مجالات الأعمال',
  true,
  'workspace'
),

-- Risk Evaluation
(
  'RISK',
  'ASSESSMENT',
  'EVALUATION',
  'ASSESS',
  ARRAY['ERM', 'CYBER_GOV'],
  ARRAY['EXEC_STRATEGY'],
  ARRAY['AUDIT', 'BCM_DR'],
  ARRAY['PMO', 'FINANCE'],
  'Evaluate risk likelihood, impact, and calculate risk scores',
  'تقييم احتمالية المخاطر والتأثير وحساب درجات المخاطر',
  true,
  'workspace'
),

-- Risk Mitigation Planning
(
  'RISK',
  'MITIGATION',
  'PLANNING',
  'PLAN',
  ARRAY['ERM'],
  ARRAY['RISK_OWNER'],
  ARRAY['PMO', 'FINANCE', 'CYBER_GOV'],
  ARRAY['EXEC_STRATEGY', 'AUDIT'],
  'Develop risk mitigation strategies and action plans',
  'تطوير استراتيجيات تخفيف المخاطر وخطط العمل',
  true,
  'workspace'
),

-- Risk Mitigation Implementation
(
  'RISK',
  'MITIGATION',
  'IMPLEMENTATION',
  'EXECUTE',
  ARRAY['RISK_OWNER', 'PMO'],
  ARRAY['ERM'],
  ARRAY['CYBER_GOV', 'AUDIT'],
  ARRAY['EXEC_STRATEGY'],
  'Implement risk mitigation controls and measures',
  'تنفيذ ضوابط وتدابير تخفيف المخاطر',
  true,
  'workspace'
),

-- Risk Monitoring
(
  'RISK',
  'MONITORING',
  'CONTINUOUS',
  'MONITOR',
  ARRAY['ERM', 'SOC_OPS'],
  ARRAY['CYBER_GOV'],
  ARRAY['AUDIT'],
  ARRAY['EXEC_STRATEGY'],
  'Continuous monitoring of risk indicators and control effectiveness',
  'المراقبة المستمرة لمؤشرات المخاطر وفعالية الضوابط',
  true,
  'workspace'
),

-- ============================================================================
-- CONTROL TESTING & ASSESSMENT RACI
-- ============================================================================

-- Control Design Assessment
(
  'CONTROL',
  'TESTING',
  'DESIGN',
  'ASSESS_DESIGN',
  ARRAY['AUDIT'],
  ARRAY['ERM'],
  ARRAY['CYBER_GOV', 'PROCESS_OWNER'],
  ARRAY['QUALITY'],
  'Assess control design effectiveness and suitability',
  'تقييم فعالية ومناسبة تصميم الضوابط',
  true,
  'workspace'
),

-- Control Operating Effectiveness
(
  'CONTROL',
  'TESTING',
  'EXECUTION',
  'TEST_OPERATION',
  ARRAY['AUDIT', 'PROCESS_OWNER'],
  ARRAY['ERM'],
  ARRAY['CYBER_GOV', 'QUALITY'],
  ARRAY['EXEC_STRATEGY'],
  'Test control operating effectiveness through sampling and testing',
  'اختبار فعالية تشغيل الضوابط من خلال أخذ العينات والاختبار',
  true,
  'workspace'
),

-- Control Remediation
(
  'CONTROL',
  'REMEDIATION',
  'PLANNING',
  'PLAN_FIX',
  ARRAY['PROCESS_OWNER'],
  ARRAY['ERM'],
  ARRAY['PMO', 'AUDIT'],
  ARRAY['EXEC_STRATEGY'],
  'Plan remediation for failed or ineffective controls',
  'تخطيط المعالجة للضوابط الفاشلة أو غير الفعالة',
  true,
  'workspace'
),

(
  'CONTROL',
  'REMEDIATION',
  'IMPLEMENTATION',
  'IMPLEMENT_FIX',
  ARRAY['PROCESS_OWNER', 'PMO'],
  ARRAY['ERM'],
  ARRAY['AUDIT', 'CYBER_GOV'],
  ARRAY['EXEC_STRATEGY'],
  'Implement control remediation and improvements',
  'تنفيذ معالجة وتحسينات الضوابط',
  true,
  'workspace'
),

-- ============================================================================
-- POLICY LIFECYCLE MANAGEMENT RACI
-- ============================================================================

-- Policy Creation
(
  'POLICY',
  'CREATION',
  'DRAFTING',
  'DRAFT',
  ARRAY['QUALITY', 'SUBJECT_MATTER_TEAM'],
  ARRAY['CYBER_GOV'],
  ARRAY['PRIVACY', 'AUDIT', 'HR_GOV'],
  ARRAY['ERM'],
  'Draft new policies based on regulatory requirements or business needs',
  'صياغة سياسات جديدة بناءً على المتطلبات التنظيمية أو احتياجات العمل',
  true,
  'workspace'
),

-- Policy Review
(
  'POLICY',
  'CREATION',
  'REVIEW',
  'LEGAL_REVIEW',
  ARRAY['PRIVACY'],
  ARRAY['EXEC_STRATEGY'],
  ARRAY['AUDIT', 'ERM', 'CYBER_GOV'],
  ARRAY['QUALITY'],
  'Legal and compliance review of policy drafts',
  'المراجعة القانونية والامتثال لمسودات السياسات',
  true,
  'workspace'
),

-- Policy Approval
(
  'POLICY',
  'CREATION',
  'APPROVAL',
  'APPROVE',
  ARRAY['EXEC_STRATEGY'],
  ARRAY['CYBER_GOV'],
  ARRAY['AUDIT', 'ERM'],
  ARRAY['ALL_TEAMS'],
  'Executive approval of policies before publication',
  'الموافقة التنفيذية على السياسات قبل النشر',
  true,
  'workspace'
),

-- Policy Implementation
(
  'POLICY',
  'IMPLEMENTATION',
  'ROLLOUT',
  'DEPLOY',
  ARRAY['QUALITY', 'HR_GOV'],
  ARRAY['POLICY_OWNER'],
  ARRAY['PMO', 'SVC_OPS'],
  ARRAY['ALL_TEAMS'],
  'Roll out approved policies with training and awareness',
  'نشر السياسات المعتمدة مع التدريب والتوعية',
  true,
  'workspace'
),

-- Policy Monitoring
(
  'POLICY',
  'MONITORING',
  'COMPLIANCE',
  'MONITOR',
  ARRAY['AUDIT', 'ERM'],
  ARRAY['POLICY_OWNER'],
  ARRAY['QUALITY'],
  ARRAY['EXEC_STRATEGY'],
  'Monitor policy compliance and effectiveness',
  'مراقبة الامتثال للسياسات وفعاليتها',
  true,
  'workspace'
),

-- ============================================================================
-- INCIDENT RESPONSE RACI
-- ============================================================================

-- Incident Detection
(
  'INCIDENT',
  'RESPONSE',
  'DETECTION',
  'DETECT',
  ARRAY['SOC_OPS'],
  ARRAY['CYBER_GOV'],
  ARRAY['SVC_OPS'],
  ARRAY['ERM', 'EXEC_STRATEGY'],
  'Detect and identify security incidents through monitoring',
  'اكتشاف وتحديد الحوادث الأمنية من خلال المراقبة',
  true,
  'workspace'
),

-- Incident Triage
(
  'INCIDENT',
  'RESPONSE',
  'TRIAGE',
  'ASSESS',
  ARRAY['SOC_OPS', 'CYBER_GOV'],
  ARRAY['CYBER_GOV'],
  ARRAY['BCM_DR', 'PRIVACY'],
  ARRAY['ERM', 'EXEC_STRATEGY'],
  'Triage incidents to determine severity and response requirements',
  'فرز الحوادث لتحديد الخطورة ومتطلبات الاستجابة',
  true,
  'workspace'
),

-- Incident Containment
(
  'INCIDENT',
  'RESPONSE',
  'CONTAINMENT',
  'CONTAIN',
  ARRAY['SOC_OPS', 'CLOUD_INFRA'],
  ARRAY['CYBER_GOV'],
  ARRAY['APP_ENG', 'BCM_DR'],
  ARRAY['EXEC_STRATEGY', 'PRIVACY'],
  'Contain incident to prevent further damage or spread',
  'احتواء الحادث لمنع مزيد من الضرر أو الانتشار',
  true,
  'workspace'
),

-- Incident Recovery
(
  'INCIDENT',
  'RESPONSE',
  'RECOVERY',
  'RECOVER',
  ARRAY['BCM_DR', 'CLOUD_INFRA', 'APP_ENG'],
  ARRAY['CYBER_GOV'],
  ARRAY['SOC_OPS', 'SVC_OPS'],
  ARRAY['EXEC_STRATEGY', 'ERM'],
  'Recover systems and services to normal operations',
  'استعادة الأنظمة والخدمات إلى العمليات الطبيعية',
  true,
  'workspace'
),

-- ============================================================================
-- AUDIT EXECUTION RACI
-- ============================================================================

-- Audit Planning
(
  'AUDIT',
  'EXECUTION',
  'PLANNING',
  'PLAN',
  ARRAY['AUDIT'],
  ARRAY['AUDIT'],
  ARRAY['ERM', 'CYBER_GOV'],
  ARRAY['EXEC_STRATEGY', 'PROCESS_OWNERS'],
  'Plan audit scope, objectives, and resource allocation',
  'تخطيط نطاق التدقيق والأهداف وتخصيص الموارد',
  true,
  'workspace'
),

-- Audit Fieldwork
(
  'AUDIT',
  'EXECUTION',
  'FIELDWORK',
  'EXECUTE',
  ARRAY['AUDIT'],
  ARRAY['AUDIT'],
  ARRAY['PROCESS_OWNERS'],
  ARRAY['ERM', 'CYBER_GOV'],
  'Execute audit fieldwork including testing and evidence collection',
  'تنفيذ العمل الميداني للتدقيق بما في ذلك الاختبار وجمع الأدلة',
  true,
  'workspace'
),

-- Audit Reporting
(
  'AUDIT',
  'EXECUTION',
  'REPORTING',
  'REPORT',
  ARRAY['AUDIT'],
  ARRAY['AUDIT'],
  ARRAY['ERM', 'PROCESS_OWNERS'],
  ARRAY['EXEC_STRATEGY', 'CYBER_GOV'],
  'Prepare and issue audit reports with findings and recommendations',
  'إعداد وإصدار تقارير التدقيق مع النتائج والتوصيات',
  true,
  'workspace'
),

-- Finding Remediation
(
  'AUDIT',
  'REMEDIATION',
  'ACTION',
  'REMEDIATE',
  ARRAY['PROCESS_OWNERS', 'PMO'],
  ARRAY['ERM'],
  ARRAY['AUDIT'],
  ARRAY['EXEC_STRATEGY'],
  'Remediate audit findings through corrective actions',
  'معالجة نتائج التدقيق من خلال الإجراءات التصحيحية',
  true,
  'workspace'
),

-- ============================================================================
-- VENDOR RISK MANAGEMENT RACI
-- ============================================================================

-- Vendor Assessment
(
  'VENDOR',
  'RISK',
  'ASSESSMENT',
  'ASSESS',
  ARRAY['VENDOR_RISK'],
  ARRAY['VENDOR_RISK'],
  ARRAY['CYBER_GOV', 'PRIVACY', 'FINANCE'],
  ARRAY['ERM'],
  'Assess vendor risks through due diligence and questionnaires',
  'تقييم مخاطر الموردين من خلال العناية الواجبة والاستبيانات',
  true,
  'workspace'
),

-- Vendor Onboarding
(
  'VENDOR',
  'ONBOARDING',
  'APPROVAL',
  'ONBOARD',
  ARRAY['VENDOR_RISK', 'FINANCE'],
  ARRAY['VENDOR_RISK'],
  ARRAY['CYBER_GOV', 'PRIVACY', 'HR_GOV'],
  ARRAY['ERM', 'EXEC_STRATEGY'],
  'Onboard approved vendors with appropriate controls',
  'إدخال الموردين المعتمدين مع الضوابط المناسبة',
  true,
  'workspace'
),

-- Vendor Monitoring
(
  'VENDOR',
  'MONITORING',
  'CONTINUOUS',
  'MONITOR',
  ARRAY['VENDOR_RISK'],
  ARRAY['VENDOR_RISK'],
  ARRAY['CYBER_GOV', 'SVC_OPS'],
  ARRAY['ERM', 'FINANCE'],
  'Continuous monitoring of vendor performance and risks',
  'المراقبة المستمرة لأداء الموردين والمخاطر',
  true,
  'workspace'
),

-- ============================================================================
-- DATA GOVERNANCE RACI
-- ============================================================================

-- Data Classification
(
  'DATA',
  'GOVERNANCE',
  'CLASSIFICATION',
  'CLASSIFY',
  ARRAY['DATA_GOV'],
  ARRAY['DATA_GOV'],
  ARRAY['PRIVACY', 'CYBER_GOV'],
  ARRAY['ALL_DATA_OWNERS'],
  'Classify data according to sensitivity and regulatory requirements',
  'تصنيف البيانات وفقًا للحساسية والمتطلبات التنظيمية',
  true,
  'workspace'
),

-- Data Protection
(
  'DATA',
  'PROTECTION',
  'IMPLEMENTATION',
  'PROTECT',
  ARRAY['DATA_GOV', 'CYBER_GOV'],
  ARRAY['DATA_GOV'],
  ARRAY['PRIVACY', 'CLOUD_INFRA'],
  ARRAY['ERM', 'AUDIT'],
  'Implement data protection controls based on classification',
  'تنفيذ ضوابط حماية البيانات بناءً على التصنيف',
  true,
  'workspace'
),

-- Data Retention
(
  'DATA',
  'LIFECYCLE',
  'RETENTION',
  'RETAIN',
  ARRAY['DATA_GOV', 'QUALITY'],
  ARRAY['PRIVACY'],
  ARRAY['FINANCE', 'AUDIT'],
  ARRAY['ERM'],
  'Manage data retention and disposal per regulatory requirements',
  'إدارة الاحتفاظ بالبيانات والتخلص منها وفقًا للمتطلبات التنظيمية',
  true,
  'workspace'
),

-- ============================================================================
-- BUSINESS CONTINUITY RACI
-- ============================================================================

-- BCP Planning
(
  'BCM',
  'PLANNING',
  'DEVELOPMENT',
  'PLAN',
  ARRAY['BCM_DR'],
  ARRAY['BCM_DR'],
  ARRAY['ERM', 'CLOUD_INFRA', 'SVC_OPS'],
  ARRAY['EXEC_STRATEGY', 'ALL_TEAMS'],
  'Develop business continuity plans and procedures',
  'تطوير خطط وإجراءات استمرارية الأعمال',
  true,
  'workspace'
),

-- DR Testing
(
  'BCM',
  'TESTING',
  'EXECUTION',
  'TEST',
  ARRAY['BCM_DR', 'CLOUD_INFRA'],
  ARRAY['BCM_DR'],
  ARRAY['SVC_OPS', 'APP_ENG'],
  ARRAY['ERM', 'EXEC_STRATEGY'],
  'Execute disaster recovery tests and simulations',
  'تنفيذ اختبارات ومحاكاة التعافي من الكوارث',
  true,
  'workspace'
),

-- Crisis Management
(
  'BCM',
  'CRISIS',
  'RESPONSE',
  'MANAGE',
  ARRAY['BCM_DR', 'EXEC_STRATEGY'],
  ARRAY['EXEC_STRATEGY'],
  ARRAY['CYBER_GOV', 'ERM', 'PRIVACY'],
  ARRAY['ALL_TEAMS'],
  'Manage crisis response and communication',
  'إدارة الاستجابة للأزمات والتواصل',
  true,
  'workspace'
)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- UPDATE RACI WITH SLA AND VALIDATION REQUIREMENTS
-- ============================================================================

-- Set SLA hours for critical processes
UPDATE raci_matrix SET
  sla_hours = CASE
    WHEN process_code = 'RESPONSE' AND domain_code = 'INCIDENT' THEN 2
    WHEN process_code = 'COLLECTION' AND stage_code = 'GATHERING' THEN 48
    WHEN process_code = 'VALIDATION' AND stage_code = 'APPROVAL' THEN 24
    WHEN process_code = 'ASSESSMENT' AND domain_code = 'RISK' THEN 72
    WHEN process_code = 'TESTING' AND domain_code = 'CONTROL' THEN 120
    WHEN process_code = 'CREATION' AND domain_code = 'POLICY' THEN 240
    ELSE 96
  END,
  validation_required = CASE
    WHEN stage_code IN ('VALIDATION', 'APPROVAL', 'REVIEW') THEN true
    WHEN domain_code IN ('EVIDENCE', 'AUDIT', 'CONTROL') THEN true
    ELSE false
  END,
  escalation_threshold_hours = CASE
    WHEN domain_code = 'INCIDENT' THEN 4
    WHEN domain_code = 'EVIDENCE' THEN 72
    WHEN domain_code = 'RISK' THEN 96
    ELSE 120
  END
WHERE active = true;

-- ============================================================================
-- CREATE TEAM FUNCTION MAPPINGS
-- ============================================================================

-- Map team codes to business functions for dynamic RACI assignment
CREATE TABLE IF NOT EXISTS team_function_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code VARCHAR(50) NOT NULL,
  function_code VARCHAR(100) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  is_backup BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_code, function_code)
);

INSERT INTO team_function_mappings (team_code, function_code, is_primary) VALUES
  ('ERM', 'RISK_OWNER', true),
  ('CYBER_GOV', 'SECURITY_OWNER', true),
  ('DATA_GOV', 'DATA_OWNER', true),
  ('PRIVACY', 'PRIVACY_OWNER', true),
  ('AUDIT', 'AUDIT_LEAD', true),
  ('BCM_DR', 'BCM_COORDINATOR', true),
  ('VENDOR_RISK', 'VENDOR_MANAGER', true),
  ('PMO', 'PROJECT_MANAGER', true),
  ('QUALITY', 'POLICY_OWNER', true),
  ('SOC_OPS', 'INCIDENT_HANDLER', true),
  ('CLOUD_INFRA', 'INFRASTRUCTURE_OWNER', true),
  ('APP_ENG', 'APPLICATION_OWNER', true),
  ('HR_GOV', 'HR_PROCESS_OWNER', true),
  ('FINANCE', 'FINANCIAL_CONTROLLER', true),
  ('SVC_OPS', 'SERVICE_OWNER', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RACI AUTOMATION RULES
-- ============================================================================

-- Create automation rules for RACI-based task assignment
INSERT INTO automation_rules (
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  trigger_event,
  trigger_conditions,
  actions,
  execution_order,
  active
) VALUES
(
  'RACI_AUTO_ASSIGN_EVIDENCE',
  'Auto-assign evidence tasks based on RACI',
  'Automatically assigns evidence collection tasks to responsible teams per RACI matrix',
  'assignment',
  'evidence_request_created',
  jsonb_build_object(
    'entity_type', 'evidence_request',
    'auto_assign', true
  ),
  jsonb_build_array(
    jsonb_build_object(
      'action', 'assign_to_team',
      'use_raci', true,
      'raci_role', 'responsible',
      'domain_code', 'EVIDENCE',
      'process_code', 'COLLECTION'
    )
  ),
  10,
  true
),
(
  'RACI_ESCALATE_SLA_BREACH',
  'Escalate to accountable team on SLA breach',
  'Escalates tasks to accountable team when SLA is breached',
  'escalation',
  'sla_breach',
  jsonb_build_object(
    'breach_percentage', 100,
    'use_raci_escalation', true
  ),
  jsonb_build_array(
    jsonb_build_object(
      'action', 'escalate_to_team',
      'use_raci', true,
      'raci_role', 'accountable',
      'notification_priority', 'high'
    )
  ),
  20,
  true
)
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================================
-- STATISTICS
-- ============================================================================

DO $$
DECLARE
  v_raci_count INTEGER;
  v_domain_count INTEGER;
  v_process_count INTEGER;
  v_validation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_raci_count FROM raci_matrix WHERE active = true;
  SELECT COUNT(DISTINCT domain_code) INTO v_domain_count FROM raci_matrix WHERE active = true;
  SELECT COUNT(DISTINCT process_code) INTO v_process_count FROM raci_matrix WHERE active = true;
  SELECT COUNT(*) INTO v_validation_count FROM raci_matrix WHERE validation_required = true;

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'RACI MATRIX CONFIGURATION COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Total RACI Entries: %', v_raci_count;
  RAISE NOTICE 'Domains Covered: %', v_domain_count;
  RAISE NOTICE 'Processes Defined: %', v_process_count;
  RAISE NOTICE 'Validation Points: %', v_validation_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'RACI matrix ready for process orchestration!';
  RAISE NOTICE '=================================================';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE raci_matrix IS 'Comprehensive RACI matrix defining team responsibilities for all GRC processes';
COMMENT ON TABLE team_function_mappings IS 'Maps teams to business functions for dynamic RACI role resolution';