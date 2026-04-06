-- Tenant Migration 092: Controls Team Ownership
-- Adds owner_team_id FK to controls table
-- Seeds control_team_distribution mapping for all 18 teams

ALTER TABLE controls ADD COLUMN IF NOT EXISTS owner_team_id           UUID REFERENCES teams(team_id) ON DELETE SET NULL;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS secondary_owner_team_id UUID REFERENCES teams(team_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_controls_owner_team     ON controls(owner_team_id)           WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_controls_sec_owner_team ON controls(secondary_owner_team_id) WHERE secondary_owner_team_id IS NOT NULL;

-- Control-to-team domain distribution (GRC-correct, not recommendation-based)
CREATE TABLE IF NOT EXISTS control_team_distribution (
  distribution_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code       VARCHAR(50) NOT NULL,
  control_domain  VARCHAR(100) NOT NULL,
  framework_refs  TEXT[]       DEFAULT '{}',
  raci_role       VARCHAR(20) NOT NULL DEFAULT 'responsible'
    CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_code, control_domain, raci_role)
);

CREATE INDEX IF NOT EXISTS idx_ctd_team_code     ON control_team_distribution(team_code);
CREATE INDEX IF NOT EXISTS idx_ctd_domain        ON control_team_distribution(control_domain);
CREATE INDEX IF NOT EXISTS idx_ctd_raci          ON control_team_distribution(raci_role);

INSERT INTO control_team_distribution (team_code, control_domain, framework_refs, raci_role) VALUES
  ('EXEC_STRATEGY', 'governance_policy_approval',      ARRAY['ISO27001-A5.1','NCA-ECC-1.1'],          'accountable'),
  ('EXEC_STRATEGY', 'strategic_risk_oversight',        ARRAY['COSO-ERM','ISO31000'],                   'accountable'),
  ('EXEC_STRATEGY', 'enterprise_compliance_oversight', ARRAY['NCA-ECC-1','ISO27001-A18'],              'accountable'),
  ('ERM',           'risk_identification',             ARRAY['ISO31000-6.4','NIST-CSF.ID.RA'],         'responsible'),
  ('ERM',           'risk_assessment_scoring',         ARRAY['ISO31000-6.4.2','NIST-CSF.ID.RA-1'],    'responsible'),
  ('ERM',           'risk_treatment_planning',         ARRAY['ISO31000-6.5','NIST-CSF.RS'],            'responsible'),
  ('ERM',           'risk_register_management',        ARRAY['ISO31000','COSO-ERM'],                   'responsible'),
  ('ERM',           'kri_monitoring',                  ARRAY['ISO31000-6.6','NIST-CSF.DE'],            'responsible'),
  ('ERM',           'risk_appetite_framework',         ARRAY['ISO31000-6.3','COSO-ERM'],               'responsible'),
  ('CYBER_GOV',     'access_control',                  ARRAY['ISO27001-A9','NCA-ECC-2.1'],             'responsible'),
  ('CYBER_GOV',     'cryptography_controls',           ARRAY['ISO27001-A10','NCA-ECC-2.3'],            'responsible'),
  ('CYBER_GOV',     'security_policy_management',      ARRAY['ISO27001-A5.1','NCA-ECC-1.1'],          'responsible'),
  ('CYBER_GOV',     'supplier_security_management',    ARRAY['ISO27001-A15','NCA-ECC-3.3'],            'responsible'),
  ('CYBER_GOV',     'information_security_compliance', ARRAY['ISO27001-A18','NCA-ECC-1.5'],            'responsible'),
  ('SOC_OPS',       'security_incident_management',    ARRAY['ISO27001-A16','NIST-CSF.RS','NCA-ECC-2.7'], 'responsible'),
  ('SOC_OPS',       'security_monitoring_logging',     ARRAY['ISO27001-A12.4','NCA-ECC-2.6'],          'responsible'),
  ('SOC_OPS',       'vulnerability_management',        ARRAY['NIST-CSF.ID.RA-1','NCA-ECC-2.5'],       'responsible'),
  ('SOC_OPS',       'threat_intelligence',             ARRAY['NIST-CSF.ID.TA','NCA-ECC-2.6.2'],       'responsible'),
  ('IAM_GOV',       'identity_lifecycle_management',   ARRAY['ISO27001-A9.2','NIST-CSF.PR.AC-1'],     'responsible'),
  ('IAM_GOV',       'privileged_access_management',    ARRAY['ISO27001-A9.4','NCA-ECC-2.1.3'],        'responsible'),
  ('IAM_GOV',       'access_review_certification',     ARRAY['ISO27001-A9.2.5','NCA-ECC-2.1.4'],      'responsible'),
  ('IAM_GOV',       'authentication_mfa_controls',     ARRAY['ISO27001-A9.3','NIST-CSF.PR.AC-7'],     'responsible'),
  ('DATA_GOV',      'data_classification',             ARRAY['ISO27001-A8.2','PDPL-Art9'],             'responsible'),
  ('DATA_GOV',      'asset_inventory_management',      ARRAY['ISO27001-A8.1','NCA-ECC-2.2'],          'responsible'),
  ('DATA_GOV',      'data_retention_disposal',         ARRAY['ISO27001-A8.3','PDPL-Art19'],            'responsible'),
  ('PRIVACY',       'privacy_notice_transparency',     ARRAY['PDPL-Art11','ISO27701-7.3'],             'responsible'),
  ('PRIVACY',       'consent_management',              ARRAY['PDPL-Art10','ISO27701-7.2'],             'responsible'),
  ('PRIVACY',       'data_subject_rights_handling',    ARRAY['PDPL-Art12-18','ISO27701-7.3.9'],        'responsible'),
  ('PRIVACY',       'pdpl_breach_notification',        ARRAY['PDPL-Art24','NCA-ECC-2.7'],              'responsible'),
  ('PRIVACY',       'privacy_impact_assessment',       ARRAY['PDPL-Art29','ISO27701-7.4'],             'responsible'),
  ('AUDIT',         'control_design_testing',          ARRAY['ISO27001-A18.2','SOC2-CC4'],             'responsible'),
  ('AUDIT',         'internal_audit_planning',         ARRAY['IIA-IPPF-2000','ISO27001-A18'],          'responsible'),
  ('AUDIT',         'audit_finding_management',        ARRAY['IIA-IPPF-2400','ISO27001-A18.2'],        'responsible'),
  ('AUDIT',         'continuous_monitoring',           ARRAY['IIA-IPPF-2060','NIST-CSF.DE.CM'],        'responsible'),
  ('BCM_DR',        'bcp_planning_maintenance',        ARRAY['ISO22301-8.4','ISO27001-A17.1'],         'responsible'),
  ('BCM_DR',        'disaster_recovery_testing',       ARRAY['ISO22301-8.5','NCA-ECC-3.1'],            'responsible'),
  ('BCM_DR',        'rto_rpo_management',              ARRAY['ISO22301-8.3','NIST-CSF.RC'],            'responsible'),
  ('CLOUD_INFRA',   'cloud_security_configuration',    ARRAY['ISO27001-A12','NCA-ECC-2.4','CSA-CCM'],  'responsible'),
  ('CLOUD_INFRA',   'patch_vulnerability_management',  ARRAY['NCA-ECC-2.5','NIST-SP800-40'],           'responsible'),
  ('CLOUD_INFRA',   'network_security_controls',       ARRAY['ISO27001-A13','NCA-ECC-2.4.3'],          'responsible'),
  ('APP_ENG',       'secure_development_lifecycle',    ARRAY['ISO27001-A14','NIST-SP800-218'],          'responsible'),
  ('APP_ENG',       'change_management_controls',      ARRAY['ISO27001-A12.1','ITIL-SM'],              'responsible'),
  ('APP_ENG',       'application_security_testing',    ARRAY['ISO27001-A14.2','OWASP-SAMM'],           'responsible'),
  ('ENT_ARCH',      'architecture_security_review',    ARRAY['ISO27001-A14.1','TOGAF','SABSA'],         'responsible'),
  ('ENT_ARCH',      'technology_risk_governance',      ARRAY['ISO27001-A6.1','COBIT-APO12'],            'responsible'),
  ('PMO',           'project_risk_controls',           ARRAY['ISO27001-A6.1.5','PMBOK'],               'responsible'),
  ('SVC_OPS',       'operational_incident_handling',   ARRAY['ISO27001-A16.1','ITIL-IM'],              'responsible'),
  ('SVC_OPS',       'service_continuity_controls',     ARRAY['ISO27001-A17','ITIL-SCONM'],             'responsible'),
  ('VENDOR_RISK',   'vendor_due_diligence',            ARRAY['ISO27001-A15.1','NCA-ECC-3.3.1'],        'responsible'),
  ('VENDOR_RISK',   'contract_security_requirements',  ARRAY['ISO27001-A15.1.2','PDPL-Art28'],         'responsible'),
  ('VENDOR_RISK',   'vendor_performance_monitoring',   ARRAY['ISO27001-A15.2','NCA-ECC-3.3.3'],        'responsible'),
  ('HR_GOV',        'security_awareness_training',     ARRAY['ISO27001-A7.2.2','NCA-ECC-1.4'],         'responsible'),
  ('HR_GOV',        'background_screening',            ARRAY['ISO27001-A7.1','NCA-ECC-1.3'],           'responsible'),
  ('HR_GOV',        'hr_offboarding_security',         ARRAY['ISO27001-A7.3','NCA-ECC-1.3.3'],         'responsible'),
  ('FINANCE',       'financial_reporting_controls',    ARRAY['COSO-IC','SOX-302','SOX-404'],            'responsible'),
  ('FINANCE',       'fraud_prevention_controls',       ARRAY['COSO-IC','ISO37001'],                     'responsible'),
  ('QUALITY',       'quality_management_system',       ARRAY['ISO9001-8','ISO27001-A10'],               'responsible'),
  ('QUALITY',       'document_control',                ARRAY['ISO9001-7.5','ISO27001-A5.1'],            'responsible')
ON CONFLICT (team_code, control_domain, raci_role) DO NOTHING;
