-- ============================================
-- Tenant Migration 140: GRC Entity RACI & Ownership
-- Enforces that controls, risks, and evidence
-- are ALL mapped to: user profiles, teams,
-- departments, sectors — with RACI lookup.
-- ============================================

-- ═══════════════════════════════════════════════
-- A. RISK OWNERSHIP (mirrors control_owners pattern)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_owners (
  owner_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id         VARCHAR(100) NOT NULL,
  user_id         VARCHAR(64)  NOT NULL,
  ownership_type  VARCHAR(30)  NOT NULL DEFAULT 'primary'
    CHECK (ownership_type IN ('primary','secondary','delegate','escalation')),
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by     VARCHAR(64),
  valid_from      DATE,
  valid_to        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_owners_risk    ON risk_owners(risk_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_owners_user    ON risk_owners(user_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_owners_primary ON risk_owners(risk_id, is_primary)
  WHERE is_primary = TRUE AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_owner_active
  ON risk_owners(risk_id, user_id, ownership_type)
  WHERE deleted_at IS NULL;

-- secondary team FK on risks (primary already in 131)
ALTER TABLE risks ADD COLUMN IF NOT EXISTS secondary_owner_team_id UUID;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_dept_id           UUID;

CREATE INDEX IF NOT EXISTS idx_risks_sec_owner_team ON risks(secondary_owner_team_id) WHERE secondary_owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_owner_dept     ON risks(owner_dept_id)            WHERE owner_dept_id IS NOT NULL;


-- ═══════════════════════════════════════════════
-- B. EVIDENCE OWNERSHIP
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_owners (
  owner_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id     UUID         NOT NULL,
  user_id         VARCHAR(64)  NOT NULL,
  ownership_type  VARCHAR(30)  NOT NULL DEFAULT 'collector'
    CHECK (ownership_type IN ('collector','reviewer','approver','custodian','delegate')),
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by     VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_owners_evidence ON evidence_owners(evidence_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_owners_user     ON evidence_owners(user_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_owners_primary  ON evidence_owners(evidence_id, is_primary)
  WHERE is_primary = TRUE AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_owner_active
  ON evidence_owners(evidence_id, user_id, ownership_type)
  WHERE deleted_at IS NULL;

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS owner_team_id           UUID;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS secondary_owner_team_id UUID;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS owner_dept_id           UUID;

CREATE INDEX IF NOT EXISTS idx_evidence_owner_team     ON evidence(owner_team_id)           WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_sec_owner_team ON evidence(secondary_owner_team_id) WHERE secondary_owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_owner_dept     ON evidence(owner_dept_id)            WHERE owner_dept_id IS NOT NULL;

-- Also add dept to controls (teams already linked via 092)
ALTER TABLE controls ADD COLUMN IF NOT EXISTS owner_dept_id UUID;
CREATE INDEX IF NOT EXISTS idx_controls_owner_dept ON controls(owner_dept_id) WHERE owner_dept_id IS NOT NULL;


-- ═══════════════════════════════════════════════
-- C. RACI LOOKUP — GRC-wide (per entity type)
-- Enforced RACI assignment per team per domain
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS grc_raci_assignments (
  assignment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(30)  NOT NULL
    CHECK (entity_type IN ('control','risk','evidence','incident','policy','audit','vendor','bcp')),
  entity_id       VARCHAR(100) NOT NULL,
  team_id         UUID,
  dept_id         UUID,
  user_id         VARCHAR(64),
  raci_role       VARCHAR(20)  NOT NULL
    CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  assignment_source VARCHAR(30) DEFAULT 'manual'
    CHECK (assignment_source IN ('manual','auto_provision','inherited','escalation')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from  DATE DEFAULT CURRENT_DATE,
  effective_to    DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_grc_raci_entity   ON grc_raci_assignments(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grc_raci_team     ON grc_raci_assignments(team_id)                WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grc_raci_dept     ON grc_raci_assignments(dept_id)                WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grc_raci_user     ON grc_raci_assignments(user_id)                WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grc_raci_role     ON grc_raci_assignments(raci_role)              WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grc_raci_active   ON grc_raci_assignments(entity_type, is_active) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_grc_raci_no_duplicate
  ON grc_raci_assignments(entity_type, entity_id, COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
     COALESCE(user_id, ''), raci_role)
  WHERE deleted_at IS NULL AND is_active = TRUE;


-- ═══════════════════════════════════════════════
-- D. RISK TEAM DISTRIBUTION (mirrors control_team_distribution)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_team_distribution (
  distribution_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code       VARCHAR(50) NOT NULL,
  risk_domain     VARCHAR(100) NOT NULL,
  framework_refs  TEXT[]       DEFAULT '{}',
  raci_role       VARCHAR(20) NOT NULL DEFAULT 'responsible'
    CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_code, risk_domain, raci_role)
);

CREATE INDEX IF NOT EXISTS idx_rtd_team_code ON risk_team_distribution(team_code);
CREATE INDEX IF NOT EXISTS idx_rtd_domain    ON risk_team_distribution(risk_domain);

INSERT INTO risk_team_distribution (team_code, risk_domain, framework_refs, raci_role) VALUES
  ('ERM',           'risk_identification',        ARRAY['ISO31000-6.4','NIST-CSF.ID.RA'],       'responsible'),
  ('ERM',           'risk_assessment',             ARRAY['ISO31000-6.4.2','COSO-ERM'],            'responsible'),
  ('ERM',           'risk_treatment',              ARRAY['ISO31000-6.5','NIST-CSF.RS'],            'responsible'),
  ('ERM',           'risk_monitoring',             ARRAY['ISO31000-6.6','NIST-CSF.DE'],            'responsible'),
  ('ERM',           'risk_appetite',               ARRAY['ISO31000-6.3','COSO-ERM'],               'responsible'),
  ('ERM',           'emerging_risks',              ARRAY['ISO31000','COSO-ERM'],                   'responsible'),
  ('ERM',           'kri_management',              ARRAY['ISO31000-6.6','NIST-CSF.DE.CM'],         'responsible'),
  ('ERM',           'loss_events',                 ARRAY['ISO31000','COSO-ERM'],                   'responsible'),
  ('EXEC_STRATEGY', 'risk_appetite',               ARRAY['ISO31000-6.3','COSO-ERM'],               'accountable'),
  ('EXEC_STRATEGY', 'risk_oversight',              ARRAY['ISO31000','COSO-ERM'],                   'accountable'),
  ('EXEC_STRATEGY', 'emerging_risks',              ARRAY['ISO31000','COSO-ERM'],                   'informed'),
  ('CYBER_GOV',     'cyber_risk_assessment',       ARRAY['NCA-ECC-2','ISO27001-A12'],              'responsible'),
  ('CYBER_GOV',     'threat_risk_management',      ARRAY['NCA-ECC-2.6','NIST-CSF.ID.RA'],         'responsible'),
  ('SOC_OPS',       'threat_risk_monitoring',      ARRAY['NIST-CSF.DE','NCA-ECC-2.6'],             'responsible'),
  ('SOC_OPS',       'incident_risk_impact',        ARRAY['ISO27001-A16','NCA-ECC-2.7'],            'responsible'),
  ('PRIVACY',       'data_privacy_risk',           ARRAY['PDPL-Art29','ISO27701-7.4'],              'responsible'),
  ('PRIVACY',       'pdpl_violation_risk',         ARRAY['PDPL','ISO27701'],                        'responsible'),
  ('BCM_DR',        'continuity_risk',             ARRAY['ISO22301-8','NCA-ECC-3.1'],               'responsible'),
  ('BCM_DR',        'disaster_risk',               ARRAY['ISO22301-8.5','NIST-CSF.RC'],             'responsible'),
  ('VENDOR_RISK',   'third_party_risk',            ARRAY['ISO27001-A15','NCA-ECC-3.3'],             'responsible'),
  ('VENDOR_RISK',   'concentration_risk',          ARRAY['ISO27001-A15','NCA-ECC-3.3'],             'responsible'),
  ('FINANCE',       'financial_risk',              ARRAY['COSO-IC','SOX'],                          'responsible'),
  ('FINANCE',       'fraud_risk',                  ARRAY['COSO-IC','ISO37001'],                     'responsible'),
  ('AUDIT',         'audit_risk_assessment',       ARRAY['IIA-IPPF-2010','ISO27001-A18'],           'responsible'),
  ('AUDIT',         'residual_risk_validation',    ARRAY['IIA-IPPF-2400','NIST-CSF'],               'responsible'),
  ('DATA_GOV',      'data_classification_risk',    ARRAY['ISO27001-A8.2','PDPL-Art9'],              'responsible'),
  ('CLOUD_INFRA',   'cloud_infrastructure_risk',   ARRAY['ISO27001-A12','CSA-CCM'],                 'responsible'),
  ('APP_ENG',       'application_security_risk',   ARRAY['ISO27001-A14','OWASP'],                   'responsible'),
  ('HR_GOV',        'insider_threat_risk',         ARRAY['ISO27001-A7','NCA-ECC-1.3'],              'responsible'),
  ('QUALITY',       'quality_assurance_risk',      ARRAY['ISO9001','ISO27001-A10'],                  'responsible')
ON CONFLICT (team_code, risk_domain, raci_role) DO NOTHING;


-- ═══════════════════════════════════════════════
-- E. EVIDENCE TEAM DISTRIBUTION
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_team_distribution (
  distribution_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code       VARCHAR(50)  NOT NULL,
  evidence_domain VARCHAR(100) NOT NULL,
  framework_refs  TEXT[]       DEFAULT '{}',
  raci_role       VARCHAR(20)  NOT NULL DEFAULT 'responsible'
    CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_code, evidence_domain, raci_role)
);

CREATE INDEX IF NOT EXISTS idx_etd_team_code ON evidence_team_distribution(team_code);
CREATE INDEX IF NOT EXISTS idx_etd_domain    ON evidence_team_distribution(evidence_domain);

INSERT INTO evidence_team_distribution (team_code, evidence_domain, framework_refs, raci_role) VALUES
  ('CYBER_GOV',     'security_policy_evidence',         ARRAY['ISO27001-A5.1','NCA-ECC-1.1'],    'responsible'),
  ('CYBER_GOV',     'access_control_evidence',          ARRAY['ISO27001-A9','NCA-ECC-2.1'],      'responsible'),
  ('CYBER_GOV',     'cryptography_evidence',            ARRAY['ISO27001-A10','NCA-ECC-2.3'],     'responsible'),
  ('SOC_OPS',       'monitoring_logging_evidence',      ARRAY['ISO27001-A12.4','NCA-ECC-2.6'],   'responsible'),
  ('SOC_OPS',       'vulnerability_scan_evidence',      ARRAY['NIST-CSF.ID.RA-1','NCA-ECC-2.5'],'responsible'),
  ('SOC_OPS',       'incident_response_evidence',       ARRAY['ISO27001-A16','NCA-ECC-2.7'],     'responsible'),
  ('IAM_GOV',       'identity_management_evidence',     ARRAY['ISO27001-A9.2','NIST-CSF.PR.AC'], 'responsible'),
  ('IAM_GOV',       'access_review_evidence',           ARRAY['ISO27001-A9.2.5','NCA-ECC-2.1'],  'responsible'),
  ('DATA_GOV',      'data_classification_evidence',     ARRAY['ISO27001-A8.2','PDPL-Art9'],       'responsible'),
  ('DATA_GOV',      'asset_inventory_evidence',         ARRAY['ISO27001-A8.1','NCA-ECC-2.2'],     'responsible'),
  ('PRIVACY',       'privacy_impact_evidence',          ARRAY['PDPL-Art29','ISO27701-7.4'],        'responsible'),
  ('PRIVACY',       'consent_records_evidence',         ARRAY['PDPL-Art10','ISO27701-7.2'],        'responsible'),
  ('PRIVACY',       'data_breach_notification_evidence', ARRAY['PDPL-Art24','NCA-ECC-2.7'],       'responsible'),
  ('AUDIT',         'audit_report_evidence',            ARRAY['IIA-IPPF-2400','ISO27001-A18.2'],   'responsible'),
  ('AUDIT',         'control_test_evidence',            ARRAY['IIA-IPPF-2000','SOC2-CC4'],         'responsible'),
  ('BCM_DR',        'bcp_plan_evidence',                ARRAY['ISO22301-8.4','ISO27001-A17.1'],    'responsible'),
  ('BCM_DR',        'dr_test_evidence',                 ARRAY['ISO22301-8.5','NCA-ECC-3.1'],       'responsible'),
  ('CLOUD_INFRA',   'cloud_config_evidence',            ARRAY['ISO27001-A12','CSA-CCM'],            'responsible'),
  ('CLOUD_INFRA',   'patch_management_evidence',        ARRAY['NCA-ECC-2.5','NIST-SP800-40'],      'responsible'),
  ('APP_ENG',       'sdlc_evidence',                    ARRAY['ISO27001-A14','NIST-SP800-218'],     'responsible'),
  ('APP_ENG',       'change_management_evidence',       ARRAY['ISO27001-A12.1','ITIL-SM'],          'responsible'),
  ('VENDOR_RISK',   'vendor_assessment_evidence',       ARRAY['ISO27001-A15.1','NCA-ECC-3.3'],     'responsible'),
  ('VENDOR_RISK',   'contract_security_evidence',       ARRAY['ISO27001-A15.1.2','PDPL-Art28'],    'responsible'),
  ('HR_GOV',        'training_records_evidence',        ARRAY['ISO27001-A7.2.2','NCA-ECC-1.4'],    'responsible'),
  ('HR_GOV',        'background_check_evidence',        ARRAY['ISO27001-A7.1','NCA-ECC-1.3'],      'responsible'),
  ('FINANCE',       'financial_controls_evidence',      ARRAY['COSO-IC','SOX-302','SOX-404'],       'responsible'),
  ('QUALITY',       'quality_management_evidence',      ARRAY['ISO9001-8','ISO27001-A10'],           'responsible'),
  ('EXEC_STRATEGY', 'governance_approval_evidence',     ARRAY['ISO27001-A5.1','NCA-ECC-1'],         'accountable'),
  ('ERM',           'risk_assessment_evidence',         ARRAY['ISO31000-6.4','COSO-ERM'],            'responsible'),
  ('ERM',           'risk_treatment_evidence',          ARRAY['ISO31000-6.5','NIST-CSF.RS'],         'responsible')
ON CONFLICT (team_code, evidence_domain, raci_role) DO NOTHING;


-- ═══════════════════════════════════════════════
-- F. EVIDENCE SECTOR MAPPING
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_sector_mapping (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_type_code VARCHAR(50)  NOT NULL,
  sector_code        VARCHAR(50)  NOT NULL,
  applicability      VARCHAR(50)  DEFAULT 'recommended'
    CHECK (applicability IN ('mandatory','recommended','optional')),
  sector_priority    VARCHAR(20)  DEFAULT 'medium',
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evidence_type_code, sector_code)
);

CREATE INDEX IF NOT EXISTS idx_esm_evidence_type ON evidence_sector_mapping(evidence_type_code);
CREATE INDEX IF NOT EXISTS idx_esm_sector        ON evidence_sector_mapping(sector_code);

INSERT INTO evidence_sector_mapping (evidence_type_code, sector_code, applicability, sector_priority) VALUES
  ('POLICY',          'K', 'mandatory', 'critical'),
  ('POLICY',          'O', 'mandatory', 'critical'),
  ('POLICY',          'Q', 'mandatory', 'high'),
  ('POLICY',          'J', 'mandatory', 'high'),
  ('POLICY',          'D', 'mandatory', 'high'),
  ('AUDIT_REPORT',    'K', 'mandatory', 'critical'),
  ('AUDIT_REPORT',    'O', 'mandatory', 'critical'),
  ('PENTEST',         'K', 'mandatory', 'critical'),
  ('PENTEST',         'J', 'mandatory', 'critical'),
  ('PENTEST',         'O', 'mandatory', 'high'),
  ('RISK_ASSESSMENT', 'K', 'mandatory', 'critical'),
  ('RISK_ASSESSMENT', 'D', 'mandatory', 'critical'),
  ('RISK_ASSESSMENT', 'Q', 'mandatory', 'high'),
  ('CERTIFICATE',     'K', 'mandatory', 'high'),
  ('CERTIFICATE',     'O', 'mandatory', 'high'),
  ('ATTESTATION',     'K', 'mandatory', 'critical'),
  ('ATTESTATION',     'O', 'mandatory', 'high'),
  ('SCAN_REPORT',     'K', 'mandatory', 'critical'),
  ('SCAN_REPORT',     'J', 'mandatory', 'critical'),
  ('TRAINING',        'K', 'mandatory', 'high'),
  ('TRAINING',        'O', 'mandatory', 'high'),
  ('TRAINING',        'Q', 'mandatory', 'high'),
  ('CONTRACT',        'K', 'mandatory', 'high'),
  ('LOG',             'K', 'mandatory', 'high'),
  ('LOG',             'J', 'mandatory', 'high'),
  ('CONFIG',          'J', 'mandatory', 'high'),
  ('CONFIG',          'D', 'mandatory', 'high'),
  ('SCREENSHOT',      'J', 'recommended', 'medium'),
  ('INVOICE',         'K', 'mandatory', 'high')
ON CONFLICT (evidence_type_code, sector_code) DO NOTHING;


-- ═══════════════════════════════════════════════
-- G. EVIDENCE ACTIONS (what actions needed per evidence)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_actions (
  action_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id     UUID         NOT NULL,
  action_type     VARCHAR(50)  NOT NULL
    CHECK (action_type IN ('collect','review','approve','reject','renew','escalate','archive','remediate')),
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  assigned_to     VARCHAR(64),
  assigned_team   VARCHAR(50),
  assigned_dept   UUID,
  due_date        DATE,
  priority        VARCHAR(20)  DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  status          VARCHAR(30)  DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','cancelled','overdue','escalated')),
  completed_at    TIMESTAMPTZ,
  completed_by    VARCHAR(64),
  outcome_notes   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_actions_evidence  ON evidence_actions(evidence_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_actions_assigned  ON evidence_actions(assigned_to)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_actions_team      ON evidence_actions(assigned_team)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_actions_status    ON evidence_actions(status)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_actions_due       ON evidence_actions(due_date)       WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_actions_priority  ON evidence_actions(priority)       WHERE deleted_at IS NULL AND status != 'completed';


-- ═══════════════════════════════════════════════
-- H. RISK SECTOR MAPPING (tenant-level, supplements master-level sector_risks)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_sector_applicability (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id         VARCHAR(100) NOT NULL,
  sector_code     VARCHAR(50)  NOT NULL,
  applicability   VARCHAR(50)  DEFAULT 'applicable'
    CHECK (applicability IN ('applicable','not_applicable','conditional')),
  sector_impact   VARCHAR(20),
  regulatory_req  BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(risk_id, sector_code)
);

CREATE INDEX IF NOT EXISTS idx_rsa_risk   ON risk_sector_applicability(risk_id);
CREATE INDEX IF NOT EXISTS idx_rsa_sector ON risk_sector_applicability(sector_code);


-- ═══════════════════════════════════════════════
-- I. CROSS-MODULE OWNERSHIP MATRIX VIEW
-- ═══════════════════════════════════════════════

CREATE OR REPLACE VIEW grc_ownership_matrix AS
SELECT
  'control' AS entity_type,
  co.control_id AS entity_id,
  co.user_id,
  co.ownership_type,
  co.is_primary,
  c.owner_team_id AS primary_team_id,
  c.secondary_owner_team_id AS secondary_team_id,
  c.owner_dept_id AS dept_id,
  t.team_code,
  t.name_en AS team_name,
  d.name_en AS dept_name,
  gra.raci_role
FROM control_owners co
LEFT JOIN controls c ON c.control_id = co.control_id
LEFT JOIN teams t ON t.team_id = c.owner_team_id
LEFT JOIN departments d ON d.dept_id = c.owner_dept_id
LEFT JOIN grc_raci_assignments gra
  ON gra.entity_type = 'control' AND gra.entity_id = co.control_id AND gra.user_id = co.user_id
  AND gra.is_active = TRUE AND gra.deleted_at IS NULL
WHERE co.deleted_at IS NULL

UNION ALL

SELECT
  'risk',
  ro.risk_id,
  ro.user_id,
  ro.ownership_type,
  ro.is_primary,
  r.owner_team_id,
  r.secondary_owner_team_id,
  r.owner_dept_id,
  t.team_code,
  t.name_en,
  d.name_en,
  gra.raci_role
FROM risk_owners ro
LEFT JOIN risks r ON r.risk_id = ro.risk_id
LEFT JOIN teams t ON t.team_id = r.owner_team_id
LEFT JOIN departments d ON d.dept_id = r.owner_dept_id
LEFT JOIN grc_raci_assignments gra
  ON gra.entity_type = 'risk' AND gra.entity_id = ro.risk_id AND gra.user_id = ro.user_id
  AND gra.is_active = TRUE AND gra.deleted_at IS NULL
WHERE ro.deleted_at IS NULL

UNION ALL

SELECT
  'evidence',
  eo.evidence_id::text,
  eo.user_id,
  eo.ownership_type,
  eo.is_primary,
  e.owner_team_id,
  e.secondary_owner_team_id,
  e.owner_dept_id,
  t.team_code,
  t.name_en,
  d.name_en,
  gra.raci_role
FROM evidence_owners eo
LEFT JOIN evidence e ON e.evidence_id = eo.evidence_id
LEFT JOIN teams t ON t.team_id = e.owner_team_id
LEFT JOIN departments d ON d.dept_id = e.owner_dept_id
LEFT JOIN grc_raci_assignments gra
  ON gra.entity_type = 'evidence' AND gra.entity_id = eo.evidence_id::text AND gra.user_id = eo.user_id
  AND gra.is_active = TRUE AND gra.deleted_at IS NULL
WHERE eo.deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- J. RACI ENFORCEMENT VIEW
-- Shows entities WITHOUT proper RACI coverage
-- ═══════════════════════════════════════════════

CREATE OR REPLACE VIEW grc_raci_gaps AS

SELECT 'control' AS entity_type, c.control_id AS entity_id, c.title AS entity_name,
  CASE WHEN co.owner_id IS NULL THEN FALSE ELSE TRUE END AS has_user_owner,
  CASE WHEN c.owner_team_id IS NULL THEN FALSE ELSE TRUE END AS has_team_owner,
  CASE WHEN c.owner_dept_id IS NULL THEN FALSE ELSE TRUE END AS has_dept_owner,
  CASE WHEN gra_r.assignment_id IS NULL THEN FALSE ELSE TRUE END AS has_responsible,
  CASE WHEN gra_a.assignment_id IS NULL THEN FALSE ELSE TRUE END AS has_accountable
FROM controls c
LEFT JOIN control_owners co ON co.control_id = c.control_id AND co.is_primary = TRUE AND co.deleted_at IS NULL
LEFT JOIN grc_raci_assignments gra_r ON gra_r.entity_type = 'control' AND gra_r.entity_id = c.control_id
  AND gra_r.raci_role = 'responsible' AND gra_r.is_active = TRUE AND gra_r.deleted_at IS NULL
LEFT JOIN grc_raci_assignments gra_a ON gra_a.entity_type = 'control' AND gra_a.entity_id = c.control_id
  AND gra_a.raci_role = 'accountable' AND gra_a.is_active = TRUE AND gra_a.deleted_at IS NULL
WHERE c.deleted_at IS NULL

UNION ALL

SELECT 'risk', r.risk_id, r.title,
  CASE WHEN ro.owner_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN r.owner_team_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN r.owner_dept_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN gra_r.assignment_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN gra_a.assignment_id IS NULL THEN FALSE ELSE TRUE END
FROM risks r
LEFT JOIN risk_owners ro ON ro.risk_id = r.risk_id AND ro.is_primary = TRUE AND ro.deleted_at IS NULL
LEFT JOIN grc_raci_assignments gra_r ON gra_r.entity_type = 'risk' AND gra_r.entity_id = r.risk_id
  AND gra_r.raci_role = 'responsible' AND gra_r.is_active = TRUE AND gra_r.deleted_at IS NULL
LEFT JOIN grc_raci_assignments gra_a ON gra_a.entity_type = 'risk' AND gra_a.entity_id = r.risk_id
  AND gra_a.raci_role = 'accountable' AND gra_a.is_active = TRUE AND gra_a.deleted_at IS NULL
WHERE r.deleted_at IS NULL

UNION ALL

SELECT 'evidence', e.evidence_id::text, e.title,
  CASE WHEN eo.owner_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN e.owner_team_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN e.owner_dept_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN gra_r.assignment_id IS NULL THEN FALSE ELSE TRUE END,
  CASE WHEN gra_a.assignment_id IS NULL THEN FALSE ELSE TRUE END
FROM evidence e
LEFT JOIN evidence_owners eo ON eo.evidence_id = e.evidence_id AND eo.is_primary = TRUE AND eo.deleted_at IS NULL
LEFT JOIN grc_raci_assignments gra_r ON gra_r.entity_type = 'evidence' AND gra_r.entity_id = e.evidence_id::text
  AND gra_r.raci_role = 'responsible' AND gra_r.is_active = TRUE AND gra_r.deleted_at IS NULL
LEFT JOIN grc_raci_assignments gra_a ON gra_a.entity_type = 'evidence' AND gra_a.entity_id = e.evidence_id::text
  AND gra_a.raci_role = 'accountable' AND gra_a.is_active = TRUE AND gra_a.deleted_at IS NULL
WHERE e.deleted_at IS NULL;


COMMENT ON TABLE risk_owners              IS 'User-level risk ownership assignments (mirrors control_owners)';
COMMENT ON TABLE evidence_owners          IS 'User-level evidence ownership (collector, reviewer, approver, custodian)';
COMMENT ON TABLE grc_raci_assignments     IS 'Unified RACI matrix for all GRC entities — enforced lookup';
COMMENT ON TABLE risk_team_distribution   IS 'Default team RACI for risk domains (mirrors control_team_distribution)';
COMMENT ON TABLE evidence_team_distribution IS 'Default team RACI for evidence domains';
COMMENT ON TABLE evidence_sector_mapping  IS 'Evidence type applicability per ISIC4 sector';
COMMENT ON TABLE evidence_actions         IS 'Actions required per evidence item (collect, review, approve, etc.)';
COMMENT ON TABLE risk_sector_applicability IS 'Tenant-level risk-to-sector applicability mapping';
COMMENT ON VIEW  grc_ownership_matrix     IS 'Cross-module view: who owns what (user+team+dept) across controls/risks/evidence';
COMMENT ON VIEW  grc_raci_gaps            IS 'Audit view: entities missing proper RACI assignments';
