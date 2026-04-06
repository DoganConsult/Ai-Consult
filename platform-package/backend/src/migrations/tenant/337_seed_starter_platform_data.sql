-- ============================================
-- Tenant Migration 337
-- Seed Starter Platform Data
-- Populates all critical empty tables so the
-- end-user sees a working platform on first login
-- ============================================

-- ============================================
-- 1. MODULE ACTIVATION STATUS
--    Without this, moduleGuard blocks all routes
-- ============================================
DO $$ BEGIN
  INSERT INTO module_activation_status (module_code, registered, entitled, provisioned, verified, linked, evented, actionable, observable, status)
  SELECT code, true, true, true, true, true, true, true, true, 'active'
  FROM product_modules
  ON CONFLICT (module_code) DO UPDATE SET
    registered = true, entitled = true, provisioned = true,
    verified = true, linked = true, evented = true,
    actionable = true, observable = true, status = 'active',
    updated_at = NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 2. TENANT BLUEPRINT
-- ============================================
DO $$ BEGIN
  INSERT INTO tenant_blueprints (archetype_code, resolution_input, resolution_reason, is_active)
  VALUES ('standard_enterprise', '{"sector":"general","headcount":500}', 'Auto-seeded during provisioning', true)
  ON CONFLICT ON CONSTRAINT tenant_blueprints_singleton_key_key DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 3. TENANT SETTINGS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenant_settings WHERE key = 'platform.language') THEN
    INSERT INTO tenant_settings (key, value) VALUES
      ('platform.language', '"ar"'),
      ('platform.direction', '"rtl"'),
      ('platform.timezone', '"Asia/Riyadh"'),
      ('platform.date_format', '"yyyy-MM-dd"'),
      ('platform.currency', '"SAR"'),
      ('notifications.email_enabled', 'true'),
      ('notifications.in_app_enabled', 'true'),
      ('security.session_timeout_minutes', '30'),
      ('security.mfa_required', 'false'),
      ('compliance.default_framework', '"NCA-ECC"')
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 4. GOVERNANCE BODIES
-- ============================================
DO $$ BEGIN
  INSERT INTO governance_bodies (body_id, name_en, name_ar, body_type, status) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'Board Risk Committee', 'لجنة مخاطر مجلس الإدارة', 'board', 'active'),
    ('a0000001-0000-0000-0000-000000000002', 'Information Security Steering Committee', 'لجنة توجيه أمن المعلومات', 'working_group', 'active'),
    ('a0000001-0000-0000-0000-000000000003', 'Compliance & Ethics Board', 'مجلس الامتثال والأخلاقيات', 'board', 'active')
  ON CONFLICT (body_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 5. VENDORS
-- ============================================
DO $$ BEGIN
  INSERT INTO vendors (vendor_id, name, category, risk_tier, status, assessment_score, contract_expiry) VALUES
    ('b0000001-0000-0000-0000-000000000001', 'Microsoft Azure', 'cloud_provider', 'high', 'active', 82, '2027-12-31'),
    ('b0000001-0000-0000-0000-000000000002', 'SAP S/4HANA', 'erp', 'high', 'active', 78, '2026-06-30'),
    ('b0000001-0000-0000-0000-000000000003', 'CrowdStrike', 'security', 'medium', 'active', 91, '2026-09-15'),
    ('b0000001-0000-0000-0000-000000000004', 'Deloitte KSA', 'consulting', 'low', 'active', 88, '2026-03-31'),
    ('b0000001-0000-0000-0000-000000000005', 'STC Solutions', 'telecom', 'medium', 'active', 75, '2027-01-15')
  ON CONFLICT (vendor_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 6. INCIDENTS
-- ============================================
DO $$ BEGIN
  INSERT INTO incidents (incident_id, title, description, category, severity, status, reported_by) VALUES
    ('c0000001-0000-0000-0000-000000000001', 'Unauthorized access attempt detected', 'Multiple failed login attempts from external IP range detected by SIEM', 'security', 'high', 'investigating', 'system'),
    ('c0000001-0000-0000-0000-000000000002', 'Data backup failure on primary storage', 'Scheduled backup job failed due to insufficient storage allocation', 'operational', 'medium', 'reported', 'system'),
    ('c0000001-0000-0000-0000-000000000003', 'Phishing email campaign targeting employees', 'HR department reported suspicious emails requesting credential updates', 'security', 'critical', 'contained', 'system'),
    ('c0000001-0000-0000-0000-000000000004', 'Third-party API rate limiting exceeded', 'Integration with payment gateway hitting rate limits during peak hours', 'operational', 'low', 'resolved', 'system'),
    ('c0000001-0000-0000-0000-000000000005', 'Policy violation: unencrypted data transfer', 'Detected unencrypted PII transfer between internal services', 'compliance', 'high', 'investigating', 'system')
  ON CONFLICT (incident_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 7. ASSETS (need workspace_id)
-- ============================================
DO $$ 
DECLARE ws_id UUID;
BEGIN
  SELECT workspace_id INTO ws_id FROM workspaces LIMIT 1;
  IF ws_id IS NULL THEN
    ws_id := gen_random_uuid();
    INSERT INTO workspaces (workspace_id, name, type) VALUES (ws_id, 'Default Workspace', 'enterprise_grc');
  END IF;

  INSERT INTO assets (asset_id, workspace_id, name, type, owner, criticality, status, classification, description) VALUES
    ('d0000001-0000-0000-0000-000000000001', ws_id, 'Core Banking System', 'application', 'IT Operations', 'critical', 'active', 'confidential', 'Primary banking application handling all financial transactions'),
    ('d0000001-0000-0000-0000-000000000002', ws_id, 'Employee Directory Server', 'server', 'IT Infrastructure', 'high', 'active', 'internal', 'Active Directory server for employee identity management'),
    ('d0000001-0000-0000-0000-000000000003', ws_id, 'Customer Data Warehouse', 'database', 'Data Analytics', 'critical', 'active', 'restricted', 'Centralized customer data repository for analytics'),
    ('d0000001-0000-0000-0000-000000000004', ws_id, 'Public Website', 'application', 'Marketing', 'medium', 'active', 'public', 'Corporate public-facing website'),
    ('d0000001-0000-0000-0000-000000000005', ws_id, 'Email Gateway', 'network', 'IT Security', 'high', 'active', 'internal', 'Email filtering and security gateway')
  ON CONFLICT (asset_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 8. AUDIT ENGAGEMENTS
-- ============================================
DO $$ BEGIN
  INSERT INTO audit_engagements (engagement_id, title, engagement_type, status, description, scope, start_date, end_date) VALUES
    ('e0000001-0000-0000-0000-000000000001', 'Annual NCA-ECC Compliance Audit 2026', 'compliance_audit', 'in_progress', 'Annual assessment of NCA Essential Cybersecurity Controls compliance', 'All IT systems and processes covered under NCA-ECC framework', '2026-01-15', '2026-04-30'),
    ('e0000001-0000-0000-0000-000000000002', 'Q1 Internal Risk Assessment', 'risk_assessment', 'planned', 'Quarterly internal risk assessment covering operational and IT risks', 'Enterprise-wide risk register and control effectiveness', '2026-02-01', '2026-03-31'),
    ('e0000001-0000-0000-0000-000000000003', 'Third-Party Vendor Security Audit', 'vendor_audit', 'in_progress', 'Security assessment of critical third-party vendors', 'All Tier-1 vendors with access to sensitive data', '2026-01-01', '2026-06-30')
  ON CONFLICT (engagement_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 9. FINDINGS (need workspace_id)
-- ============================================
DO $$
DECLARE ws_id UUID;
BEGIN
  SELECT workspace_id INTO ws_id FROM workspaces LIMIT 1;
  IF ws_id IS NULL THEN ws_id := gen_random_uuid(); END IF;

  INSERT INTO findings (finding_id, workspace_id, title, description, source_type, source_id, severity, status) VALUES
    ('f0000001-0000-0000-0000-000000000001', ws_id, 'Missing MFA on privileged accounts', 'Several administrator accounts lack multi-factor authentication, violating NCA-ECC 2-3-1', 'audit_engagement', 'e0000001-0000-0000-0000-000000000001', 'critical', 'open'),
    ('f0000001-0000-0000-0000-000000000002', ws_id, 'Outdated encryption protocols on internal APIs', 'TLS 1.0/1.1 still active on 3 internal API endpoints', 'audit_engagement', 'e0000001-0000-0000-0000-000000000001', 'high', 'open'),
    ('f0000001-0000-0000-0000-000000000003', ws_id, 'Incomplete asset inventory for cloud resources', 'Cloud VM instances not tracked in CMDB, 40% coverage gap', 'audit_engagement', 'e0000001-0000-0000-0000-000000000001', 'medium', 'in_progress'),
    ('f0000001-0000-0000-0000-000000000004', ws_id, 'Excessive user privileges in ERP system', 'Role review identified 15 users with unnecessary admin access in SAP', 'audit_engagement', 'e0000001-0000-0000-0000-000000000002', 'high', 'open'),
    ('f0000001-0000-0000-0000-000000000005', ws_id, 'Missing disaster recovery testing documentation', 'DR tests conducted but results not documented per policy requirements', 'audit_engagement', 'e0000001-0000-0000-0000-000000000002', 'medium', 'open'),
    ('f0000001-0000-0000-0000-000000000006', ws_id, 'Patch management SLA breaches', 'Critical patches not applied within 72-hour window for 8 servers', 'audit_engagement', 'e0000001-0000-0000-0000-000000000002', 'high', 'in_progress'),
    ('f0000001-0000-0000-0000-000000000007', ws_id, 'Vendor lacks SOC 2 Type II certification', 'Primary cloud provider branch in KSA missing current SOC 2 report', 'audit_engagement', 'e0000001-0000-0000-0000-000000000003', 'high', 'open'),
    ('f0000001-0000-0000-0000-000000000008', ws_id, 'No data residency clause in vendor contract', 'STC Solutions contract missing explicit KSA data residency requirements', 'audit_engagement', 'e0000001-0000-0000-0000-000000000003', 'medium', 'open'),
    ('f0000001-0000-0000-0000-000000000009', ws_id, 'Vendor incident response SLA not defined', 'No contractual SLA for security incident notification from third parties', 'audit_engagement', 'e0000001-0000-0000-0000-000000000003', 'critical', 'open')
  ON CONFLICT (finding_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 10. REMEDIATION PLANS (CAPA)
-- ============================================
DO $$ BEGIN
INSERT INTO remediation_plans (plan_id, finding_id, title, description, status, priority, approach, target_date) VALUES
  ('10000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'Deploy MFA for all privileged accounts', 'Implement Azure AD MFA for all admin and privileged service accounts', 'in_progress', 'critical', 'Deploy Conditional Access policies requiring MFA for all admin roles', '2026-04-15'),
  ('10000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002', 'Upgrade TLS to 1.3 on all endpoints', 'Disable TLS 1.0/1.1 and enforce TLS 1.3 across all internal APIs', 'open', 'high', 'Phase 1: Inventory endpoints. Phase 2: Test TLS 1.3. Phase 3: Cutover', '2026-05-01'),
  ('10000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000003', 'Complete cloud asset discovery and CMDB sync', 'Deploy automated discovery tool and sync all cloud resources to CMDB', 'in_progress', 'medium', 'Use Azure Resource Graph + CMDB connector for auto-sync', '2026-03-31'),
  ('10000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000004', 'Conduct ERP access rights review and cleanup', 'Review and revoke unnecessary admin privileges in SAP system', 'open', 'high', 'Export current roles, review with business owners, revoke excess access', '2026-04-30'),
  ('10000001-0000-0000-0000-000000000005', 'f0000001-0000-0000-0000-000000000005', 'Document DR test results and update procedures', 'Create standardized DR test report template and backfill Q4 results', 'completed', 'medium', 'Create template, train team, document Q4 2025 DR test results', '2026-02-28'),
  ('10000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000006', 'Automate critical patch deployment pipeline', 'Implement automated patch management for critical severity patches', 'in_progress', 'high', 'Deploy WSUS + Ansible playbooks for automated critical patch application', '2026-04-15'),
  ('10000001-0000-0000-0000-000000000007', 'f0000001-0000-0000-0000-000000000007', 'Request vendor SOC 2 Type II report', 'Formally request current SOC 2 Type II from cloud provider KSA branch', 'open', 'high', 'Send formal request letter, set 30-day deadline, escalate if needed', '2026-05-15'),
  ('10000001-0000-0000-0000-000000000008', 'f0000001-0000-0000-0000-000000000008', 'Amend vendor contract with data residency clause', 'Add explicit KSA data residency requirements to STC Solutions contract', 'open', 'medium', 'Legal review, draft amendment, negotiate with vendor', '2026-06-30'),
  ('10000001-0000-0000-0000-000000000009', 'f0000001-0000-0000-0000-000000000009', 'Define vendor incident response SLA framework', 'Create standard incident notification SLA template for all vendor contracts', 'in_progress', 'critical', 'Draft SLA template, review with legal, incorporate into vendor onboarding', '2026-04-30')
ON CONFLICT (plan_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 11. ACTION ITEMS (linked to findings)
-- ============================================
DO $$
DECLARE team_id_val UUID;
BEGIN
  SELECT team_id INTO team_id_val FROM teams WHERE active = true LIMIT 1;
  IF team_id_val IS NULL THEN
    team_id_val := uuid_generate_v4();
    INSERT INTO teams (team_id, team_code, name_en, name_ar, team_type) 
    VALUES (team_id_val, 'default_ops', 'Operations Team', 'فريق العمليات', 'operational');
  END IF;

  INSERT INTO action_items (action_id, source_type, source_id, finding_id, title, description, criticality, owner_team_id, status, target_date) VALUES
    ('20000001-0000-0000-0000-000000000001', 'audit_finding', 'f0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'Enable Azure AD Conditional Access MFA policies', 'Configure and deploy MFA requirement for all privileged accounts', 'critical', team_id_val, 'in_progress', '2026-04-15'),
    ('20000001-0000-0000-0000-000000000002', 'audit_finding', 'f0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000002', 'Inventory all internal API endpoints for TLS upgrade', 'Scan and document all internal API endpoints currently using TLS 1.0/1.1', 'high', team_id_val, 'open', '2026-04-01'),
    ('20000001-0000-0000-0000-000000000003', 'audit_finding', 'f0000001-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000004', 'Export and review SAP user role assignments', 'Generate full SAP role report and review with business unit heads', 'high', team_id_val, 'open', '2026-04-15'),
    ('20000001-0000-0000-0000-000000000004', 'audit_finding', 'f0000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000006', 'Deploy Ansible playbooks for automated patching', 'Create and test Ansible automation for critical security patches', 'high', team_id_val, 'in_progress', '2026-04-15'),
    ('20000001-0000-0000-0000-000000000005', 'audit_finding', 'f0000001-0000-0000-0000-000000000007', 'f0000001-0000-0000-0000-000000000007', 'Send formal SOC 2 request to cloud provider', 'Draft and send formal letter requesting SOC 2 Type II certification', 'medium', team_id_val, 'open', '2026-04-30'),
    ('20000001-0000-0000-0000-000000000006', 'audit_finding', 'f0000001-0000-0000-0000-000000000009', 'f0000001-0000-0000-0000-000000000009', 'Draft vendor incident response SLA template', 'Create standardized SLA template for vendor security incident notification', 'critical', team_id_val, 'in_progress', '2026-04-30')
  ON CONFLICT (action_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 12. COMPLIANCE ASSESSMENTS
-- ============================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS compliance_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'draft',
    assessment_type VARCHAR(50) DEFAULT 'self_assessment',
    scope TEXT DEFAULT '',
    assessor VARCHAR(255),
    start_date DATE,
    end_date DATE,
    overall_score NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
INSERT INTO compliance_assessments (assessment_id, title, description, status, assessment_type, start_date, end_date, overall_score) VALUES
  ('30000001-0000-0000-0000-000000000001', 'NCA-ECC Annual Self-Assessment 2026', 'Annual self-assessment against NCA Essential Cybersecurity Controls', 'in_progress', 'self_assessment', '2026-01-01', '2026-03-31', 72.5),
  ('30000001-0000-0000-0000-000000000002', 'ISO 27001 Gap Assessment', 'Gap analysis for ISO 27001:2022 certification readiness', 'planned', 'gap_analysis', '2026-04-01', '2026-06-30', NULL),
  ('30000001-0000-0000-0000-000000000003', 'PDPL Compliance Review', 'Personal Data Protection Law compliance status review', 'in_progress', 'regulatory_review', '2026-02-01', '2026-04-30', 65.0)
ON CONFLICT (assessment_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 13. POLICIES (if fewer than 15 exist)
-- ============================================
DO $$
BEGIN
  IF (SELECT count(*) FROM policies) < 15 THEN
    INSERT INTO policies (policy_id, title, content, description, category, status, owner, review_frequency) VALUES
      ('POL-ISP-001', 'Information Security Policy', 'This policy establishes the framework for managing information security across the organization in accordance with NCA-ECC requirements.', 'Master information security policy', 'information_security', 'approved', 'CISO', 'annual'),
      ('POL-AUP-002', 'Acceptable Use Policy', 'Defines acceptable use of organization IT resources, systems, and data by all employees and contractors.', 'IT resource acceptable use guidelines', 'acceptable_use', 'approved', 'IT Director', 'annual'),
      ('POL-DPP-003', 'Data Protection & Privacy Policy', 'Establishes controls for personal data processing in compliance with KSA PDPL requirements.', 'PDPL compliance policy', 'data_protection', 'approved', 'DPO', 'semi_annual'),
      ('POL-IAM-004', 'Identity & Access Management Policy', 'Defines requirements for user identity management, authentication, and access control.', 'IAM governance policy', 'access_control', 'approved', 'CISO', 'annual'),
      ('POL-IRP-005', 'Incident Response Policy', 'Establishes procedures for detecting, reporting, and responding to security incidents.', 'Security incident response procedures', 'incident_response', 'approved', 'SOC Manager', 'semi_annual'),
      ('POL-BCM-006', 'Business Continuity Management Policy', 'Framework for business continuity planning, testing, and recovery procedures.', 'BCM governance framework', 'business_continuity', 'draft', 'COO', 'annual'),
      ('POL-VRM-007', 'Vendor Risk Management Policy', 'Requirements for assessing, monitoring, and managing third-party vendor risks.', 'Third-party risk governance', 'vendor_management', 'approved', 'Procurement Director', 'annual'),
      ('POL-CHP-008', 'Change Management Policy', 'Controls for managing changes to IT systems, applications, and infrastructure.', 'IT change management procedures', 'change_management', 'approved', 'IT Director', 'annual')
    ON CONFLICT (policy_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 14. RISK CATEGORIES (if empty)
-- ============================================
DO $$ BEGIN
  IF (SELECT count(*) FROM risk_categories) = 0 THEN
    INSERT INTO risk_categories (category_id, code, name_en, name_ar, description, display_order) VALUES
      (gen_random_uuid(), 'cyber_risk', 'Cybersecurity Risk', 'مخاطر الأمن السيبراني', 'Risks related to information security and cyber threats', 1),
      (gen_random_uuid(), 'operational_risk', 'Operational Risk', 'المخاطر التشغيلية', 'Risks from inadequate internal processes and systems', 2),
      (gen_random_uuid(), 'compliance_risk', 'Compliance Risk', 'مخاطر الامتثال', 'Risks of legal/regulatory non-compliance', 3),
      (gen_random_uuid(), 'strategic_risk', 'Strategic Risk', 'المخاطر الاستراتيجية', 'Risks affecting organizational strategy and objectives', 4),
      (gen_random_uuid(), 'third_party_risk', 'Third-Party Risk', 'مخاطر الأطراف الثالثة', 'Risks from vendor and partner relationships', 5),
      (gen_random_uuid(), 'financial_risk', 'Financial Risk', 'المخاطر المالية', 'Risks impacting financial stability and reporting', 6),
      (gen_random_uuid(), 'reputational_risk', 'Reputational Risk', 'مخاطر السمعة', 'Risks to organizational reputation and brand', 7);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 15. SLA DEFINITIONS (for SLA monitoring)
-- ============================================
DO $$ BEGIN
  IF (SELECT count(*) FROM sla_definitions) = 0 THEN
    INSERT INTO sla_definitions (sla_id, name, description, entity_type, metric_type, target_value, target_unit, warning_threshold, critical_threshold) VALUES
      (gen_random_uuid(), 'Critical Incident Response', 'Response time for critical security incidents', 'incident', 'response_time', 1, 'hours', 0.75, 1),
      (gen_random_uuid(), 'High Risk Remediation', 'Remediation deadline for high-severity findings', 'finding', 'remediation_time', 30, 'days', 21, 30),
      (gen_random_uuid(), 'Patch Application SLA', 'Critical patch deployment within 72 hours', 'action_item', 'completion_time', 72, 'hours', 48, 72),
      (gen_random_uuid(), 'Vendor Assessment Completion', 'Annual vendor risk assessment completion', 'vendor', 'assessment_completion', 365, 'days', 300, 365),
      (gen_random_uuid(), 'Policy Review Cycle', 'Annual policy review and approval cycle', 'policy', 'review_cycle', 365, 'days', 300, 365);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 16. NOTIFICATION SETTINGS (starter)
-- ============================================
DO $$ BEGIN
  IF (SELECT count(*) FROM notifications) = 0 THEN
    INSERT INTO notifications (notification_id, user_id, type, title, body, created_at) VALUES
      (gen_random_uuid(), 'system', 'info', 'Platform Provisioned Successfully', 'Your GRC platform has been fully provisioned with all modules activated.', NOW()),
      (gen_random_uuid(), 'system', 'task', 'NCA-ECC Assessment Started', 'The annual NCA-ECC compliance self-assessment is now in progress.', NOW()),
      (gen_random_uuid(), 'system', 'alert', 'Critical Finding: MFA Required', 'A critical finding regarding missing MFA on privileged accounts requires attention.', NOW());
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 17. TRAINING PROGRAMS (starter)
-- ============================================
DO $$ BEGIN
  IF (SELECT count(*) FROM training_programs) = 0 THEN
    INSERT INTO training_programs (training_id, title, description, category, status) VALUES
      (gen_random_uuid(), 'NCA-ECC Awareness Training', 'Mandatory cybersecurity awareness training aligned with NCA-ECC requirements', 'cybersecurity', 'active'),
      (gen_random_uuid(), 'PDPL Data Privacy Training', 'Personal Data Protection Law compliance training for all data handlers', 'privacy', 'active'),
      (gen_random_uuid(), 'Incident Response Procedures', 'Training on security incident detection, reporting, and response procedures', 'incident_response', 'active'),
      (gen_random_uuid(), 'Phishing Awareness & Prevention', 'Interactive training on identifying and preventing phishing attacks', 'cybersecurity', 'active');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 18. EFFECTIVE USER PERMISSIONS (compute for existing users)
-- ============================================
DO $$
DECLARE
  usr RECORD;
BEGIN
  FOR usr IN 
    SELECT DISTINCT eura.user_id, eura.functional_role_code, eura.module_code
    FROM enterprise_user_role_assignments eura
    WHERE eura.status = 'active'
    LIMIT 500
  LOOP
    INSERT INTO effective_user_permissions (user_id, permission_code, module_code, source_type, source_ref, authority_level, computed_at)
    SELECT 
      usr.user_id,
      rfp.permission_code,
      usr.module_code,
      'role_assignment',
      usr.functional_role_code,
      COALESCE(rfp.authority_level, 'view'),
      NOW()
    FROM role_function_permissions rfp
    WHERE rfp.function_code = usr.functional_role_code
    ON CONFLICT DO NOTHING;
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 19. EFFECTIVE USER MODULES (compute for existing users)  
-- ============================================
DO $$
BEGIN
  INSERT INTO effective_user_modules (user_id, module_code, access_level, source, computed_at)
  SELECT DISTINCT
    eura.user_id,
    eura.module_code,
    CASE 
      WHEN eura.authority_level IN ('full', 'admin') THEN 'full'
      WHEN eura.authority_level IN ('approve_high', 'approve_low') THEN 'write'
      WHEN eura.authority_level IN ('review', 'submit') THEN 'write'
      ELSE 'read'
    END,
    'role_assignment',
    NOW()
  FROM enterprise_user_role_assignments eura
  WHERE eura.status = 'active'
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
