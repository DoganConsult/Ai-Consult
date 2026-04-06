-- ============================================
-- Tenant Migration 286
-- Phase 3 / Step 3.1: AI Supply Chain &
--   Model Provenance
-- EU AI Act Art. 11, 13, 15, 17, Annex IV
-- ISO 42001, SDAIA, NIST AI RMF
-- ============================================

-- -------------------------------------------------
-- 1. ai_model_provenance
--    Tracks origin, training, licensing,
--    environmental impact and integrity of each
--    AI model across the supply chain.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_model_provenance (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID NOT NULL REFERENCES ai_system_registry(id),

  -- Model identification
  model_name                  TEXT NOT NULL,
  model_version               VARCHAR(32),
  provider                    TEXT NOT NULL,
  model_type                  TEXT,
  architecture                TEXT,

  -- Training details
  training_framework          TEXT,
  training_data_summary       TEXT,
  parameters_count            BIGINT,

  -- Licensing
  license                     TEXT,
  license_url                 TEXT,

  -- SBOM (Software Bill of Materials) — EU AI Act Art. 11
  sbom_format                 TEXT CHECK (sbom_format IN ('SPDX-3.0', 'CycloneDX-1.6')),
  sbom_content                JSONB DEFAULT '{}',

  -- Integrity verification
  hash_algorithm              VARCHAR(32),
  model_hash                  TEXT,

  -- Data residency & sovereignty
  origin_country              VARCHAR(3),
  data_residency_country      VARCHAR(3),

  -- Bias & fairness — Art. 10
  bias_assessment_status      TEXT DEFAULT 'pending',
  fairness_metrics            JSONB DEFAULT '{}',

  -- Performance baseline
  performance_baseline        JSONB DEFAULT '{}',
  accuracy_threshold          NUMERIC(5,4),

  -- Retraining schedule
  last_retrained_at           TIMESTAMPTZ,
  retrain_schedule_days       INT,

  -- Open-source & fine-tuning lineage
  is_open_source              BOOLEAN DEFAULT FALSE,
  is_fine_tuned               BOOLEAN DEFAULT FALSE,
  base_model_ref              TEXT,
  fine_tuning_dataset_id      UUID,

  -- Environmental impact — Art. 15
  environmental_impact        JSONB DEFAULT '{}',
  energy_consumption_kwh      NUMERIC(10,2),

  -- Retention — Art. 18
  retention_expires_at        TIMESTAMPTZ DEFAULT (now() + INTERVAL '10 years'),

  -- Digital signature & integrity
  digital_signature           TEXT,
  signature_algorithm         VARCHAR(32),

  -- Metadata
  created_by                  VARCHAR(64),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amp_system     ON ai_model_provenance(system_id);
CREATE INDEX IF NOT EXISTS idx_amp_provider   ON ai_model_provenance(provider);
CREATE INDEX IF NOT EXISTS idx_amp_type       ON ai_model_provenance(model_type) WHERE model_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_amp_retention  ON ai_model_provenance(retention_expires_at);

-- -------------------------------------------------
-- 2. ai_data_lineage
--    Records dataset provenance, quality, PII
--    detection and cross-border transfer attributes.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_data_lineage (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id                   UUID NOT NULL REFERENCES ai_system_registry(id),

  -- Dataset identification
  dataset_name                TEXT NOT NULL,

  -- Source details
  source_type                 TEXT CHECK (source_type IN (
    'internal', 'external', 'public', 'synthetic', 'mixed'
  )),
  source_uri                  TEXT,
  data_format                 TEXT,
  record_count                BIGINT,

  -- Collection
  collection_method           TEXT,
  collection_date             DATE,

  -- Preprocessing & transformations
  preprocessing_steps         JSONB DEFAULT '[]',
  transformations             JSONB DEFAULT '[]',

  -- Quality metrics
  quality_score               NUMERIC(5,2),
  completeness_pct            NUMERIC(5,2),

  -- PII detection
  pii_detected                BOOLEAN DEFAULT FALSE,
  pii_categories              TEXT[],

  -- Data protection
  consent_basis               TEXT,
  retention_policy            TEXT,

  -- Cross-border transfers
  cross_border                BOOLEAN DEFAULT FALSE,
  destination_countries       TEXT[],
  adequacy_decision_ref       TEXT,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adl_system      ON ai_data_lineage(system_id);
CREATE INDEX IF NOT EXISTS idx_adl_source_type ON ai_data_lineage(source_type) WHERE source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_adl_pii         ON ai_data_lineage(pii_detected) WHERE pii_detected = TRUE;

-- -------------------------------------------------
-- 3. ai_provider_registry
--    Central registry of third-party AI providers
--    and their compliance posture.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_provider_registry (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code                     VARCHAR(64) UNIQUE NOT NULL,
  name_en                           TEXT NOT NULL,
  name_ar                           TEXT,

  provider_type                     TEXT CHECK (provider_type IN (
    'internal', 'external', 'open_source', 'consortium'
  )),

  -- Location & EU representation — Art. 22
  country                           VARCHAR(3),
  eu_authorized_representative_name    TEXT,
  eu_authorized_representative_address TEXT,

  -- Compliance posture
  compliance_status                 TEXT DEFAULT 'pending',
  last_assessed_at                  TIMESTAMPTZ,

  -- Risk classification
  risk_tier                         TEXT CHECK (risk_tier IN (
    'low', 'medium', 'high', 'critical'
  )),

  -- Contractual & contact
  contract_reference                TEXT,
  contact_email                     TEXT,

  -- Metadata
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apr_compliance ON ai_provider_registry(compliance_status);
CREATE INDEX IF NOT EXISTS idx_apr_risk       ON ai_provider_registry(risk_tier) WHERE risk_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apr_code       ON ai_provider_registry(provider_code);

-- -------------------------------------------------
-- 4. ai_supplier_agreements
--    Tracks contractual agreements with AI providers.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_supplier_agreements (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id                 UUID NOT NULL REFERENCES ai_provider_registry(id),

  agreement_type              TEXT CHECK (agreement_type IN (
    'license', 'service', 'data_processing', 'joint_controller'
  )),

  effective_date              DATE NOT NULL,
  expiry_date                 DATE,

  -- Terms
  data_processing_terms       JSONB DEFAULT '{}',
  sla_terms                   JSONB DEFAULT '{}',

  -- Rights & notifications
  audit_rights                BOOLEAN DEFAULT FALSE,
  sub_processor_notification  BOOLEAN DEFAULT FALSE,

  termination_conditions      TEXT,

  status                      TEXT DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'expired', 'terminated'
  )),

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asa_provider ON ai_supplier_agreements(provider_id);
CREATE INDEX IF NOT EXISTS idx_asa_status   ON ai_supplier_agreements(status);

-- -------------------------------------------------
-- 5. ai_model_modifications
--    Audit trail for every modification applied
--    to a model, with substantial-change tracking.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_model_modifications (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provenance_id               UUID NOT NULL REFERENCES ai_model_provenance(id),
  system_id                   UUID NOT NULL REFERENCES ai_system_registry(id),

  modification_type           TEXT CHECK (modification_type IN (
    'retrain', 'fine_tune', 'update', 'patch', 'architecture_change'
  )),
  description                 TEXT NOT NULL,
  previous_version            VARCHAR(32),
  new_version                 VARCHAR(32),

  -- Substantial modification — Art. 17
  is_substantial              BOOLEAN DEFAULT FALSE,
  substantial_justification   TEXT,
  impact_assessment_id        UUID,

  -- Approval
  approved_by                 VARCHAR(64),
  approved_at                 TIMESTAMPTZ,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amm_provenance   ON ai_model_modifications(provenance_id);
CREATE INDEX IF NOT EXISTS idx_amm_system       ON ai_model_modifications(system_id);
CREATE INDEX IF NOT EXISTS idx_amm_type         ON ai_model_modifications(modification_type) WHERE modification_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_amm_substantial  ON ai_model_modifications(is_substantial)
  WHERE is_substantial = TRUE;
