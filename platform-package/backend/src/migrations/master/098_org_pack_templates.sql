-- ============================================================
-- Master Migration 098: Org Pack Template Tables (public schema)
-- Part 3F.B: Shared global seed layer for org/access/hierarchy
-- ============================================================

-- 1. org_pack_templates — pack definitions
CREATE TABLE IF NOT EXISTS public.org_pack_templates (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL UNIQUE,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  size            VARCHAR(20) NOT NULL CHECK (size IN ('small','standard','enterprise')),
  org_type        VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (org_type IN ('standard','matrix')),
  description_en  TEXT,
  description_ar  TEXT,
  hierarchy_depth INT NOT NULL DEFAULT 4,
  config          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_size ON public.org_pack_templates(size);
CREATE INDEX IF NOT EXISTS idx_opt_active ON public.org_pack_templates(is_active);

-- 2. org_pack_template_departments — department templates per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_departments (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  dept_code       VARCHAR(50) NOT NULL,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  division_code   VARCHAR(50),
  sort_order      INT NOT NULL DEFAULT 0,
  is_critical     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optd_pack ON public.org_pack_template_departments(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_optd_pack_dept ON public.org_pack_template_departments(pack_code, dept_code);

-- 2b. org_pack_template_sections — section templates per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_sections (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  section_code    VARCHAR(50) NOT NULL,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  dept_code       VARCHAR(50) NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  is_critical     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opts_pack ON public.org_pack_template_sections(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_opts_pack_sec ON public.org_pack_template_sections(pack_code, section_code);

-- 2c. org_pack_template_teams — team templates per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_teams (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  team_code       VARCHAR(50) NOT NULL,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  dept_code       VARCHAR(50),
  section_code    VARCHAR(50),
  sort_order      INT NOT NULL DEFAULT 0,
  is_critical     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((dept_code IS NOT NULL AND section_code IS NULL) OR (dept_code IS NULL AND section_code IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_optt_pack ON public.org_pack_template_teams(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_optt_pack_team ON public.org_pack_template_teams(pack_code, team_code);

-- 3. org_pack_template_roles — default functional roles per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_roles (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  role_code       VARCHAR(100) NOT NULL,
  module_code     VARCHAR(50) NOT NULL,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  description_en  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optr_pack ON public.org_pack_template_roles(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_optr_pack_role ON public.org_pack_template_roles(pack_code, role_code, module_code);

-- 4. org_pack_template_permissions — default permissions per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_permissions (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  permission_code VARCHAR(150) NOT NULL,
  module_code     VARCHAR(50) NOT NULL,
  resource_code   VARCHAR(100) NOT NULL,
  action_code     VARCHAR(50) NOT NULL,
  description_en  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optp_pack ON public.org_pack_template_permissions(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_optp_pack_perm ON public.org_pack_template_permissions(pack_code, permission_code);

-- 5. org_pack_template_role_permissions — role→permission mappings per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_role_permissions (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  role_code       VARCHAR(100) NOT NULL,
  permission_code VARCHAR(150) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optrp_pack ON public.org_pack_template_role_permissions(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_optrp_pack_role_perm ON public.org_pack_template_role_permissions(pack_code, role_code, permission_code);

-- 6. org_pack_template_profiles — default access profiles per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_profiles (
  id                  BIGSERIAL PRIMARY KEY,
  pack_code           VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  profile_code        VARCHAR(100) NOT NULL,
  name_en             VARCHAR(255) NOT NULL,
  name_ar             VARCHAR(255),
  description_en      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optpr_pack ON public.org_pack_template_profiles(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_optpr_pack_profile ON public.org_pack_template_profiles(pack_code, profile_code);

-- 7. org_pack_template_sod_rules — default SoD rules per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_sod_rules (
  id              BIGSERIAL PRIMARY KEY,
  pack_code       VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  role_code_a     VARCHAR(100) NOT NULL,
  role_code_b     VARCHAR(100) NOT NULL,
  module_code     VARCHAR(50),
  conflict_level  VARCHAR(10) NOT NULL CHECK (conflict_level IN ('warn','block')),
  scope_rule      VARCHAR(20) NOT NULL CHECK (scope_rule IN ('same_scope','tenant_wide')),
  cross_module    BOOLEAN NOT NULL DEFAULT FALSE,
  module_code_b   VARCHAR(50),
  description_en  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optsr_pack ON public.org_pack_template_sod_rules(pack_code);

-- 8. org_pack_template_workflows — default lifecycle/workflow mappings per pack
CREATE TABLE IF NOT EXISTS public.org_pack_template_workflows (
  id                      BIGSERIAL PRIMARY KEY,
  pack_code               VARCHAR(50) NOT NULL REFERENCES public.org_pack_templates(pack_code) ON DELETE CASCADE,
  workflow_code           VARCHAR(100) NOT NULL,
  module_code             VARCHAR(50) NOT NULL,
  entity_type             VARCHAR(50) NOT NULL,
  from_status             VARCHAR(50) NOT NULL,
  to_status               VARCHAR(50) NOT NULL,
  required_role_code      VARCHAR(100),
  min_authority_level     VARCHAR(30),
  min_approvers           INT NOT NULL DEFAULT 0,
  require_different_user  BOOLEAN NOT NULL DEFAULT FALSE,
  description_en          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optwf_pack ON public.org_pack_template_workflows(pack_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_optwf_pack_wf ON public.org_pack_template_workflows(pack_code, workflow_code);

-- ============================================================
-- SEED: 3 canonical packs
-- ============================================================

INSERT INTO public.org_pack_templates (pack_code, name_en, name_ar, size, org_type, description_en, description_ar, hierarchy_depth, config)
VALUES
  ('small_standard', 'Small Organization', 'منظمة صغيرة', 'small', 'standard',
   'Flat structure for small organizations (10-50 employees). Org → Dept → Team.',
   'هيكل مسطح للمنظمات الصغيرة. منظمة ← قسم ← فريق.',
   3, '{"divisions":[]}'::jsonb),
  ('standard_standard', 'Standard Organization', 'منظمة قياسية', 'standard', 'standard',
   'Moderate hierarchy for medium organizations (50-200 employees). Org → Division → Dept → Team.',
   'هيكل متوسط للمنظمات المتوسطة. منظمة ← شعبة ← قسم ← فريق.',
   4, '{"divisions":[{"code":"DIV-CORP","name_en":"Corporate Services","name_ar":"الخدمات المؤسسية"},{"code":"DIV-OPS","name_en":"Operations","name_ar":"العمليات"}]}'::jsonb),
  ('enterprise_standard', 'Enterprise Organization', 'منظمة مؤسسية', 'enterprise', 'standard',
   'Deep hierarchy for enterprise organizations (200+ employees). Org → Division → Dept → Section → Team.',
   'هيكل عميق للمنظمات المؤسسية. منظمة ← شعبة ← قسم ← وحدة ← فريق.',
   5, '{"divisions":[{"code":"DIV-CORP","name_en":"Corporate Services","name_ar":"الخدمات المؤسسية"},{"code":"DIV-OPS","name_en":"Operations","name_ar":"العمليات"},{"code":"DIV-TECH","name_en":"Technology","name_ar":"التكنولوجيا"}]}'::jsonb)
ON CONFLICT (pack_code) DO NOTHING;

-- ── SMALL PACK DEPARTMENTS (direct under org, no divisions) ──
INSERT INTO public.org_pack_template_departments (pack_code, dept_code, name_en, name_ar, division_code, sort_order, is_critical) VALUES
  ('small_standard','IT','Information Technology','تقنية المعلومات',NULL,1,TRUE),
  ('small_standard','COMPLIANCE','Compliance & Risk','الامتثال والمخاطر',NULL,2,TRUE),
  ('small_standard','HR','Human Resources','الموارد البشرية',NULL,3,FALSE),
  ('small_standard','FINANCE','Finance','المالية',NULL,4,FALSE)
ON CONFLICT (pack_code, dept_code) DO NOTHING;

-- ── SMALL PACK TEAMS (all under departments, no sections) ──
INSERT INTO public.org_pack_template_teams (pack_code, team_code, name_en, name_ar, dept_code, section_code, sort_order) VALUES
  ('small_standard','IT-OPS','IT Operations','عمليات تقنية المعلومات','IT',NULL,1),
  ('small_standard','IT-SEC','IT Security','أمن تقنية المعلومات','IT',NULL,2),
  ('small_standard','COMP-TEAM','Compliance Team','فريق الامتثال','COMPLIANCE',NULL,1),
  ('small_standard','RISK-MGMT','Risk Management','إدارة المخاطر','COMPLIANCE',NULL,2),
  ('small_standard','HR-OPS','HR Operations','عمليات الموارد البشرية','HR',NULL,1),
  ('small_standard','FIN-TEAM','Finance Team','فريق المالية','FINANCE',NULL,1)
ON CONFLICT (pack_code, team_code) DO NOTHING;

-- ── STANDARD PACK DEPARTMENTS (under divisions defined in config) ──
INSERT INTO public.org_pack_template_departments (pack_code, dept_code, name_en, name_ar, division_code, sort_order, is_critical) VALUES
  ('standard_standard','IT','Information Technology','تقنية المعلومات','DIV-OPS',1,TRUE),
  ('standard_standard','SECURITY','Information Security','أمن المعلومات','DIV-OPS',2,TRUE),
  ('standard_standard','COMPLIANCE','Compliance & Risk','الامتثال والمخاطر','DIV-CORP',1,TRUE),
  ('standard_standard','LEGAL','Legal & Governance','القانونية والحوكمة','DIV-CORP',2,FALSE),
  ('standard_standard','HR','Human Resources','الموارد البشرية','DIV-CORP',3,FALSE),
  ('standard_standard','FINANCE','Finance','المالية','DIV-CORP',4,FALSE)
ON CONFLICT (pack_code, dept_code) DO NOTHING;

-- ── STANDARD PACK TEAMS (all under departments, no sections) ──
INSERT INTO public.org_pack_template_teams (pack_code, team_code, name_en, name_ar, dept_code, section_code, sort_order) VALUES
  ('standard_standard','IT-OPS','IT Operations','عمليات تقنية المعلومات','IT',NULL,1),
  ('standard_standard','IT-SEC','IT Security','أمن تقنية المعلومات','IT',NULL,2),
  ('standard_standard','IT-DEV','IT Development','تطوير تقنية المعلومات','IT',NULL,3),
  ('standard_standard','SEC-OPS','Security Operations','عمليات الأمن','SECURITY',NULL,1),
  ('standard_standard','SEC-ENG','Security Engineering','هندسة الأمن','SECURITY',NULL,2),
  ('standard_standard','IR-TEAM','Incident Response','الاستجابة للحوادث','SECURITY',NULL,3),
  ('standard_standard','COMP-TEAM','Compliance Team','فريق الامتثال','COMPLIANCE',NULL,1),
  ('standard_standard','RISK-MGMT','Risk Management','إدارة المخاطر','COMPLIANCE',NULL,2),
  ('standard_standard','AUDIT-TEAM','Internal Audit','التدقيق الداخلي','COMPLIANCE',NULL,3),
  ('standard_standard','LEGAL-TEAM','Legal Team','الفريق القانوني','LEGAL',NULL,1),
  ('standard_standard','GOV-OFFICE','Governance Office','مكتب الحوكمة','LEGAL',NULL,2),
  ('standard_standard','HR-OPS','HR Operations','عمليات الموارد البشرية','HR',NULL,1),
  ('standard_standard','HR-DEV','HR Development','تطوير الموارد البشرية','HR',NULL,2),
  ('standard_standard','FIN-OPS','Finance Operations','عمليات المالية','FINANCE',NULL,1),
  ('standard_standard','FIN-PLAN','Financial Planning','التخطيط المالي','FINANCE',NULL,2)
ON CONFLICT (pack_code, team_code) DO NOTHING;

-- ── ENTERPRISE PACK DEPARTMENTS (under divisions defined in config) ──
INSERT INTO public.org_pack_template_departments (pack_code, dept_code, name_en, name_ar, division_code, sort_order, is_critical) VALUES
  ('enterprise_standard','IT','Information Technology','تقنية المعلومات','DIV-TECH',1,TRUE),
  ('enterprise_standard','SECURITY','Information Security','أمن المعلومات','DIV-TECH',2,TRUE),
  ('enterprise_standard','COMPLIANCE','Compliance & Risk','الامتثال والمخاطر','DIV-CORP',1,TRUE),
  ('enterprise_standard','LEGAL','Legal & Governance','القانونية والحوكمة','DIV-CORP',2,FALSE),
  ('enterprise_standard','HR','Human Resources','الموارد البشرية','DIV-CORP',3,FALSE),
  ('enterprise_standard','FINANCE','Finance','المالية','DIV-CORP',4,FALSE),
  ('enterprise_standard','OPS','Operations','العمليات','DIV-OPS',1,FALSE),
  ('enterprise_standard','BCP','Business Continuity','استمرارية الأعمال','DIV-OPS',2,FALSE)
ON CONFLICT (pack_code, dept_code) DO NOTHING;

-- ── ENTERPRISE PACK SECTIONS ──
INSERT INTO public.org_pack_template_sections (pack_code, section_code, name_en, name_ar, dept_code, sort_order) VALUES
  ('enterprise_standard','IT-INFRA-SEC','Infrastructure Section','وحدة البنية التحتية','IT',1),
  ('enterprise_standard','IT-APP-SEC','Applications Section','وحدة التطبيقات','IT',2),
  ('enterprise_standard','SEC-PROTECT-SEC','Protection Section','وحدة الحماية','SECURITY',1),
  ('enterprise_standard','SEC-DETECT-SEC','Detection Section','وحدة الكشف','SECURITY',2)
ON CONFLICT (pack_code, section_code) DO NOTHING;

-- ── ENTERPRISE PACK TEAMS (some under sections, some under departments) ──
INSERT INTO public.org_pack_template_teams (pack_code, team_code, name_en, name_ar, dept_code, section_code, sort_order) VALUES
  ('enterprise_standard','IT-OPS','IT Operations','عمليات تقنية المعلومات',NULL,'IT-INFRA-SEC',1),
  ('enterprise_standard','IT-INFRA','IT Infrastructure','البنية التحتية',NULL,'IT-INFRA-SEC',2),
  ('enterprise_standard','IT-DEV','IT Development','تطوير تقنية المعلومات',NULL,'IT-APP-SEC',1),
  ('enterprise_standard','IT-QA','IT Quality Assurance','ضمان جودة تقنية المعلومات',NULL,'IT-APP-SEC',2),
  ('enterprise_standard','SOC','Security Operations Center','مركز عمليات الأمن',NULL,'SEC-DETECT-SEC',1),
  ('enterprise_standard','IR-TEAM','Incident Response','الاستجابة للحوادث',NULL,'SEC-DETECT-SEC',2),
  ('enterprise_standard','SEC-ENG','Security Engineering','هندسة الأمن',NULL,'SEC-PROTECT-SEC',1),
  ('enterprise_standard','THREAT-INTEL','Threat Intelligence','استخبارات التهديدات',NULL,'SEC-PROTECT-SEC',2),
  ('enterprise_standard','COMP-MGMT','Compliance Management','إدارة الامتثال','COMPLIANCE',NULL,1),
  ('enterprise_standard','RISK-MGMT','Risk Management','إدارة المخاطر','COMPLIANCE',NULL,2),
  ('enterprise_standard','AUDIT-TEAM','Internal Audit','التدقيق الداخلي','COMPLIANCE',NULL,3),
  ('enterprise_standard','REG-AFFAIRS','Regulatory Affairs','الشؤون التنظيمية','COMPLIANCE',NULL,4),
  ('enterprise_standard','LEGAL-ADV','Legal Advisory','الاستشارة القانونية','LEGAL',NULL,1),
  ('enterprise_standard','GOV-OFFICE','Governance Office','مكتب الحوكمة','LEGAL',NULL,2),
  ('enterprise_standard','HR-OPS','HR Operations','عمليات الموارد البشرية','HR',NULL,1),
  ('enterprise_standard','TALENT-ACQ','Talent Acquisition','اكتساب المواهب','HR',NULL,2),
  ('enterprise_standard','FIN-OPS','Finance Operations','عمليات المالية','FINANCE',NULL,1),
  ('enterprise_standard','FPA','Financial Planning & Analysis','التخطيط والتحليل المالي','FINANCE',NULL,2),
  ('enterprise_standard','BIZ-OPS','Business Operations','عمليات الأعمال','OPS',NULL,1),
  ('enterprise_standard','BCP-TEAM','BCP Team','فريق استمرارية الأعمال','BCP',NULL,1)
ON CONFLICT (pack_code, team_code) DO NOTHING;

-- ── ACCESS PROFILES (all packs) ──

INSERT INTO public.org_pack_template_profiles (pack_code, profile_code, name_en, name_ar, description_en) VALUES
  ('small_standard','platform_super_admin','Platform Super Admin','مدير النظام الأعلى','Full platform access'),
  ('small_standard','tenant_admin','Tenant Admin','مدير المؤسسة','Full tenant administration'),
  ('small_standard','standard_user','Standard User','مستخدم عادي','Standard operational access'),
  ('standard_standard','platform_super_admin','Platform Super Admin','مدير النظام الأعلى','Full platform access'),
  ('standard_standard','tenant_admin','Tenant Admin','مدير المؤسسة','Full tenant administration'),
  ('standard_standard','standard_user','Standard User','مستخدم عادي','Standard operational access'),
  ('standard_standard','auditor_profile','Auditor','المدقق','Audit and review access'),
  ('standard_standard','manager_profile','Manager','المدير','Management and approval access'),
  ('enterprise_standard','platform_super_admin','Platform Super Admin','مدير النظام الأعلى','Full platform access'),
  ('enterprise_standard','tenant_admin','Tenant Admin','مدير المؤسسة','Full tenant administration'),
  ('enterprise_standard','standard_user','Standard User','مستخدم عادي','Standard operational access'),
  ('enterprise_standard','auditor_profile','Auditor','المدقق','Audit and review access'),
  ('enterprise_standard','manager_profile','Manager','المدير','Management and approval access'),
  ('enterprise_standard','ciso_profile','CISO','رئيس أمن المعلومات','Security leadership access'),
  ('enterprise_standard','executive_profile','Executive','تنفيذي','Executive oversight access')
ON CONFLICT (pack_code, profile_code) DO NOTHING;

-- ── SOD RULES (standard + enterprise) ──

INSERT INTO public.org_pack_template_sod_rules (pack_code, role_code_a, role_code_b, module_code, conflict_level, scope_rule, description_en) VALUES
  ('small_standard','risk.risk_assessor','risk.risk_approver','risk','block','same_scope','Risk assessor cannot approve own assessments'),
  ('small_standard','compliance.control_tester','compliance.control_approver','compliance','block','same_scope','Control tester cannot approve own tests'),
  ('small_standard','audit.auditor','audit.audit_approver','audit','block','same_scope','Auditor cannot approve own audits'),
  ('standard_standard','risk.risk_assessor','risk.risk_approver','risk','block','same_scope','Risk assessor cannot approve own assessments'),
  ('standard_standard','compliance.control_tester','compliance.control_approver','compliance','block','same_scope','Control tester cannot approve own tests'),
  ('standard_standard','audit.auditor','audit.audit_approver','audit','block','same_scope','Auditor cannot approve own audits'),
  ('standard_standard','policy.policy_author','policy.policy_approver','policy','block','same_scope','Policy author cannot approve own policies'),
  ('standard_standard','risk.risk_owner','risk.risk_approver','risk','warn','tenant_wide','Risk owner approving risks may indicate weak governance'),
  ('standard_standard','compliance.compliance_officer','audit.auditor','compliance','warn','tenant_wide','Compliance officer also auditing may reduce independence'),
  ('standard_standard','vendor.vendor_manager','vendor.vendor_approver','vendor','block','same_scope','Vendor manager cannot approve own vendor assessments'),
  ('standard_standard','incident.responder','incident.closer','incident','block','same_scope','Incident responder cannot close own incidents'),
  ('enterprise_standard','risk.risk_assessor','risk.risk_approver','risk','block','same_scope','Risk assessor cannot approve own assessments'),
  ('enterprise_standard','compliance.control_tester','compliance.control_approver','compliance','block','same_scope','Control tester cannot approve own tests'),
  ('enterprise_standard','audit.auditor','audit.audit_approver','audit','block','same_scope','Auditor cannot approve own audits'),
  ('enterprise_standard','policy.policy_author','policy.policy_approver','policy','block','same_scope','Policy author cannot approve own policies'),
  ('enterprise_standard','risk.risk_owner','risk.risk_approver','risk','block','tenant_wide','Risk owner cannot approve risks at enterprise level'),
  ('enterprise_standard','compliance.compliance_officer','audit.auditor','compliance','block','tenant_wide','Compliance officer cannot audit at enterprise level'),
  ('enterprise_standard','vendor.vendor_manager','vendor.vendor_approver','vendor','block','same_scope','Vendor manager cannot approve own vendor assessments'),
  ('enterprise_standard','incident.responder','incident.closer','incident','block','same_scope','Incident responder cannot close own incidents'),
  ('enterprise_standard','risk.risk_assessor','compliance.control_tester',NULL,'warn','same_scope','Same person assessing risk and testing controls reduces independence')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FUNCTIONAL ROLES PER PACK
-- Small: core 5 modules (20 roles)
-- Standard: +governance, incident, vendor (35 roles)
-- Enterprise: full 13-module set (40 roles)
-- ============================================================

-- ── SMALL PACK ROLES (5 modules: risk, compliance, policy, evidence, reporting) ──
INSERT INTO public.org_pack_template_roles (pack_code, role_code, module_code, name_en, description_en) VALUES
  ('small_standard','risk_creator','risk','Risk Creator','Creates new risk records'),
  ('small_standard','risk_owner','risk','Risk Owner','Owns and manages risk records'),
  ('small_standard','risk_reviewer','risk','Risk Reviewer','Reviews risk assessments'),
  ('small_standard','risk_approver','risk','Risk Approver','Approves risk assessments'),
  ('small_standard','treatment_owner','risk','Treatment Owner','Owns risk treatment plans'),
  ('small_standard','control_owner','compliance','Control Owner','Owns control design'),
  ('small_standard','control_tester','compliance','Control Tester','Tests control effectiveness'),
  ('small_standard','compliance_analyst','compliance','Compliance Analyst','Analyzes compliance status'),
  ('small_standard','compliance_manager','compliance','Compliance Manager','Manages compliance program'),
  ('small_standard','policy_author','policy','Policy Author','Drafts policies'),
  ('small_standard','policy_reviewer','policy','Policy Reviewer','Reviews policy drafts'),
  ('small_standard','policy_approver','policy','Policy Approver','Approves policies'),
  ('small_standard','document_controller','policy','Document Controller','Manages document lifecycle'),
  ('small_standard','evidence_owner','evidence','Evidence Owner','Owns evidence items'),
  ('small_standard','evidence_reviewer','evidence','Evidence Reviewer','Reviews evidence'),
  ('small_standard','custodian','evidence','Custodian','Manages evidence custody'),
  ('small_standard','report_designer','reporting','Report Designer','Creates dashboards'),
  ('small_standard','report_viewer','reporting','Report Viewer','Views reports'),
  ('small_standard','action_owner','action','Action Owner','Executes action items'),
  ('small_standard','asset_owner','asset','Asset Owner','Manages assets')
ON CONFLICT (pack_code, role_code, module_code) DO NOTHING;

-- ── STANDARD PACK ROLES (small + audit, incident, exception, governance, vendor) ──
INSERT INTO public.org_pack_template_roles (pack_code, role_code, module_code, name_en, description_en) VALUES
  ('standard_standard','risk_creator','risk','Risk Creator','Creates new risk records'),
  ('standard_standard','risk_owner','risk','Risk Owner','Owns and manages risk records'),
  ('standard_standard','risk_reviewer','risk','Risk Reviewer','Reviews risk assessments'),
  ('standard_standard','risk_approver','risk','Risk Approver','Approves risk assessments'),
  ('standard_standard','treatment_owner','risk','Treatment Owner','Owns risk treatment plans'),
  ('standard_standard','control_owner','compliance','Control Owner','Owns control design'),
  ('standard_standard','control_tester','compliance','Control Tester','Tests control effectiveness'),
  ('standard_standard','compliance_analyst','compliance','Compliance Analyst','Analyzes compliance status'),
  ('standard_standard','compliance_manager','compliance','Compliance Manager','Manages compliance program'),
  ('standard_standard','policy_author','policy','Policy Author','Drafts policies'),
  ('standard_standard','policy_reviewer','policy','Policy Reviewer','Reviews policy drafts'),
  ('standard_standard','policy_approver','policy','Policy Approver','Approves policies'),
  ('standard_standard','document_controller','policy','Document Controller','Manages document lifecycle'),
  ('standard_standard','evidence_owner','evidence','Evidence Owner','Owns evidence items'),
  ('standard_standard','evidence_reviewer','evidence','Evidence Reviewer','Reviews evidence'),
  ('standard_standard','custodian','evidence','Custodian','Manages evidence custody'),
  ('standard_standard','auditor','audit','Auditor','Performs audit procedures'),
  ('standard_standard','audit_manager','audit','Audit Manager','Manages audit engagements'),
  ('standard_standard','auditee_owner','audit','Auditee Owner','Responds to audit findings'),
  ('standard_standard','incident_reporter','incident','Incident Reporter','Reports incidents'),
  ('standard_standard','incident_owner','incident','Incident Owner','Manages incidents'),
  ('standard_standard','incident_reviewer','incident','Incident Reviewer','Reviews investigations'),
  ('standard_standard','incident_approver','incident','Incident Approver','Approves incident closure'),
  ('standard_standard','exception_requester','exception','Exception Requester','Requests exceptions'),
  ('standard_standard','exception_owner','exception','Exception Owner','Owns exception management'),
  ('standard_standard','exception_approver','exception','Exception Approver','Approves exceptions'),
  ('standard_standard','governance_manager','governance','Governance Manager','Manages governance bodies'),
  ('standard_standard','committee_secretary','governance','Committee Secretary','Manages committee proceedings'),
  ('standard_standard','vendor_owner','vendor','Vendor Owner','Owns vendor relationships'),
  ('standard_standard','vendor_assessor','vendor','Vendor Assessor','Assesses vendor risk'),
  ('standard_standard','report_designer','reporting','Report Designer','Creates dashboards'),
  ('standard_standard','report_viewer','reporting','Report Viewer','Views reports'),
  ('standard_standard','action_owner','action','Action Owner','Executes action items'),
  ('standard_standard','asset_owner','asset','Asset Owner','Manages assets'),
  ('standard_standard','asset_custodian','asset','Asset Custodian','Manages asset custody')
ON CONFLICT (pack_code, role_code, module_code) DO NOTHING;

-- ── ENTERPRISE PACK ROLES (full 40-role set) ──
INSERT INTO public.org_pack_template_roles (pack_code, role_code, module_code, name_en, description_en) VALUES
  ('enterprise_standard','risk_creator','risk','Risk Creator','Creates new risk records'),
  ('enterprise_standard','risk_owner','risk','Risk Owner','Owns and manages risk records'),
  ('enterprise_standard','risk_reviewer','risk','Risk Reviewer','Reviews risk assessments'),
  ('enterprise_standard','risk_approver','risk','Risk Approver','Approves risk assessments'),
  ('enterprise_standard','treatment_owner','risk','Treatment Owner','Owns risk treatment plans'),
  ('enterprise_standard','control_owner','compliance','Control Owner','Owns control design'),
  ('enterprise_standard','control_tester','compliance','Control Tester','Tests control effectiveness'),
  ('enterprise_standard','compliance_analyst','compliance','Compliance Analyst','Analyzes compliance status'),
  ('enterprise_standard','compliance_manager','compliance','Compliance Manager','Manages compliance program'),
  ('enterprise_standard','policy_author','policy','Policy Author','Drafts policies'),
  ('enterprise_standard','policy_reviewer','policy','Policy Reviewer','Reviews policy drafts'),
  ('enterprise_standard','policy_approver','policy','Policy Approver','Approves policies'),
  ('enterprise_standard','document_controller','policy','Document Controller','Manages document lifecycle'),
  ('enterprise_standard','evidence_owner','evidence','Evidence Owner','Owns evidence items'),
  ('enterprise_standard','evidence_reviewer','evidence','Evidence Reviewer','Reviews evidence'),
  ('enterprise_standard','custodian','evidence','Custodian','Manages evidence custody'),
  ('enterprise_standard','auditor','audit','Auditor','Performs audit procedures'),
  ('enterprise_standard','audit_manager','audit','Audit Manager','Manages audit engagements'),
  ('enterprise_standard','auditee_owner','audit','Auditee Owner','Responds to audit findings'),
  ('enterprise_standard','incident_reporter','incident','Incident Reporter','Reports incidents'),
  ('enterprise_standard','incident_owner','incident','Incident Owner','Manages incidents'),
  ('enterprise_standard','incident_reviewer','incident','Incident Reviewer','Reviews investigations'),
  ('enterprise_standard','incident_approver','incident','Incident Approver','Approves incident closure'),
  ('enterprise_standard','exception_requester','exception','Exception Requester','Requests exceptions'),
  ('enterprise_standard','exception_owner','exception','Exception Owner','Owns exception management'),
  ('enterprise_standard','exception_approver','exception','Exception Approver','Approves exceptions'),
  ('enterprise_standard','governance_manager','governance','Governance Manager','Manages governance bodies'),
  ('enterprise_standard','committee_secretary','governance','Committee Secretary','Manages committee proceedings'),
  ('enterprise_standard','charter_owner','governance','Charter Owner','Owns governance charters'),
  ('enterprise_standard','delegation_admin','governance','Delegation Admin','Manages delegation matrix'),
  ('enterprise_standard','executive_reviewer','governance','Executive Reviewer','Executive oversight'),
  ('enterprise_standard','vendor_owner','vendor','Vendor Owner','Owns vendor relationships'),
  ('enterprise_standard','vendor_assessor','vendor','Vendor Assessor','Assesses vendor risk'),
  ('enterprise_standard','bcp_coordinator','bcp','BCP Coordinator','Coordinates business continuity'),
  ('enterprise_standard','process_owner','bcp','Process Owner','Owns business processes'),
  ('enterprise_standard','report_designer','reporting','Report Designer','Creates dashboards'),
  ('enterprise_standard','report_viewer','reporting','Report Viewer','Views reports'),
  ('enterprise_standard','action_owner','action','Action Owner','Executes action items'),
  ('enterprise_standard','asset_owner','asset','Asset Owner','Manages assets'),
  ('enterprise_standard','asset_custodian','asset','Asset Custodian','Manages asset custody')
ON CONFLICT (pack_code, role_code, module_code) DO NOTHING;

-- ============================================================
-- PERMISSIONS PER PACK
-- ============================================================

-- ── SMALL PACK PERMISSIONS (core 5-module set: 40 perms) ──
INSERT INTO public.org_pack_template_permissions (pack_code, permission_code, module_code, resource_code, action_code, description_en) VALUES
  ('small_standard','risk.record.create','risk','record','create','Create risk records'),
  ('small_standard','risk.record.read','risk','record','read','View risk records'),
  ('small_standard','risk.record.update','risk','record','update','Edit risk records'),
  ('small_standard','risk.record.submit','risk','record','submit','Submit risk for review'),
  ('small_standard','risk.record.review','risk','record','review','Review risk assessments'),
  ('small_standard','risk.record.approve','risk','record','approve','Approve risk assessments'),
  ('small_standard','risk.record.close','risk','record','close','Close risk records'),
  ('small_standard','risk.treatment.assign','risk','treatment','assign','Assign treatment plans'),
  ('small_standard','risk.treatment.update','risk','treatment','update','Update treatment plans'),
  ('small_standard','compliance.control.read','compliance','control','read','View controls'),
  ('small_standard','compliance.control.create','compliance','control','create','Create controls'),
  ('small_standard','compliance.control.update','compliance','control','update','Update controls'),
  ('small_standard','compliance.test.execute','compliance','test','execute','Execute control tests'),
  ('small_standard','compliance.test.review','compliance','test','review','Review test results'),
  ('small_standard','compliance.score.review','compliance','score','review','Review scores'),
  ('small_standard','compliance.score.approve','compliance','score','approve','Approve scores'),
  ('small_standard','compliance.report.generate','compliance','report','generate','Generate reports'),
  ('small_standard','policy.document.create','policy','document','create','Draft policies'),
  ('small_standard','policy.document.read','policy','document','read','View policies'),
  ('small_standard','policy.document.update','policy','document','update','Edit policies'),
  ('small_standard','policy.document.review','policy','document','review','Review policies'),
  ('small_standard','policy.document.approve','policy','document','approve','Approve policies'),
  ('small_standard','policy.document.publish','policy','document','publish','Publish policies'),
  ('small_standard','policy.document.retire','policy','document','retire','Retire policies'),
  ('small_standard','policy.ack.attest','policy','ack','attest','Attest to policy'),
  ('small_standard','evidence.item.upload','evidence','item','upload','Upload evidence'),
  ('small_standard','evidence.item.read','evidence','item','read','View evidence'),
  ('small_standard','evidence.item.verify','evidence','item','verify','Verify evidence'),
  ('small_standard','evidence.item.lock','evidence','item','lock','Lock evidence'),
  ('small_standard','evidence.item.release','evidence','item','release','Release evidence'),
  ('small_standard','evidence.item.archive','evidence','item','archive','Archive evidence'),
  ('small_standard','asset.record.create','asset','record','create','Register assets'),
  ('small_standard','asset.record.read','asset','record','read','View assets'),
  ('small_standard','asset.record.update','asset','record','update','Update assets'),
  ('small_standard','asset.classification.review','asset','classification','review','Review classifications'),
  ('small_standard','reporting.dashboard.create','reporting','dashboard','create','Create dashboards'),
  ('small_standard','reporting.dashboard.read','reporting','dashboard','read','View dashboards'),
  ('small_standard','reporting.report.export','reporting','report','export','Export reports')
ON CONFLICT (pack_code, permission_code) DO NOTHING;

-- ── STANDARD PACK PERMISSIONS (small + audit, incident, exception, governance, vendor: 65 perms) ──
INSERT INTO public.org_pack_template_permissions (pack_code, permission_code, module_code, resource_code, action_code, description_en) VALUES
  ('standard_standard','risk.record.create','risk','record','create','Create risk records'),
  ('standard_standard','risk.record.read','risk','record','read','View risk records'),
  ('standard_standard','risk.record.update','risk','record','update','Edit risk records'),
  ('standard_standard','risk.record.submit','risk','record','submit','Submit risk for review'),
  ('standard_standard','risk.record.review','risk','record','review','Review risk assessments'),
  ('standard_standard','risk.record.approve','risk','record','approve','Approve risk assessments'),
  ('standard_standard','risk.record.close','risk','record','close','Close risk records'),
  ('standard_standard','risk.treatment.assign','risk','treatment','assign','Assign treatment plans'),
  ('standard_standard','risk.treatment.update','risk','treatment','update','Update treatment plans'),
  ('standard_standard','compliance.control.read','compliance','control','read','View controls'),
  ('standard_standard','compliance.control.create','compliance','control','create','Create controls'),
  ('standard_standard','compliance.control.update','compliance','control','update','Update controls'),
  ('standard_standard','compliance.test.execute','compliance','test','execute','Execute control tests'),
  ('standard_standard','compliance.test.review','compliance','test','review','Review test results'),
  ('standard_standard','compliance.score.review','compliance','score','review','Review scores'),
  ('standard_standard','compliance.score.approve','compliance','score','approve','Approve scores'),
  ('standard_standard','compliance.report.generate','compliance','report','generate','Generate reports'),
  ('standard_standard','policy.document.create','policy','document','create','Draft policies'),
  ('standard_standard','policy.document.read','policy','document','read','View policies'),
  ('standard_standard','policy.document.update','policy','document','update','Edit policies'),
  ('standard_standard','policy.document.review','policy','document','review','Review policies'),
  ('standard_standard','policy.document.approve','policy','document','approve','Approve policies'),
  ('standard_standard','policy.document.publish','policy','document','publish','Publish policies'),
  ('standard_standard','policy.document.retire','policy','document','retire','Retire policies'),
  ('standard_standard','policy.ack.attest','policy','ack','attest','Attest to policy'),
  ('standard_standard','evidence.item.upload','evidence','item','upload','Upload evidence'),
  ('standard_standard','evidence.item.read','evidence','item','read','View evidence'),
  ('standard_standard','evidence.item.verify','evidence','item','verify','Verify evidence'),
  ('standard_standard','evidence.item.lock','evidence','item','lock','Lock evidence'),
  ('standard_standard','evidence.item.release','evidence','item','release','Release evidence'),
  ('standard_standard','evidence.item.archive','evidence','item','archive','Archive evidence'),
  ('standard_standard','audit.engagement.create','audit','engagement','create','Create engagements'),
  ('standard_standard','audit.engagement.read','audit','engagement','read','View engagements'),
  ('standard_standard','audit.workpaper.update','audit','workpaper','update','Update workpapers'),
  ('standard_standard','audit.finding.issue','audit','finding','issue','Issue findings'),
  ('standard_standard','audit.finding.respond','audit','finding','respond','Respond to findings'),
  ('standard_standard','audit.finding.close','audit','finding','close','Close findings'),
  ('standard_standard','audit.report.create','audit','report','create','Create audit reports'),
  ('standard_standard','audit.report.approve','audit','report','approve','Approve audit reports'),
  ('standard_standard','incident.record.create','incident','record','create','Report incidents'),
  ('standard_standard','incident.record.read','incident','record','read','View incidents'),
  ('standard_standard','incident.record.update','incident','record','update','Update incidents'),
  ('standard_standard','incident.record.review','incident','record','review','Review investigations'),
  ('standard_standard','incident.record.approve','incident','record','approve','Approve closure'),
  ('standard_standard','incident.record.escalate','incident','record','escalate','Escalate severity'),
  ('standard_standard','exception.request.create','exception','request','create','Request exceptions'),
  ('standard_standard','exception.request.read','exception','request','read','View exceptions'),
  ('standard_standard','exception.request.review','exception','request','review','Review requests'),
  ('standard_standard','exception.request.approve','exception','request','approve','Approve exceptions'),
  ('standard_standard','governance.body.create','governance','body','create','Create bodies'),
  ('standard_standard','governance.body.read','governance','body','read','View bodies'),
  ('standard_standard','governance.charter.update','governance','charter','update','Update charters'),
  ('standard_standard','governance.delegation.manage','governance','delegation','manage','Manage delegations'),
  ('standard_standard','governance.meeting.manage','governance','meeting','manage','Manage meetings'),
  ('standard_standard','vendor.record.create','vendor','record','create','Onboard vendors'),
  ('standard_standard','vendor.record.read','vendor','record','read','View vendors'),
  ('standard_standard','vendor.assessment.execute','vendor','assessment','execute','Execute assessments'),
  ('standard_standard','vendor.assessment.approve','vendor','assessment','approve','Approve assessments'),
  ('standard_standard','asset.record.create','asset','record','create','Register assets'),
  ('standard_standard','asset.record.read','asset','record','read','View assets'),
  ('standard_standard','asset.record.update','asset','record','update','Update assets'),
  ('standard_standard','asset.classification.review','asset','classification','review','Review classifications'),
  ('standard_standard','reporting.dashboard.create','reporting','dashboard','create','Create dashboards'),
  ('standard_standard','reporting.dashboard.read','reporting','dashboard','read','View dashboards'),
  ('standard_standard','reporting.report.export','reporting','report','export','Export reports')
ON CONFLICT (pack_code, permission_code) DO NOTHING;

-- ── ENTERPRISE PACK PERMISSIONS (full set + BCP: 73 perms) ──
INSERT INTO public.org_pack_template_permissions (pack_code, permission_code, module_code, resource_code, action_code, description_en) VALUES
  ('enterprise_standard','risk.record.create','risk','record','create','Create risk records'),
  ('enterprise_standard','risk.record.read','risk','record','read','View risk records'),
  ('enterprise_standard','risk.record.update','risk','record','update','Edit risk records'),
  ('enterprise_standard','risk.record.submit','risk','record','submit','Submit risk for review'),
  ('enterprise_standard','risk.record.review','risk','record','review','Review risk assessments'),
  ('enterprise_standard','risk.record.approve','risk','record','approve','Approve risk assessments'),
  ('enterprise_standard','risk.record.close','risk','record','close','Close risk records'),
  ('enterprise_standard','risk.treatment.assign','risk','treatment','assign','Assign treatment plans'),
  ('enterprise_standard','risk.treatment.update','risk','treatment','update','Update treatment plans'),
  ('enterprise_standard','compliance.control.read','compliance','control','read','View controls'),
  ('enterprise_standard','compliance.control.create','compliance','control','create','Create controls'),
  ('enterprise_standard','compliance.control.update','compliance','control','update','Update controls'),
  ('enterprise_standard','compliance.test.execute','compliance','test','execute','Execute control tests'),
  ('enterprise_standard','compliance.test.review','compliance','test','review','Review test results'),
  ('enterprise_standard','compliance.score.review','compliance','score','review','Review scores'),
  ('enterprise_standard','compliance.score.approve','compliance','score','approve','Approve scores'),
  ('enterprise_standard','compliance.report.generate','compliance','report','generate','Generate reports'),
  ('enterprise_standard','policy.document.create','policy','document','create','Draft policies'),
  ('enterprise_standard','policy.document.read','policy','document','read','View policies'),
  ('enterprise_standard','policy.document.update','policy','document','update','Edit policies'),
  ('enterprise_standard','policy.document.review','policy','document','review','Review policies'),
  ('enterprise_standard','policy.document.approve','policy','document','approve','Approve policies'),
  ('enterprise_standard','policy.document.publish','policy','document','publish','Publish policies'),
  ('enterprise_standard','policy.document.retire','policy','document','retire','Retire policies'),
  ('enterprise_standard','policy.ack.attest','policy','ack','attest','Attest to policy'),
  ('enterprise_standard','evidence.item.upload','evidence','item','upload','Upload evidence'),
  ('enterprise_standard','evidence.item.read','evidence','item','read','View evidence'),
  ('enterprise_standard','evidence.item.verify','evidence','item','verify','Verify evidence'),
  ('enterprise_standard','evidence.item.lock','evidence','item','lock','Lock evidence'),
  ('enterprise_standard','evidence.item.release','evidence','item','release','Release evidence'),
  ('enterprise_standard','evidence.item.archive','evidence','item','archive','Archive evidence'),
  ('enterprise_standard','audit.engagement.create','audit','engagement','create','Create engagements'),
  ('enterprise_standard','audit.engagement.read','audit','engagement','read','View engagements'),
  ('enterprise_standard','audit.workpaper.update','audit','workpaper','update','Update workpapers'),
  ('enterprise_standard','audit.finding.issue','audit','finding','issue','Issue findings'),
  ('enterprise_standard','audit.finding.respond','audit','finding','respond','Respond to findings'),
  ('enterprise_standard','audit.finding.close','audit','finding','close','Close findings'),
  ('enterprise_standard','audit.report.create','audit','report','create','Create audit reports'),
  ('enterprise_standard','audit.report.approve','audit','report','approve','Approve audit reports'),
  ('enterprise_standard','incident.record.create','incident','record','create','Report incidents'),
  ('enterprise_standard','incident.record.read','incident','record','read','View incidents'),
  ('enterprise_standard','incident.record.update','incident','record','update','Update incidents'),
  ('enterprise_standard','incident.record.review','incident','record','review','Review investigations'),
  ('enterprise_standard','incident.record.approve','incident','record','approve','Approve closure'),
  ('enterprise_standard','incident.record.escalate','incident','record','escalate','Escalate severity'),
  ('enterprise_standard','exception.request.create','exception','request','create','Request exceptions'),
  ('enterprise_standard','exception.request.read','exception','request','read','View exceptions'),
  ('enterprise_standard','exception.request.review','exception','request','review','Review requests'),
  ('enterprise_standard','exception.request.approve','exception','request','approve','Approve exceptions'),
  ('enterprise_standard','governance.body.create','governance','body','create','Create bodies'),
  ('enterprise_standard','governance.body.read','governance','body','read','View bodies'),
  ('enterprise_standard','governance.charter.update','governance','charter','update','Update charters'),
  ('enterprise_standard','governance.delegation.manage','governance','delegation','manage','Manage delegations'),
  ('enterprise_standard','governance.meeting.manage','governance','meeting','manage','Manage meetings'),
  ('enterprise_standard','vendor.record.create','vendor','record','create','Onboard vendors'),
  ('enterprise_standard','vendor.record.read','vendor','record','read','View vendors'),
  ('enterprise_standard','vendor.assessment.execute','vendor','assessment','execute','Execute assessments'),
  ('enterprise_standard','vendor.assessment.approve','vendor','assessment','approve','Approve assessments'),
  ('enterprise_standard','bcp.plan.create','bcp','plan','create','Create continuity plans'),
  ('enterprise_standard','bcp.plan.read','bcp','plan','read','View continuity plans'),
  ('enterprise_standard','bcp.plan.update','bcp','plan','update','Update continuity plans'),
  ('enterprise_standard','bcp.exercise.approve','bcp','exercise','approve','Approve BCP exercises'),
  ('enterprise_standard','asset.record.create','asset','record','create','Register assets'),
  ('enterprise_standard','asset.record.read','asset','record','read','View assets'),
  ('enterprise_standard','asset.record.update','asset','record','update','Update assets'),
  ('enterprise_standard','asset.classification.review','asset','classification','review','Review classifications'),
  ('enterprise_standard','reporting.dashboard.create','reporting','dashboard','create','Create dashboards'),
  ('enterprise_standard','reporting.dashboard.read','reporting','dashboard','read','View dashboards'),
  ('enterprise_standard','reporting.report.export','reporting','report','export','Export reports')
ON CONFLICT (pack_code, permission_code) DO NOTHING;

-- ============================================================
-- ROLE-PERMISSION MAPPINGS PER PACK
-- Maps which functional roles get which permissions per pack
-- ============================================================

-- ── SMALL PACK ROLE-PERMISSIONS ──
INSERT INTO public.org_pack_template_role_permissions (pack_code, role_code, permission_code) VALUES
  ('small_standard','risk_creator','risk.record.create'),('small_standard','risk_creator','risk.record.read'),('small_standard','risk_creator','risk.record.update'),
  ('small_standard','risk_owner','risk.record.read'),('small_standard','risk_owner','risk.record.update'),('small_standard','risk_owner','risk.record.submit'),('small_standard','risk_owner','risk.treatment.assign'),('small_standard','risk_owner','risk.treatment.update'),
  ('small_standard','risk_reviewer','risk.record.read'),('small_standard','risk_reviewer','risk.record.review'),
  ('small_standard','risk_approver','risk.record.read'),('small_standard','risk_approver','risk.record.approve'),('small_standard','risk_approver','risk.record.close'),
  ('small_standard','treatment_owner','risk.record.read'),('small_standard','treatment_owner','risk.treatment.update'),
  ('small_standard','control_owner','compliance.control.read'),('small_standard','control_owner','compliance.control.create'),('small_standard','control_owner','compliance.control.update'),
  ('small_standard','control_tester','compliance.control.read'),('small_standard','control_tester','compliance.test.execute'),
  ('small_standard','compliance_analyst','compliance.control.read'),('small_standard','compliance_analyst','compliance.score.review'),('small_standard','compliance_analyst','compliance.report.generate'),
  ('small_standard','compliance_manager','compliance.control.read'),('small_standard','compliance_manager','compliance.control.create'),('small_standard','compliance_manager','compliance.control.update'),('small_standard','compliance_manager','compliance.test.review'),('small_standard','compliance_manager','compliance.score.review'),('small_standard','compliance_manager','compliance.score.approve'),('small_standard','compliance_manager','compliance.report.generate'),
  ('small_standard','policy_author','policy.document.create'),('small_standard','policy_author','policy.document.read'),('small_standard','policy_author','policy.document.update'),
  ('small_standard','policy_reviewer','policy.document.read'),('small_standard','policy_reviewer','policy.document.review'),
  ('small_standard','policy_approver','policy.document.read'),('small_standard','policy_approver','policy.document.approve'),('small_standard','policy_approver','policy.document.publish'),
  ('small_standard','document_controller','policy.document.read'),('small_standard','document_controller','policy.document.update'),('small_standard','document_controller','policy.document.publish'),('small_standard','document_controller','policy.document.retire'),
  ('small_standard','evidence_owner','evidence.item.upload'),('small_standard','evidence_owner','evidence.item.read'),('small_standard','evidence_owner','evidence.item.release'),
  ('small_standard','evidence_reviewer','evidence.item.read'),('small_standard','evidence_reviewer','evidence.item.verify'),
  ('small_standard','custodian','evidence.item.read'),('small_standard','custodian','evidence.item.lock'),('small_standard','custodian','evidence.item.archive'),
  ('small_standard','report_designer','reporting.dashboard.create'),('small_standard','report_designer','reporting.dashboard.read'),('small_standard','report_designer','reporting.report.export'),
  ('small_standard','report_viewer','reporting.dashboard.read'),
  ('small_standard','action_owner','risk.record.read'),('small_standard','action_owner','compliance.control.read'),('small_standard','action_owner','evidence.item.upload'),
  ('small_standard','asset_owner','asset.record.create'),('small_standard','asset_owner','asset.record.read'),('small_standard','asset_owner','asset.record.update')
ON CONFLICT (pack_code, role_code, permission_code) DO NOTHING;

-- ── STANDARD PACK ROLE-PERMISSIONS (small bindings + new module bindings) ──
INSERT INTO public.org_pack_template_role_permissions (pack_code, role_code, permission_code) VALUES
  -- risk
  ('standard_standard','risk_creator','risk.record.create'),('standard_standard','risk_creator','risk.record.read'),('standard_standard','risk_creator','risk.record.update'),
  ('standard_standard','risk_owner','risk.record.read'),('standard_standard','risk_owner','risk.record.update'),('standard_standard','risk_owner','risk.record.submit'),('standard_standard','risk_owner','risk.treatment.assign'),('standard_standard','risk_owner','risk.treatment.update'),
  ('standard_standard','risk_reviewer','risk.record.read'),('standard_standard','risk_reviewer','risk.record.review'),
  ('standard_standard','risk_approver','risk.record.read'),('standard_standard','risk_approver','risk.record.approve'),('standard_standard','risk_approver','risk.record.close'),
  ('standard_standard','treatment_owner','risk.record.read'),('standard_standard','treatment_owner','risk.treatment.update'),
  -- compliance
  ('standard_standard','control_owner','compliance.control.read'),('standard_standard','control_owner','compliance.control.create'),('standard_standard','control_owner','compliance.control.update'),
  ('standard_standard','control_tester','compliance.control.read'),('standard_standard','control_tester','compliance.test.execute'),
  ('standard_standard','compliance_analyst','compliance.control.read'),('standard_standard','compliance_analyst','compliance.score.review'),('standard_standard','compliance_analyst','compliance.report.generate'),
  ('standard_standard','compliance_manager','compliance.control.read'),('standard_standard','compliance_manager','compliance.control.create'),('standard_standard','compliance_manager','compliance.control.update'),('standard_standard','compliance_manager','compliance.test.review'),('standard_standard','compliance_manager','compliance.score.review'),('standard_standard','compliance_manager','compliance.score.approve'),('standard_standard','compliance_manager','compliance.report.generate'),
  -- policy
  ('standard_standard','policy_author','policy.document.create'),('standard_standard','policy_author','policy.document.read'),('standard_standard','policy_author','policy.document.update'),
  ('standard_standard','policy_reviewer','policy.document.read'),('standard_standard','policy_reviewer','policy.document.review'),
  ('standard_standard','policy_approver','policy.document.read'),('standard_standard','policy_approver','policy.document.approve'),('standard_standard','policy_approver','policy.document.publish'),
  ('standard_standard','document_controller','policy.document.read'),('standard_standard','document_controller','policy.document.update'),('standard_standard','document_controller','policy.document.publish'),('standard_standard','document_controller','policy.document.retire'),
  -- evidence
  ('standard_standard','evidence_owner','evidence.item.upload'),('standard_standard','evidence_owner','evidence.item.read'),('standard_standard','evidence_owner','evidence.item.release'),
  ('standard_standard','evidence_reviewer','evidence.item.read'),('standard_standard','evidence_reviewer','evidence.item.verify'),
  ('standard_standard','custodian','evidence.item.read'),('standard_standard','custodian','evidence.item.lock'),('standard_standard','custodian','evidence.item.archive'),
  -- audit
  ('standard_standard','auditor','audit.engagement.read'),('standard_standard','auditor','audit.workpaper.update'),('standard_standard','auditor','audit.finding.issue'),('standard_standard','auditor','audit.report.create'),('standard_standard','auditor','evidence.item.read'),
  ('standard_standard','audit_manager','audit.engagement.create'),('standard_standard','audit_manager','audit.engagement.read'),('standard_standard','audit_manager','audit.workpaper.update'),('standard_standard','audit_manager','audit.finding.issue'),('standard_standard','audit_manager','audit.finding.close'),('standard_standard','audit_manager','audit.report.create'),('standard_standard','audit_manager','audit.report.approve'),('standard_standard','audit_manager','evidence.item.read'),
  ('standard_standard','auditee_owner','audit.engagement.read'),('standard_standard','auditee_owner','audit.finding.respond'),
  -- incident
  ('standard_standard','incident_reporter','incident.record.create'),('standard_standard','incident_reporter','incident.record.read'),
  ('standard_standard','incident_owner','incident.record.create'),('standard_standard','incident_owner','incident.record.read'),('standard_standard','incident_owner','incident.record.update'),
  ('standard_standard','incident_reviewer','incident.record.read'),('standard_standard','incident_reviewer','incident.record.review'),
  ('standard_standard','incident_approver','incident.record.read'),('standard_standard','incident_approver','incident.record.approve'),
  -- exception
  ('standard_standard','exception_requester','exception.request.create'),('standard_standard','exception_requester','exception.request.read'),
  ('standard_standard','exception_owner','exception.request.read'),('standard_standard','exception_owner','exception.request.review'),
  ('standard_standard','exception_approver','exception.request.read'),('standard_standard','exception_approver','exception.request.approve'),
  -- governance
  ('standard_standard','governance_manager','governance.body.create'),('standard_standard','governance_manager','governance.body.read'),('standard_standard','governance_manager','governance.charter.update'),('standard_standard','governance_manager','governance.delegation.manage'),('standard_standard','governance_manager','governance.meeting.manage'),
  ('standard_standard','committee_secretary','governance.body.read'),('standard_standard','committee_secretary','governance.meeting.manage'),
  -- vendor
  ('standard_standard','vendor_owner','vendor.record.create'),('standard_standard','vendor_owner','vendor.record.read'),('standard_standard','vendor_owner','vendor.assessment.execute'),
  ('standard_standard','vendor_assessor','vendor.record.read'),('standard_standard','vendor_assessor','vendor.assessment.execute'),('standard_standard','vendor_assessor','vendor.assessment.approve'),
  -- shared
  ('standard_standard','report_designer','reporting.dashboard.create'),('standard_standard','report_designer','reporting.dashboard.read'),('standard_standard','report_designer','reporting.report.export'),
  ('standard_standard','report_viewer','reporting.dashboard.read'),
  ('standard_standard','action_owner','risk.record.read'),('standard_standard','action_owner','compliance.control.read'),('standard_standard','action_owner','evidence.item.upload'),
  ('standard_standard','asset_owner','asset.record.create'),('standard_standard','asset_owner','asset.record.read'),('standard_standard','asset_owner','asset.record.update'),
  ('standard_standard','asset_custodian','asset.record.read'),('standard_standard','asset_custodian','asset.classification.review')
ON CONFLICT (pack_code, role_code, permission_code) DO NOTHING;

-- ── ENTERPRISE PACK ROLE-PERMISSIONS (standard bindings + BCP + executive) ──
INSERT INTO public.org_pack_template_role_permissions (pack_code, role_code, permission_code) VALUES
  -- risk
  ('enterprise_standard','risk_creator','risk.record.create'),('enterprise_standard','risk_creator','risk.record.read'),('enterprise_standard','risk_creator','risk.record.update'),
  ('enterprise_standard','risk_owner','risk.record.read'),('enterprise_standard','risk_owner','risk.record.update'),('enterprise_standard','risk_owner','risk.record.submit'),('enterprise_standard','risk_owner','risk.treatment.assign'),('enterprise_standard','risk_owner','risk.treatment.update'),
  ('enterprise_standard','risk_reviewer','risk.record.read'),('enterprise_standard','risk_reviewer','risk.record.review'),
  ('enterprise_standard','risk_approver','risk.record.read'),('enterprise_standard','risk_approver','risk.record.approve'),('enterprise_standard','risk_approver','risk.record.close'),
  ('enterprise_standard','treatment_owner','risk.record.read'),('enterprise_standard','treatment_owner','risk.treatment.update'),
  -- compliance
  ('enterprise_standard','control_owner','compliance.control.read'),('enterprise_standard','control_owner','compliance.control.create'),('enterprise_standard','control_owner','compliance.control.update'),
  ('enterprise_standard','control_tester','compliance.control.read'),('enterprise_standard','control_tester','compliance.test.execute'),
  ('enterprise_standard','compliance_analyst','compliance.control.read'),('enterprise_standard','compliance_analyst','compliance.score.review'),('enterprise_standard','compliance_analyst','compliance.report.generate'),
  ('enterprise_standard','compliance_manager','compliance.control.read'),('enterprise_standard','compliance_manager','compliance.control.create'),('enterprise_standard','compliance_manager','compliance.control.update'),('enterprise_standard','compliance_manager','compliance.test.review'),('enterprise_standard','compliance_manager','compliance.score.review'),('enterprise_standard','compliance_manager','compliance.score.approve'),('enterprise_standard','compliance_manager','compliance.report.generate'),
  -- policy
  ('enterprise_standard','policy_author','policy.document.create'),('enterprise_standard','policy_author','policy.document.read'),('enterprise_standard','policy_author','policy.document.update'),
  ('enterprise_standard','policy_reviewer','policy.document.read'),('enterprise_standard','policy_reviewer','policy.document.review'),
  ('enterprise_standard','policy_approver','policy.document.read'),('enterprise_standard','policy_approver','policy.document.approve'),('enterprise_standard','policy_approver','policy.document.publish'),
  ('enterprise_standard','document_controller','policy.document.read'),('enterprise_standard','document_controller','policy.document.update'),('enterprise_standard','document_controller','policy.document.publish'),('enterprise_standard','document_controller','policy.document.retire'),
  -- evidence
  ('enterprise_standard','evidence_owner','evidence.item.upload'),('enterprise_standard','evidence_owner','evidence.item.read'),('enterprise_standard','evidence_owner','evidence.item.release'),
  ('enterprise_standard','evidence_reviewer','evidence.item.read'),('enterprise_standard','evidence_reviewer','evidence.item.verify'),
  ('enterprise_standard','custodian','evidence.item.read'),('enterprise_standard','custodian','evidence.item.lock'),('enterprise_standard','custodian','evidence.item.archive'),
  -- audit
  ('enterprise_standard','auditor','audit.engagement.read'),('enterprise_standard','auditor','audit.workpaper.update'),('enterprise_standard','auditor','audit.finding.issue'),('enterprise_standard','auditor','audit.report.create'),('enterprise_standard','auditor','evidence.item.read'),
  ('enterprise_standard','audit_manager','audit.engagement.create'),('enterprise_standard','audit_manager','audit.engagement.read'),('enterprise_standard','audit_manager','audit.workpaper.update'),('enterprise_standard','audit_manager','audit.finding.issue'),('enterprise_standard','audit_manager','audit.finding.close'),('enterprise_standard','audit_manager','audit.report.create'),('enterprise_standard','audit_manager','audit.report.approve'),('enterprise_standard','audit_manager','evidence.item.read'),
  ('enterprise_standard','auditee_owner','audit.engagement.read'),('enterprise_standard','auditee_owner','audit.finding.respond'),
  -- incident
  ('enterprise_standard','incident_reporter','incident.record.create'),('enterprise_standard','incident_reporter','incident.record.read'),
  ('enterprise_standard','incident_owner','incident.record.create'),('enterprise_standard','incident_owner','incident.record.read'),('enterprise_standard','incident_owner','incident.record.update'),
  ('enterprise_standard','incident_reviewer','incident.record.read'),('enterprise_standard','incident_reviewer','incident.record.review'),
  ('enterprise_standard','incident_approver','incident.record.read'),('enterprise_standard','incident_approver','incident.record.approve'),
  -- exception
  ('enterprise_standard','exception_requester','exception.request.create'),('enterprise_standard','exception_requester','exception.request.read'),
  ('enterprise_standard','exception_owner','exception.request.read'),('enterprise_standard','exception_owner','exception.request.review'),
  ('enterprise_standard','exception_approver','exception.request.read'),('enterprise_standard','exception_approver','exception.request.approve'),
  -- governance
  ('enterprise_standard','governance_manager','governance.body.create'),('enterprise_standard','governance_manager','governance.body.read'),('enterprise_standard','governance_manager','governance.charter.update'),('enterprise_standard','governance_manager','governance.delegation.manage'),('enterprise_standard','governance_manager','governance.meeting.manage'),
  ('enterprise_standard','committee_secretary','governance.body.read'),('enterprise_standard','committee_secretary','governance.meeting.manage'),
  ('enterprise_standard','charter_owner','governance.body.read'),('enterprise_standard','charter_owner','governance.charter.update'),
  ('enterprise_standard','delegation_admin','governance.body.read'),('enterprise_standard','delegation_admin','governance.delegation.manage'),
  ('enterprise_standard','executive_reviewer','governance.body.read'),('enterprise_standard','executive_reviewer','risk.record.read'),('enterprise_standard','executive_reviewer','risk.record.approve'),('enterprise_standard','executive_reviewer','compliance.control.read'),('enterprise_standard','executive_reviewer','audit.engagement.read'),('enterprise_standard','executive_reviewer','audit.report.approve'),('enterprise_standard','executive_reviewer','reporting.dashboard.read'),('enterprise_standard','executive_reviewer','reporting.report.export'),
  -- vendor
  ('enterprise_standard','vendor_owner','vendor.record.create'),('enterprise_standard','vendor_owner','vendor.record.read'),('enterprise_standard','vendor_owner','vendor.assessment.execute'),
  ('enterprise_standard','vendor_assessor','vendor.record.read'),('enterprise_standard','vendor_assessor','vendor.assessment.execute'),('enterprise_standard','vendor_assessor','vendor.assessment.approve'),
  -- bcp
  ('enterprise_standard','bcp_coordinator','bcp.plan.create'),('enterprise_standard','bcp_coordinator','bcp.plan.read'),('enterprise_standard','bcp_coordinator','bcp.plan.update'),('enterprise_standard','bcp_coordinator','bcp.exercise.approve'),
  ('enterprise_standard','process_owner','bcp.plan.read'),('enterprise_standard','process_owner','bcp.plan.update'),
  -- shared
  ('enterprise_standard','report_designer','reporting.dashboard.create'),('enterprise_standard','report_designer','reporting.dashboard.read'),('enterprise_standard','report_designer','reporting.report.export'),
  ('enterprise_standard','report_viewer','reporting.dashboard.read'),
  ('enterprise_standard','action_owner','risk.record.read'),('enterprise_standard','action_owner','compliance.control.read'),('enterprise_standard','action_owner','evidence.item.upload'),
  ('enterprise_standard','asset_owner','asset.record.create'),('enterprise_standard','asset_owner','asset.record.read'),('enterprise_standard','asset_owner','asset.record.update'),
  ('enterprise_standard','asset_custodian','asset.record.read'),('enterprise_standard','asset_custodian','asset.classification.review')
ON CONFLICT (pack_code, role_code, permission_code) DO NOTHING;

-- ============================================================
-- WORKFLOW TEMPLATES PER PACK
-- Defines which lifecycle workflows each pack includes
-- ============================================================

-- ── SMALL PACK WORKFLOWS (core 5 module lifecycle) ──
INSERT INTO public.org_pack_template_workflows (pack_code, workflow_code, module_code, entity_type, from_status, to_status, required_role_code, min_approvers, require_different_user, description_en) VALUES
  ('small_standard','risk_submit','risk','risk_record','draft','submitted','risk_owner',0,FALSE,'Submit risk for review'),
  ('small_standard','risk_review','risk','risk_record','submitted','reviewed','risk_reviewer',1,TRUE,'Review risk assessment'),
  ('small_standard','risk_approve','risk','risk_record','reviewed','approved','risk_approver',1,TRUE,'Approve risk assessment'),
  ('small_standard','compliance_test','compliance','control','active','tested','control_tester',0,FALSE,'Execute control test'),
  ('small_standard','compliance_review','compliance','control','tested','reviewed','compliance_analyst',1,TRUE,'Review test results'),
  ('small_standard','policy_draft','policy','document','draft','review','policy_author',0,FALSE,'Submit policy for review'),
  ('small_standard','policy_review','policy','document','review','approved','policy_reviewer',1,TRUE,'Review policy'),
  ('small_standard','policy_publish','policy','document','approved','published','policy_approver',1,TRUE,'Publish policy'),
  ('small_standard','evidence_submit','evidence','evidence_item','pending','submitted','evidence_owner',0,FALSE,'Submit evidence'),
  ('small_standard','evidence_verify','evidence','evidence_item','submitted','verified','evidence_reviewer',1,TRUE,'Verify evidence')
ON CONFLICT (pack_code, workflow_code) DO NOTHING;

-- ── STANDARD PACK WORKFLOWS (small + audit, incident, exception, governance, vendor) ──
INSERT INTO public.org_pack_template_workflows (pack_code, workflow_code, module_code, entity_type, from_status, to_status, required_role_code, min_approvers, require_different_user, description_en) VALUES
  ('standard_standard','risk_submit','risk','risk_record','draft','submitted','risk_owner',0,FALSE,'Submit risk for review'),
  ('standard_standard','risk_review','risk','risk_record','submitted','reviewed','risk_reviewer',1,TRUE,'Review risk assessment'),
  ('standard_standard','risk_approve','risk','risk_record','reviewed','approved','risk_approver',1,TRUE,'Approve risk assessment'),
  ('standard_standard','compliance_test','compliance','control','active','tested','control_tester',0,FALSE,'Execute control test'),
  ('standard_standard','compliance_review','compliance','control','tested','reviewed','compliance_analyst',1,TRUE,'Review test results'),
  ('standard_standard','compliance_approve','compliance','control','reviewed','approved','compliance_manager',1,TRUE,'Approve compliance score'),
  ('standard_standard','policy_draft','policy','document','draft','review','policy_author',0,FALSE,'Submit policy for review'),
  ('standard_standard','policy_review','policy','document','review','approved','policy_reviewer',1,TRUE,'Review policy'),
  ('standard_standard','policy_publish','policy','document','approved','published','policy_approver',1,TRUE,'Publish policy'),
  ('standard_standard','evidence_submit','evidence','evidence_item','pending','submitted','evidence_owner',0,FALSE,'Submit evidence'),
  ('standard_standard','evidence_verify','evidence','evidence_item','submitted','verified','evidence_reviewer',1,TRUE,'Verify evidence'),
  ('standard_standard','audit_plan','audit','engagement','draft','planned','audit_manager',0,FALSE,'Plan audit engagement'),
  ('standard_standard','audit_execute','audit','engagement','planned','fieldwork','auditor',0,FALSE,'Execute audit fieldwork'),
  ('standard_standard','audit_report','audit','engagement','fieldwork','reporting','audit_manager',1,TRUE,'Create audit report'),
  ('standard_standard','audit_close','audit','engagement','reporting','closed','audit_manager',1,TRUE,'Close audit engagement'),
  ('standard_standard','incident_triage','incident','incident_record','reported','triaged','incident_owner',0,FALSE,'Triage incident'),
  ('standard_standard','incident_investigate','incident','incident_record','triaged','investigated','incident_reviewer',1,TRUE,'Investigate incident'),
  ('standard_standard','incident_close','incident','incident_record','investigated','closed','incident_approver',1,TRUE,'Close incident'),
  ('standard_standard','exception_review','exception','exception_request','submitted','reviewed','exception_owner',1,TRUE,'Review exception'),
  ('standard_standard','exception_approve','exception','exception_request','reviewed','approved','exception_approver',1,TRUE,'Approve exception'),
  ('standard_standard','vendor_assess','vendor','vendor_record','onboarded','assessed','vendor_assessor',0,FALSE,'Assess vendor risk'),
  ('standard_standard','vendor_approve','vendor','vendor_record','assessed','approved','vendor_assessor',1,TRUE,'Approve vendor assessment')
ON CONFLICT (pack_code, workflow_code) DO NOTHING;

-- ── ENTERPRISE PACK WORKFLOWS (standard + BCP + executive governance) ──
INSERT INTO public.org_pack_template_workflows (pack_code, workflow_code, module_code, entity_type, from_status, to_status, required_role_code, min_approvers, require_different_user, description_en) VALUES
  ('enterprise_standard','risk_submit','risk','risk_record','draft','submitted','risk_owner',0,FALSE,'Submit risk for review'),
  ('enterprise_standard','risk_review','risk','risk_record','submitted','reviewed','risk_reviewer',1,TRUE,'Review risk assessment'),
  ('enterprise_standard','risk_approve','risk','risk_record','reviewed','approved','risk_approver',1,TRUE,'Approve risk assessment'),
  ('enterprise_standard','risk_close','risk','risk_record','approved','closed','risk_approver',1,TRUE,'Close risk record'),
  ('enterprise_standard','compliance_test','compliance','control','active','tested','control_tester',0,FALSE,'Execute control test'),
  ('enterprise_standard','compliance_review','compliance','control','tested','reviewed','compliance_analyst',1,TRUE,'Review test results'),
  ('enterprise_standard','compliance_approve','compliance','control','reviewed','approved','compliance_manager',1,TRUE,'Approve compliance score'),
  ('enterprise_standard','policy_draft','policy','document','draft','review','policy_author',0,FALSE,'Submit policy for review'),
  ('enterprise_standard','policy_review','policy','document','review','approved','policy_reviewer',1,TRUE,'Review policy'),
  ('enterprise_standard','policy_publish','policy','document','approved','published','policy_approver',1,TRUE,'Publish policy'),
  ('enterprise_standard','policy_retire','policy','document','published','retired','document_controller',0,FALSE,'Retire policy'),
  ('enterprise_standard','evidence_submit','evidence','evidence_item','pending','submitted','evidence_owner',0,FALSE,'Submit evidence'),
  ('enterprise_standard','evidence_verify','evidence','evidence_item','submitted','verified','evidence_reviewer',1,TRUE,'Verify evidence'),
  ('enterprise_standard','evidence_lock','evidence','evidence_item','verified','locked','custodian',0,FALSE,'Lock evidence'),
  ('enterprise_standard','audit_plan','audit','engagement','draft','planned','audit_manager',0,FALSE,'Plan audit engagement'),
  ('enterprise_standard','audit_execute','audit','engagement','planned','fieldwork','auditor',0,FALSE,'Execute audit fieldwork'),
  ('enterprise_standard','audit_report','audit','engagement','fieldwork','reporting','audit_manager',1,TRUE,'Create audit report'),
  ('enterprise_standard','audit_close','audit','engagement','reporting','closed','audit_manager',1,TRUE,'Close audit engagement'),
  ('enterprise_standard','incident_triage','incident','incident_record','reported','triaged','incident_owner',0,FALSE,'Triage incident'),
  ('enterprise_standard','incident_investigate','incident','incident_record','triaged','investigated','incident_reviewer',1,TRUE,'Investigate incident'),
  ('enterprise_standard','incident_close','incident','incident_record','investigated','closed','incident_approver',1,TRUE,'Close incident'),
  ('enterprise_standard','incident_escalate','incident','incident_record','triaged','escalated','incident_owner',0,FALSE,'Escalate incident'),
  ('enterprise_standard','exception_review','exception','exception_request','submitted','reviewed','exception_owner',1,TRUE,'Review exception'),
  ('enterprise_standard','exception_approve','exception','exception_request','reviewed','approved','exception_approver',1,TRUE,'Approve exception'),
  ('enterprise_standard','governance_charter_review','governance','charter','draft','reviewed','charter_owner',1,TRUE,'Review charter'),
  ('enterprise_standard','governance_charter_approve','governance','charter','reviewed','approved','executive_reviewer',1,TRUE,'Approve charter'),
  ('enterprise_standard','vendor_assess','vendor','vendor_record','onboarded','assessed','vendor_assessor',0,FALSE,'Assess vendor risk'),
  ('enterprise_standard','vendor_approve','vendor','vendor_record','assessed','approved','vendor_assessor',1,TRUE,'Approve vendor assessment'),
  ('enterprise_standard','bcp_plan_review','bcp','plan','draft','reviewed','bcp_coordinator',1,TRUE,'Review BCP plan'),
  ('enterprise_standard','bcp_plan_approve','bcp','plan','reviewed','approved','bcp_coordinator',1,TRUE,'Approve BCP plan'),
  ('enterprise_standard','bcp_exercise','bcp','exercise','planned','completed','process_owner',0,FALSE,'Execute BCP exercise')
ON CONFLICT (pack_code, workflow_code) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Migration 098: Org pack template tables created and seeded (3 packs, roles, permissions, role-permissions, workflows)';
END $$;
