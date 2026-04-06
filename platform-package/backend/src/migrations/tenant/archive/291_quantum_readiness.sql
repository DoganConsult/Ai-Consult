-- ============================================
-- Tenant Migration 291
-- Phase 8 / Step 8.1: Quantum Readiness &
--   Post-Quantum Cryptography (PQC)
-- CNSA 2.0, NIST FIPS 203/204/205,
--   Harvest-Now-Decrypt-Later (HNDL) Risk
-- ============================================

-- -------------------------------------------------
-- 1. cryptographic_inventory
--    Inventories all cryptographic assets across
--    the platform, tracks quantum vulnerability
--    and migration status toward PQC algorithms.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS cryptographic_inventory (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asset identification
  asset_name                  TEXT NOT NULL,
  asset_type                  TEXT CHECK (asset_type IN (
    'certificate', 'key', 'algorithm', 'protocol', 'library'
  )),

  -- Cryptographic details
  algorithm                   TEXT NOT NULL,
  key_length                  INT,
  protocol_version            TEXT,

  -- Location & ownership
  location                    TEXT,
  system_name                 TEXT,
  owner                       VARCHAR(64),

  -- Quantum risk assessment
  is_quantum_vulnerable       BOOLEAN DEFAULT FALSE,
  hndl_risk_level             TEXT CHECK (hndl_risk_level IN (
    'none', 'low', 'medium', 'high', 'critical'
  )),
  data_sensitivity            TEXT CHECK (data_sensitivity IN (
    'public', 'internal', 'confidential', 'restricted'
  )),

  -- Lifecycle
  expiry_date                 DATE,
  renewal_required            BOOLEAN DEFAULT FALSE,

  -- Migration tracking
  replacement_algorithm       TEXT,
  migration_status            TEXT DEFAULT 'not_started' CHECK (migration_status IN (
    'not_started', 'assessed', 'planned', 'testing', 'migrated', 'verified'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_type        ON cryptographic_inventory(asset_type);
CREATE INDEX IF NOT EXISTS idx_ci_vulnerable  ON cryptographic_inventory(is_quantum_vulnerable) WHERE is_quantum_vulnerable = TRUE;
CREATE INDEX IF NOT EXISTS idx_ci_hndl        ON cryptographic_inventory(hndl_risk_level);
CREATE INDEX IF NOT EXISTS idx_ci_migration   ON cryptographic_inventory(migration_status);
CREATE INDEX IF NOT EXISTS idx_ci_expiry      ON cryptographic_inventory(expiry_date) WHERE expiry_date IS NOT NULL;

-- -------------------------------------------------
-- 2. quantum_migration_plans
--    Tracks phased migration plans from classical
--    to post-quantum cryptographic algorithms.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS quantum_migration_plans (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code                   VARCHAR(64) UNIQUE NOT NULL,
  name_en                     TEXT NOT NULL,
  name_ar                     TEXT,

  -- Phase tracking
  phase                       TEXT NOT NULL CHECK (phase IN (
    'inventory', 'assessment', 'planning', 'testing', 'migration', 'verification'
  )),

  -- Scope & priority
  target_assets               UUID[] DEFAULT '{}',
  priority                    TEXT CHECK (priority IN (
    'low', 'medium', 'high', 'critical'
  )),
  target_algorithm            TEXT,
  target_completion           DATE,

  -- Planning details
  milestones                  JSONB DEFAULT '[]',
  risks                       JSONB DEFAULT '[]',

  -- Budget
  budget_allocated            NUMERIC(12,2),
  budget_spent                NUMERIC(12,2) DEFAULT 0,

  -- Responsibility & status
  responsible                 VARCHAR(64),
  status                      TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'in_progress', 'completed', 'on_hold'
  )),
  started_at                  TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qmp_phase      ON quantum_migration_plans(phase);
CREATE INDEX IF NOT EXISTS idx_qmp_priority   ON quantum_migration_plans(priority);
CREATE INDEX IF NOT EXISTS idx_qmp_status     ON quantum_migration_plans(status);

-- -------------------------------------------------
-- 3. approved_pqc_algorithms
--    Reference table of NIST-approved post-quantum
--    cryptographic algorithms with CNSA 2.0 flags.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS approved_pqc_algorithms (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_code              VARCHAR(64) UNIQUE NOT NULL,
  algorithm_name              TEXT NOT NULL,
  algorithm_type              TEXT CHECK (algorithm_type IN (
    'kem', 'signature', 'hash'
  )),

  -- Standards reference
  standard_ref                TEXT NOT NULL,  -- NIST FIPS 203/204/205

  -- Security parameters
  security_level              INT CHECK (security_level BETWEEN 1 AND 5),
  cnsa_approved               BOOLEAN DEFAULT FALSE,

  -- Key / signature sizes
  key_size_bits               INT,
  signature_size_bytes        INT,
  ciphertext_size_bytes       INT,

  -- Notes
  performance_notes           TEXT,
  is_recommended              BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pqca_type      ON approved_pqc_algorithms(algorithm_type);
CREATE INDEX IF NOT EXISTS idx_pqca_cnsa      ON approved_pqc_algorithms(cnsa_approved) WHERE cnsa_approved = TRUE;

-- Seed CNSA 2.0 approved algorithms
INSERT INTO approved_pqc_algorithms (algorithm_code, algorithm_name, algorithm_type, standard_ref, security_level, cnsa_approved, is_recommended)
VALUES
  ('ML-KEM-1024',  'ML-KEM-1024',  'kem',       'NIST FIPS 203', 5, TRUE,  TRUE),
  ('ML-DSA-87',    'ML-DSA-87',    'signature', 'NIST FIPS 204', 5, TRUE,  TRUE),
  ('SLH-DSA-256s', 'SLH-DSA-256s', 'signature', 'NIST FIPS 205', 5, TRUE,  TRUE),
  ('ML-KEM-768',   'ML-KEM-768',   'kem',       'NIST FIPS 203', 3, FALSE, TRUE),
  ('ML-DSA-65',    'ML-DSA-65',    'signature', 'NIST FIPS 204', 3, FALSE, TRUE)
ON CONFLICT (algorithm_code) DO NOTHING;

-- -------------------------------------------------
-- 4. pqc_test_results
--    Records test outcomes for PQC migration,
--    including compatibility, performance, and
--    interoperability tests.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pqc_test_results (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id                     UUID REFERENCES quantum_migration_plans(id),
  asset_id                    UUID REFERENCES cryptographic_inventory(id),

  -- Test details
  test_type                   TEXT CHECK (test_type IN (
    'compatibility', 'performance', 'interoperability', 'regression'
  )),
  algorithm_tested            TEXT NOT NULL,
  test_date                   DATE NOT NULL,

  -- Results
  result                      TEXT CHECK (result IN (
    'pass', 'fail', 'partial', 'inconclusive'
  )),
  performance_impact_pct      NUMERIC(5,2),
  notes                       TEXT,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptr_plan       ON pqc_test_results(plan_id);
CREATE INDEX IF NOT EXISTS idx_ptr_asset      ON pqc_test_results(asset_id);
CREATE INDEX IF NOT EXISTS idx_ptr_result     ON pqc_test_results(result);
CREATE INDEX IF NOT EXISTS idx_ptr_date       ON pqc_test_results(test_date DESC);

-- -------------------------------------------------
-- 5. vendor_crypto_assessment
--    Evaluates vendor/product PQC readiness,
--    hybrid mode support, and remediation plans.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_crypto_assessment (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vendor & product
  vendor_name                 TEXT NOT NULL,
  product_name                TEXT NOT NULL,

  -- Current state
  current_algorithms          TEXT[] DEFAULT '{}',

  -- PQC readiness
  pqc_roadmap_available       BOOLEAN DEFAULT FALSE,
  pqc_target_date             DATE,
  hybrid_mode_supported       BOOLEAN DEFAULT FALSE,

  -- Assessment details
  assessment_date             DATE NOT NULL,
  assessed_by                 VARCHAR(64),
  risk_level                  TEXT CHECK (risk_level IN (
    'low', 'medium', 'high', 'critical'
  )),
  remediation_plan            TEXT,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vca_vendor     ON vendor_crypto_assessment(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vca_risk       ON vendor_crypto_assessment(risk_level);
CREATE INDEX IF NOT EXISTS idx_vca_pqc_ready  ON vendor_crypto_assessment(pqc_roadmap_available);
