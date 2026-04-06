-- ============================================================
-- Migration 117: Foundation Module P0 — Regulatory Fields,
-- SoD Conflict Detection, PDPL Consent, Data Residency
-- ============================================================

-- 1. Organizations — KSA Identity Fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cr_number VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cr_700_number VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS vat_number VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS isic_code VARCHAR(10);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_structure VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS fiscal_year_end VARCHAR(5) DEFAULT '12-31';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS regulator_ids JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS data_classification VARCHAR(30) DEFAULT 'internal';

CREATE INDEX IF NOT EXISTS idx_organizations_cr ON organizations(cr_number) WHERE cr_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_vat ON organizations(vat_number) WHERE vat_number IS NOT NULL;

-- 2. Business Units — Regulatory Scope
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS nca_scope BOOLEAN DEFAULT FALSE;
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS sama_scope BOOLEAN DEFAULT FALSE;
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS cma_scope BOOLEAN DEFAULT FALSE;
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS sdaia_scope BOOLEAN DEFAULT FALSE;
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS risk_tier VARCHAR(20) DEFAULT 'medium';
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS data_classification VARCHAR(30) DEFAULT 'internal';

CREATE INDEX IF NOT EXISTS idx_bu_nca_scope ON business_units(nca_scope) WHERE nca_scope = TRUE;

-- 3. Departments — NCA Function Mapping
ALTER TABLE departments ADD COLUMN IF NOT EXISTS nca_function_code VARCHAR(30);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_critical_function BOOLEAN DEFAULT FALSE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS regulatory_reporting BOOLEAN DEFAULT FALSE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS data_classification VARCHAR(30) DEFAULT 'internal';

CREATE INDEX IF NOT EXISTS idx_departments_nca_fn ON departments(nca_function_code) WHERE nca_function_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_critical ON departments(is_critical_function) WHERE is_critical_function = TRUE;

-- 4. Locations — Data Residency
ALTER TABLE locations ADD COLUMN IF NOT EXISTS data_residency_zone VARCHAR(30) DEFAULT 'ksa';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS pdpl_applies BOOLEAN DEFAULT TRUE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS cross_border_transfer BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_locations_residency ON locations(data_residency_zone);

-- 5. Roles — SoD + NCA Alignment
ALTER TABLE roles ADD COLUMN IF NOT EXISTS nca_role_alignment VARCHAR(100);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS regulatory_mandated BOOLEAN DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS sod_conflict_roles JSONB DEFAULT '[]';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS max_combined_risk VARCHAR(20) DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_roles_nca_alignment ON roles(nca_role_alignment) WHERE nca_role_alignment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roles_reg_mandated ON roles(regulatory_mandated) WHERE regulatory_mandated = TRUE;

-- 6. Teams — NCA Mandated Flag
ALTER TABLE teams ADD COLUMN IF NOT EXISTS nca_mandated BOOLEAN DEFAULT FALSE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS committee_type VARCHAR(50);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS charter_id UUID;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS quorum_required INT;

CREATE INDEX IF NOT EXISTS idx_teams_nca_mandated ON teams(nca_mandated) WHERE nca_mandated = TRUE;

-- 7. SoD Conflict Log
CREATE TABLE IF NOT EXISTS sod_conflict_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  role_a UUID NOT NULL,
  role_b UUID NOT NULL,
  conflict_type VARCHAR(30) NOT NULL DEFAULT 'role_pair',
  risk_level VARCHAR(20) NOT NULL DEFAULT 'high',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(64),
  resolution_notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','mitigated','accepted','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sod_conflict_user ON sod_conflict_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sod_conflict_status ON sod_conflict_log(status) WHERE status = 'open';

-- 8. PDPL Consent Records
CREATE TABLE IF NOT EXISTS pdpl_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  consent_type VARCHAR(50) NOT NULL,
  consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,
  legal_basis VARCHAR(50) DEFAULT 'consent',
  data_categories JSONB DEFAULT '[]',
  retention_period_days INT DEFAULT 365,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdpl_consent_user ON pdpl_consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pdpl_consent_type ON pdpl_consent_records(consent_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdpl_consent_unique ON pdpl_consent_records(user_id, consent_type, consent_version);
