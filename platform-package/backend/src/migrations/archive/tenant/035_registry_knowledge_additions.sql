-- ============================================================================
-- Migration 035: Registry & Knowledge Base — 8 NEW tables
-- Domain C: instrument_versions, ucf_control_versions, framework_domains,
--           framework_requirements, framework_requirement_versions,
--           framework_applicability_rules, evidence_type_catalog,
--           obligation_templates
-- ============================================================================

-- ============================================================
-- 1. instrument_versions
--    FK to public.instruments (instrument_id VARCHAR(100))
-- ============================================================
CREATE TABLE IF NOT EXISTS instrument_versions (
  version_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id    VARCHAR(100) NOT NULL,
  version_label    VARCHAR(100) NOT NULL,
  published_at     TIMESTAMPTZ,
  effective_at     TIMESTAMPTZ,
  retired_at       TIMESTAMPTZ,
  source_url       TEXT,
  change_log       TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_instrument_ver_inst     ON instrument_versions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_instrument_ver_label    ON instrument_versions(version_label);
CREATE INDEX IF NOT EXISTS idx_instrument_ver_eff      ON instrument_versions(effective_at);
CREATE INDEX IF NOT EXISTS idx_instrument_ver_retired  ON instrument_versions(retired_at) WHERE retired_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_instrument_ver_deleted  ON instrument_versions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. ucf_control_versions
--    FK to ucf_controls (control_id VARCHAR(100))
-- ============================================================
CREATE TABLE IF NOT EXISTS ucf_control_versions (
  version_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id         VARCHAR(100) NOT NULL REFERENCES ucf_controls(control_id) ON DELETE CASCADE,
  version_number     INT NOT NULL DEFAULT 1,
  change_type        VARCHAR(50) NOT NULL DEFAULT 'update'
    CHECK (change_type IN ('create','update','deprecate','supersede','merge','split')),
  change_summary     TEXT,
  previous_snapshot  JSONB DEFAULT '{}',
  changed_by         VARCHAR(64),
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_ucf_ctrl_ver_control    ON ucf_control_versions(control_id);
CREATE INDEX IF NOT EXISTS idx_ucf_ctrl_ver_number     ON ucf_control_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_ucf_ctrl_ver_type       ON ucf_control_versions(change_type);
CREATE INDEX IF NOT EXISTS idx_ucf_ctrl_ver_deleted    ON ucf_control_versions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. framework_domains
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_domains (
  domain_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id     VARCHAR(100) NOT NULL,
  code             VARCHAR(50) NOT NULL,
  label_en         VARCHAR(255) NOT NULL,
  label_ar         VARCHAR(255),
  display_order    INT NOT NULL DEFAULT 0,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       VARCHAR(64),
  updated_by       VARCHAR(64),
  UNIQUE (framework_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fw_domains_framework    ON framework_domains(framework_id);
CREATE INDEX IF NOT EXISTS idx_fw_domains_code         ON framework_domains(code);
CREATE INDEX IF NOT EXISTS idx_fw_domains_order        ON framework_domains(display_order);
CREATE INDEX IF NOT EXISTS idx_fw_domains_deleted      ON framework_domains(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. framework_requirements
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_requirements (
  requirement_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id       VARCHAR(100) NOT NULL,
  domain_id          UUID REFERENCES framework_domains(domain_id) ON DELETE SET NULL,
  code               VARCHAR(100) NOT NULL,
  title_en           VARCHAR(500) NOT NULL,
  title_ar           VARCHAR(500),
  requirement_text_en TEXT,
  requirement_text_ar TEXT,
  criticality_weight NUMERIC(3,2) DEFAULT 0.50,
  display_order      INT NOT NULL DEFAULT 0,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64),
  UNIQUE (framework_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fw_reqs_framework       ON framework_requirements(framework_id);
CREATE INDEX IF NOT EXISTS idx_fw_reqs_domain          ON framework_requirements(domain_id);
CREATE INDEX IF NOT EXISTS idx_fw_reqs_code            ON framework_requirements(code);
CREATE INDEX IF NOT EXISTS idx_fw_reqs_criticality     ON framework_requirements(criticality_weight);
CREATE INDEX IF NOT EXISTS idx_fw_reqs_order           ON framework_requirements(display_order);
CREATE INDEX IF NOT EXISTS idx_fw_reqs_deleted         ON framework_requirements(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. framework_requirement_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_requirement_versions (
  version_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id     UUID NOT NULL REFERENCES framework_requirements(requirement_id) ON DELETE CASCADE,
  version_label      VARCHAR(100) NOT NULL,
  effective_at       TIMESTAMPTZ,
  change_log         TEXT,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_fw_req_ver_req          ON framework_requirement_versions(requirement_id);
CREATE INDEX IF NOT EXISTS idx_fw_req_ver_label        ON framework_requirement_versions(version_label);
CREATE INDEX IF NOT EXISTS idx_fw_req_ver_eff          ON framework_requirement_versions(effective_at);
CREATE INDEX IF NOT EXISTS idx_fw_req_ver_deleted      ON framework_requirement_versions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 6. framework_applicability_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS framework_applicability_rules (
  rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id       UUID NOT NULL REFERENCES framework_requirements(requirement_id) ON DELETE CASCADE,
  condition_expr       JSONB NOT NULL DEFAULT '{}',
  applicability_state  VARCHAR(30) NOT NULL DEFAULT 'applicable'
    CHECK (applicability_state IN ('applicable','not_applicable','conditional')),
  confidence_weight    NUMERIC(3,2) DEFAULT 1.00,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_fw_app_rules_req        ON framework_applicability_rules(requirement_id);
CREATE INDEX IF NOT EXISTS idx_fw_app_rules_state      ON framework_applicability_rules(applicability_state);
CREATE INDEX IF NOT EXISTS idx_fw_app_rules_deleted    ON framework_applicability_rules(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. evidence_type_catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_type_catalog (
  type_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               VARCHAR(100) NOT NULL UNIQUE,
  name_en            VARCHAR(255) NOT NULL,
  name_ar            VARCHAR(255),
  category           VARCHAR(100),
  source_types       TEXT[] DEFAULT '{}',
  default_quality_tier VARCHAR(1) DEFAULT 'B'
    CHECK (default_quality_tier IN ('A','B','C')),
  retention_days     INT DEFAULT 365,
  description_en     TEXT,
  description_ar     TEXT,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_evidence_type_code      ON evidence_type_catalog(code);
CREATE INDEX IF NOT EXISTS idx_evidence_type_cat       ON evidence_type_catalog(category);
CREATE INDEX IF NOT EXISTS idx_evidence_type_quality   ON evidence_type_catalog(default_quality_tier);
CREATE INDEX IF NOT EXISTS idx_evidence_type_deleted   ON evidence_type_catalog(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 8. obligation_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS obligation_templates (
  template_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en              VARCHAR(255) NOT NULL,
  name_ar              VARCHAR(255),
  obligation_type      VARCHAR(100) NOT NULL,
  framework_id         VARCHAR(100),
  default_cadence      VARCHAR(50) DEFAULT 'quarterly'
    CHECK (default_cadence IN ('continuous','daily','weekly','monthly','quarterly','semi_annual','annual')),
  default_evidence_types TEXT[] DEFAULT '{}',
  template_body        JSONB DEFAULT '{}',
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_oblig_tmpl_type         ON obligation_templates(obligation_type);
CREATE INDEX IF NOT EXISTS idx_oblig_tmpl_framework    ON obligation_templates(framework_id);
CREATE INDEX IF NOT EXISTS idx_oblig_tmpl_cadence      ON obligation_templates(default_cadence);
CREATE INDEX IF NOT EXISTS idx_oblig_tmpl_deleted      ON obligation_templates(deleted_at) WHERE deleted_at IS NULL;
