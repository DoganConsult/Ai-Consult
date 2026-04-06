-- ============================================================================
-- AGRC-OS EXECUTION PLATFORM - 18 TEAMS POPULATION
-- Migration 023: Populate the 18 Core Teams with Enhanced Metadata
-- Multi-Tenant Architecture: Applied per tenant_<tenant_id> schema
-- ============================================================================

-- First ensure the teams table has all required columns
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS team_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS parent_team_id UUID REFERENCES teams(team_id),
  ADD COLUMN IF NOT EXISTS team_type VARCHAR(20) DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Widen team_type if it's too narrow (VARCHAR(10) can't hold 'operational')
ALTER TABLE teams ALTER COLUMN team_type TYPE VARCHAR(30);

-- Clean up team_code NULLs/duplicates before adding unique constraint
UPDATE teams SET team_code = 'legacy_' || team_id::text WHERE team_code IS NULL;
DELETE FROM teams a USING teams b WHERE a.ctid > b.ctid AND a.team_code = b.team_code;

-- Add unique constraint on team_code if not exists (schema-aware check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON c.conrelid = r.oid
    WHERE r.relnamespace = current_schema()::regnamespace
      AND c.conname = 'teams_team_code_key'
  ) THEN
    ALTER TABLE teams ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);
  END IF;
END $$;

-- ============================================================================
-- POPULATE 18 CORE TEAMS
-- ============================================================================

-- Use INSERT ... ON CONFLICT to handle existing teams gracefully
INSERT INTO teams (
  team_code,
  name_en,
  name_ar,
  team_type,
  description_en,
  description_ar,
  metadata,
  active
) VALUES

-- 1. Executive / Strategy / GRC Steering
(
  'EXEC_STRATEGY',
  'Executive / Strategy / GRC Steering',
  'اللجنة التنفيذية / الاستراتيجية / توجيه الحوكمة',
  'executive',
  'Strategic oversight and governance steering committee responsible for setting GRC direction, approving policies, and overseeing enterprise risk posture',
  'الإشراف الاستراتيجي ولجنة توجيه الحوكمة المسؤولة عن تحديد اتجاه الحوكمة والمخاطر والامتثال',
  jsonb_build_object(
    'tier', 'oversight',
    'usage', 'approver',
    'criticality', 'critical',
    'validation_role', 'final_approval',
    'can_override', true,
    'escalation_endpoint', true,
    'typical_size', '5-10',
    'meeting_frequency', 'monthly',
    'kpi_ownership', ARRAY['compliance_score', 'risk_appetite', 'control_effectiveness']
  ),
  true
),

-- 2. Enterprise Risk Management
(
  'ERM',
  'Enterprise Risk Management',
  'إدارة مخاطر المؤسسة',
  'operational',
  'Enterprise-wide risk identification, assessment, mitigation, and monitoring. Maintains risk registers, conducts risk assessments, and coordinates risk response strategies',
  'تحديد وتقييم وتخفيف ومراقبة المخاطر على مستوى المؤسسة',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'daily',
    'criticality', 'critical',
    'validation_role', 'risk_validation',
    'evidence_types', ARRAY['risk_assessment', 'control_testing', 'risk_register', 'mitigation_plan'],
    'can_escalate', true,
    'typical_size', '10-20',
    'compliance_frameworks', ARRAY['ISO31000', 'COSO-ERM'],
    'kpi_ownership', ARRAY['risk_score', 'open_risks', 'mitigation_effectiveness']
  ),
  true
),

-- 3. Cybersecurity Governance
(
  'CYBER_GOV',
  'Cybersecurity Governance',
  'حوكمة الأمن السيبراني',
  'operational',
  'Cybersecurity policy, standards, compliance management, and security architecture. Ensures alignment with NCA-ECC, SAMA-CSF, and international security frameworks',
  'سياسات ومعايير وإدارة الامتثال للأمن السيبراني',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'daily',
    'criticality', 'critical',
    'validation_role', 'security_validation',
    'evidence_types', ARRAY['security_logs', 'pen_test', 'vulnerability_scan', 'security_config', 'access_reviews'],
    'can_block_release', true,
    'typical_size', '15-25',
    'compliance_frameworks', ARRAY['NCA-ECC', 'SAMA-CSF', 'ISO27001', 'NIST-CSF'],
    'kpi_ownership', ARRAY['security_score', 'vulnerability_count', 'patch_compliance']
  ),
  true
),

-- 4. SOC / Cyber Operations
(
  'SOC_OPS',
  'SOC / Cyber Operations',
  'مركز العمليات الأمنية',
  'operational',
  'Security operations center managing 24/7 monitoring, incident response, threat hunting, and security tool operations',
  'مركز العمليات الأمنية لإدارة المراقبة والاستجابة للحوادث على مدار الساعة',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'continuous',
    'criticality', 'critical',
    'validation_role', 'incident_validation',
    'evidence_types', ARRAY['siem_logs', 'incident_reports', 'forensics', 'threat_intel'],
    '24x7_operations', true,
    'typical_size', '20-40',
    'shift_based', true,
    'compliance_frameworks', ARRAY['NCA-ECC', 'SAMA-CSF'],
    'kpi_ownership', ARRAY['mttr', 'incident_count', 'false_positive_rate']
  ),
  true
),

-- 5. IAM / Identity / Access Governance
(
  'IAM_GOV',
  'IAM / Identity / Access Governance',
  'حوكمة إدارة الهوية والوصول',
  'operational',
  'Identity and access management governance including privileged access, access reviews, segregation of duties, and identity lifecycle',
  'حوكمة إدارة الهوية والوصول بما في ذلك الوصول المميز ومراجعات الوصول',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'daily',
    'criticality', 'high',
    'validation_role', 'access_validation',
    'evidence_types', ARRAY['access_reviews', 'privilege_reports', 'sod_violations', 'termination_reports'],
    'approval_authority', ARRAY['access_requests', 'privilege_elevation'],
    'typical_size', '8-15',
    'compliance_frameworks', ARRAY['NCA-IAM', 'SAMA-CSF'],
    'kpi_ownership', ARRAY['orphan_accounts', 'access_review_completion', 'privilege_count']
  ),
  true
),

-- 6. Data Governance / Data Management
(
  'DATA_GOV',
  'Data Governance / Data Management',
  'حوكمة وإدارة البيانات',
  'operational',
  'Data classification, protection, lifecycle management, quality, and compliance with data regulations including PDPL',
  'تصنيف وحماية وإدارة دورة حياة البيانات والامتثال للوائح البيانات',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'daily',
    'criticality', 'high',
    'validation_role', 'data_validation',
    'evidence_types', ARRAY['data_classification', 'dpia', 'data_inventory', 'retention_reports'],
    'regulatory_focus', ARRAY['PDPL', 'GDPR'],
    'typical_size', '10-20',
    'compliance_frameworks', ARRAY['PDPL', 'NDMO', 'ISO27701'],
    'kpi_ownership', ARRAY['data_quality_score', 'classification_coverage', 'retention_compliance']
  ),
  true
),

-- 7. Privacy / PDPL / Legal Compliance
(
  'PRIVACY',
  'Privacy / PDPL / Legal Compliance',
  'الخصوصية / PDPL / الامتثال القانوني',
  'operational',
  'Privacy compliance, personal data protection, consent management, data subject rights, and legal compliance coordination',
  'امتثال الخصوصية وحماية البيانات الشخصية وإدارة الموافقة وحقوق أصحاب البيانات',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'daily',
    'criticality', 'high',
    'validation_role', 'privacy_validation',
    'evidence_types', ARRAY['consent_records', 'dpia', 'breach_notifications', 'dsr_logs'],
    'legal_authority', true,
    'typical_size', '5-10',
    'compliance_frameworks', ARRAY['PDPL', 'GDPR'],
    'kpi_ownership', ARRAY['dsr_response_time', 'consent_rate', 'privacy_incidents']
  ),
  true
),

-- 8. Internal Audit / Assurance
(
  'AUDIT',
  'Internal Audit / Assurance',
  'التدقيق الداخلي / التأكيد',
  'operational',
  'Independent assurance, compliance verification, control testing, and audit execution across all GRC domains',
  'التأكيد المستقل والتحقق من الامتثال واختبار الضوابط وتنفيذ التدقيق',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'weekly',
    'criticality', 'high',
    'validation_role', 'audit_validation',
    'evidence_types', ARRAY['audit_reports', 'control_tests', 'compliance_certificates', 'findings'],
    'independence_required', true,
    'typical_size', '10-15',
    'rotation_policy', true,
    'compliance_frameworks', ARRAY['IIA', 'ISACA'],
    'kpi_ownership', ARRAY['audit_coverage', 'finding_closure_rate', 'audit_plan_completion']
  ),
  true
),

-- 9. Business Continuity / DR / Crisis
(
  'BCM_DR',
  'Business Continuity / DR / Crisis',
  'استمرارية الأعمال / التعافي من الكوارث',
  'operational',
  'Business continuity planning, disaster recovery, crisis management, and resilience testing',
  'تخطيط استمرارية الأعمال والتعافي من الكوارث وإدارة الأزمات',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'weekly',
    'criticality', 'high',
    'validation_role', 'bcm_validation',
    'evidence_types', ARRAY['bia', 'dr_tests', 'recovery_plans', 'crisis_protocols'],
    'emergency_authority', true,
    'typical_size', '8-12',
    'on_call_required', true,
    'compliance_frameworks', ARRAY['ISO22301', 'SAMA-BCM'],
    'kpi_ownership', ARRAY['rto_compliance', 'rpo_compliance', 'dr_test_success']
  ),
  true
),

-- 10. Cloud / Infrastructure / Hosting
(
  'CLOUD_INFRA',
  'Cloud / Infrastructure / Hosting',
  'السحابة / البنية التحتية / الاستضافة',
  'operational',
  'Cloud security, infrastructure compliance, hosting governance, and technology risk management',
  'أمن السحابة وامتثال البنية التحتية وحوكمة الاستضافة',
  jsonb_build_object(
    'tier', 'heavy',
    'usage', 'daily',
    'criticality', 'high',
    'validation_role', 'infrastructure_validation',
    'evidence_types', ARRAY['cloud_configs', 'network_diagrams', 'vulnerability_scans', 'capacity_reports'],
    'change_approval_required', true,
    'typical_size', '15-30',
    'compliance_frameworks', ARRAY['CCC', 'CSA-CCM', 'ISO27017'],
    'kpi_ownership', ARRAY['availability', 'performance_sla', 'infrastructure_vulnerabilities']
  ),
  true
),

-- 11. Application / Platform Engineering
(
  'APP_ENG',
  'Application / Platform Engineering',
  'هندسة التطبيقات / المنصات',
  'operational',
  'Application security, secure development lifecycle, platform engineering, and DevSecOps practices',
  'أمن التطبيقات ودورة حياة التطوير الآمن وهندسة المنصات',
  jsonb_build_object(
    'tier', 'heavy',
    'usage', 'daily',
    'criticality', 'medium',
    'validation_role', 'application_validation',
    'evidence_types', ARRAY['code_reviews', 'sast_reports', 'dast_reports', 'sbom'],
    'deployment_authority', true,
    'typical_size', '20-50',
    'agile_teams', true,
    'compliance_frameworks', ARRAY['OWASP', 'SAMA-CSF', 'PCI-DSS'],
    'kpi_ownership', ARRAY['vulnerability_density', 'code_coverage', 'deployment_frequency']
  ),
  true
),

-- 12. Enterprise Architecture
(
  'ENT_ARCH',
  'Enterprise Architecture',
  'هندسة المؤسسة',
  'operational',
  'Enterprise architecture governance, standards definition, technology roadmap, and architecture review board',
  'حوكمة هندسة المؤسسة وتحديد المعايير وخارطة طريق التكنولوجيا',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'weekly',
    'criticality', 'medium',
    'validation_role', 'architecture_validation',
    'evidence_types', ARRAY['architecture_docs', 'standards', 'roadmaps', 'arb_decisions'],
    'veto_power', ARRAY['architecture_violations'],
    'typical_size', '5-10',
    'compliance_frameworks', ARRAY['TOGAF', 'SABSA'],
    'kpi_ownership', ARRAY['architecture_debt', 'standard_compliance', 'reuse_rate']
  ),
  true
),

-- 13. PMO / Transformation / Program Delivery
(
  'PMO',
  'PMO / Transformation / Program Delivery',
  'مكتب إدارة المشاريع / التحول / تسليم البرامج',
  'operational',
  'Program management office, transformation initiatives, project delivery, and change management',
  'مكتب إدارة المشاريع ومبادرات التحول وتسليم المشاريع',
  jsonb_build_object(
    'tier', 'heavy',
    'usage', 'daily',
    'criticality', 'medium',
    'validation_role', 'project_validation',
    'evidence_types', ARRAY['project_plans', 'status_reports', 'risk_logs', 'change_requests'],
    'budget_authority', true,
    'typical_size', '10-20',
    'methodology', ARRAY['Agile', 'Waterfall', 'Hybrid'],
    'compliance_frameworks', ARRAY['PMI', 'PRINCE2'],
    'kpi_ownership', ARRAY['project_success_rate', 'budget_variance', 'schedule_variance']
  ),
  true
),

-- 14. Service Operations / ITSM
(
  'SVC_OPS',
  'Service Operations / ITSM',
  'عمليات الخدمة / ITSM',
  'operational',
  'IT service management, incident management, problem management, and service desk operations',
  'إدارة خدمات تكنولوجيا المعلومات وإدارة الحوادث والمشاكل',
  jsonb_build_object(
    'tier', 'heavy',
    'usage', 'continuous',
    'criticality', 'medium',
    'validation_role', 'service_validation',
    'evidence_types', ARRAY['incident_tickets', 'problem_records', 'change_logs', 'sla_reports'],
    '24x7_operations', true,
    'typical_size', '30-60',
    'shift_based', true,
    'compliance_frameworks', ARRAY['ITIL', 'ISO20000'],
    'kpi_ownership', ARRAY['ticket_resolution_time', 'first_call_resolution', 'service_availability']
  ),
  true
),

-- 15. Vendor / Procurement / Third-Party Risk
(
  'VENDOR_RISK',
  'Vendor / Procurement / Third-Party Risk',
  'مخاطر الموردين / المشتريات / الطرف الثالث',
  'operational',
  'Third-party risk management, vendor governance, procurement compliance, and supply chain security',
  'إدارة مخاطر الطرف الثالث وحوكمة الموردين وامتثال المشتريات',
  jsonb_build_object(
    'tier', 'core',
    'usage', 'daily',
    'criticality', 'high',
    'validation_role', 'vendor_validation',
    'evidence_types', ARRAY['vendor_assessments', 'contracts', 'sla_performance', 'risk_ratings'],
    'contract_authority', true,
    'typical_size', '8-15',
    'compliance_frameworks', ARRAY['ISO27036', 'SAMA-OSR'],
    'kpi_ownership', ARRAY['vendor_risk_score', 'contract_compliance', 'vendor_incidents']
  ),
  true
),

-- 16. HR / Workforce Governance
(
  'HR_GOV',
  'HR / Workforce Governance',
  'الموارد البشرية / حوكمة القوى العاملة',
  'operational',
  'Human resources governance, workforce compliance, background checks, and employee lifecycle management',
  'حوكمة الموارد البشرية وامتثال القوى العاملة والتحقق من الخلفية',
  jsonb_build_object(
    'tier', 'heavy',
    'usage', 'weekly',
    'criticality', 'medium',
    'validation_role', 'hr_validation',
    'evidence_types', ARRAY['background_checks', 'training_records', 'nda', 'termination_checklists'],
    'pii_handler', true,
    'typical_size', '10-20',
    'compliance_frameworks', ARRAY['MHRSD', 'ISO30408'],
    'kpi_ownership', ARRAY['training_compliance', 'screening_completion', 'turnover_rate']
  ),
  true
),

-- 17. Finance / Budget Control
(
  'FINANCE',
  'Finance / Budget Control',
  'المالية / مراقبة الميزانية',
  'operational',
  'Financial controls, budget management, financial compliance, and fraud prevention',
  'الضوابط المالية وإدارة الميزانية والامتثال المالي',
  jsonb_build_object(
    'tier', 'approver',
    'usage', 'weekly',
    'criticality', 'high',
    'validation_role', 'financial_validation',
    'evidence_types', ARRAY['financial_reports', 'budgets', 'invoices', 'payment_approvals'],
    'approval_limits', jsonb_build_object('low', 10000, 'medium', 100000, 'high', 1000000),
    'typical_size', '10-20',
    'compliance_frameworks', ARRAY['IFRS', 'ZATCA', 'SOCPA'],
    'kpi_ownership', ARRAY['budget_utilization', 'cost_variance', 'payment_cycle']
  ),
  true
),

-- 18. Quality / Policy / Documentation Office
(
  'QUALITY',
  'Quality / Policy / Documentation Office',
  'الجودة / السياسات / مكتب التوثيق',
  'operational',
  'Quality assurance, policy management, documentation control, and process improvement',
  'ضمان الجودة وإدارة السياسات ومراقبة الوثائق',
  jsonb_build_object(
    'tier', 'heavy',
    'usage', 'daily',
    'criticality', 'medium',
    'validation_role', 'quality_validation',
    'evidence_types', ARRAY['policies', 'procedures', 'work_instructions', 'quality_metrics'],
    'document_control', true,
    'typical_size', '8-12',
    'compliance_frameworks', ARRAY['ISO9001', 'ISO19600'],
    'kpi_ownership', ARRAY['policy_coverage', 'document_currency', 'process_maturity']
  ),
  true
)

ON CONFLICT (team_code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  team_type = EXCLUDED.team_type,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  metadata = EXCLUDED.metadata,
  active = EXCLUDED.active,
  updated_at = NOW();

-- ============================================================================
-- CREATE TEAM HIERARCHY
-- ============================================================================

-- Set parent relationships for teams reporting to Executive
UPDATE teams
SET parent_team_id = (SELECT team_id FROM teams WHERE team_code = 'EXEC_STRATEGY')
WHERE team_code IN ('ERM', 'CYBER_GOV', 'AUDIT', 'PRIVACY')
  AND team_code != 'EXEC_STRATEGY';

-- ============================================================================
-- TEAM COLLABORATION DEFAULTS
-- ============================================================================

-- Widen columns that may be too narrow for concatenated values
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'team_collaboration_matrix' AND column_name = 'matrix_name' AND character_maximum_length < 200) THEN
    ALTER TABLE team_collaboration_matrix ALTER COLUMN matrix_name TYPE VARCHAR(200);
  END IF;
END $$;

-- Insert default collaboration requirements between teams
INSERT INTO team_collaboration_matrix (
  matrix_name,
  process_type,
  primary_team_id,
  supporting_team_id,
  collaboration_type,
  mandatory,
  sla_hours
)
SELECT
  'Evidence Validation - ' || t1.team_code || ' to ' || t2.team_code,
  'evidence_validation',
  t1.team_id,
  t2.team_id,
  'validation',
  true,
  24
FROM teams t1
CROSS JOIN teams t2
WHERE t1.team_code IN ('AUDIT', 'ERM', 'CYBER_GOV')
  AND t2.team_code IN ('DATA_GOV', 'PRIVACY', 'QUALITY')
  AND t1.team_code != t2.team_code
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEAM ESCALATION PATHS
-- ============================================================================

-- Ensure team_escalation_paths has conditions column
ALTER TABLE team_escalation_paths ADD COLUMN IF NOT EXISTS conditions JSONB;

-- Create escalation paths from all operational teams to executive
INSERT INTO team_escalation_paths (
  from_team_id,
  escalation_level,
  escalate_to_team_id,
  conditions
)
SELECT
  t1.team_id,
  1,
  t2.team_id,
  jsonb_build_object(
    'sla_breach_hours', 24,
    'priority', 'high',
    'auto_escalate', true
  )
FROM teams t1
CROSS JOIN teams t2
WHERE t1.team_type = 'operational'
  AND t2.team_code = 'EXEC_STRATEGY'
ON CONFLICT DO NOTHING;

-- Create escalation paths for critical teams
INSERT INTO team_escalation_paths (
  from_team_id,
  escalation_level,
  escalate_to_team_id,
  conditions
)
SELECT
  t1.team_id,
  1,
  t2.team_id,
  jsonb_build_object(
    'sla_breach_hours', 4,
    'priority', 'critical',
    'incident_severity', 'high'
  )
FROM teams t1
CROSS JOIN teams t2
WHERE t1.team_code = 'SOC_OPS'
  AND t2.team_code = 'CYBER_GOV'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEAM KPI ASSIGNMENTS
-- ============================================================================

-- Widen threshold_direction if needed
ALTER TABLE executive_kpis ALTER COLUMN threshold_direction TYPE VARCHAR(30);

-- Create KPIs for each team based on their metadata
INSERT INTO executive_kpis (
  kpi_code,
  kpi_category,
  name,
  description,
  owner_team_id,
  frequency,
  calculation_type,
  threshold_direction,
  target_value
)
SELECT
  team_code || '_PERFORMANCE',
  'operational',
  name_en || ' Performance Score',
  'Overall performance score for ' || name_en,
  team_id,
  'weekly',
  'composite',
  'higher_better',
  85
FROM teams
WHERE active = true AND team_code NOT LIKE 'legacy_%'
ON CONFLICT (kpi_code) DO NOTHING;

-- ============================================================================
-- TEAM NOTIFICATION PREFERENCES
-- ============================================================================

-- Widen subject column if too narrow for concatenated welcome messages
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_queue' AND column_name = 'subject' AND character_maximum_length < 200) THEN
    ALTER TABLE notification_queue ALTER COLUMN subject TYPE VARCHAR(500);
  END IF;
END $$;

-- Set default notification preferences for each team
INSERT INTO notification_queue (
  recipient_team_id,
  notification_type,
  priority,
  subject,
  body,
  delivery_channel,
  status,
  scheduled_at
)
SELECT
  team_id,
  'team_onboarding',
  'info',
  'Welcome to AGRC-OS - ' || name_en,
  'Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.',
  'in_app',
  'pending',
  NOW() + INTERVAL '1 minute'
FROM teams
WHERE active = true;

-- ============================================================================
-- STATISTICS
-- ============================================================================

DO $$
DECLARE
  v_team_count INTEGER;
  v_exec_count INTEGER;
  v_oper_count INTEGER;
  v_collab_count INTEGER;
  v_escalation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_team_count FROM teams WHERE active = true;
  SELECT COUNT(*) INTO v_exec_count FROM teams WHERE team_type = 'executive' AND active = true;
  SELECT COUNT(*) INTO v_oper_count FROM teams WHERE team_type = 'operational' AND active = true;
  SELECT COUNT(*) INTO v_collab_count FROM team_collaboration_matrix;
  SELECT COUNT(*) INTO v_escalation_count FROM team_escalation_paths;

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'AGRC-OS 18 TEAMS POPULATION COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Total Teams Created/Updated: %', v_team_count;
  RAISE NOTICE 'Executive Teams: %', v_exec_count;
  RAISE NOTICE 'Operational Teams: %', v_oper_count;
  RAISE NOTICE 'Collaboration Rules: %', v_collab_count;
  RAISE NOTICE 'Escalation Paths: %', v_escalation_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Teams are ready for process orchestration!';
  RAISE NOTICE '=================================================';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN teams.metadata IS 'Enhanced metadata including tier, usage pattern, validation roles, and team-specific configurations';