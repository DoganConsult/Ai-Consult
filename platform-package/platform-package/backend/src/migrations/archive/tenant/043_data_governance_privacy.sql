-- ============================================
-- AGRC-OS Tenant Migration 043
-- Domain K: Data Governance / Privacy
-- Phase 7 — 17 new tables
-- (ropa_entries, consent_records,
--  dpia_assessments already exist)
-- ============================================

-- ── K1. data_domains ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_domains (
  domain_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en              VARCHAR(255) NOT NULL,
  name_ar              VARCHAR(255),
  description          TEXT,
  owner_id             VARCHAR(64),
  classification_level VARCHAR(30),
  parent_domain_id     UUID REFERENCES data_domains(domain_id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_domains_parent   ON data_domains(parent_domain_id) WHERE parent_domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_domains_owner    ON data_domains(owner_id)          WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_domains_classif  ON data_domains(classification_level) WHERE deleted_at IS NULL;

-- ── K2. data_asset_types ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_asset_types (
  type_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) NOT NULL UNIQUE,
  name_en     VARCHAR(255) NOT NULL,
  name_ar     VARCHAR(255),
  description TEXT,
  category    VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_asset_types_code     ON data_asset_types(code);
CREATE INDEX IF NOT EXISTS idx_data_asset_types_category ON data_asset_types(category) WHERE deleted_at IS NULL;

-- ── K3. data_assets ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_assets (
  asset_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id         UUID REFERENCES data_domains(domain_id) ON DELETE SET NULL,
  name_en           VARCHAR(255) NOT NULL,
  name_ar           VARCHAR(255),
  asset_type_id     UUID REFERENCES data_asset_types(type_id) ON DELETE SET NULL,
  description       TEXT,
  owner_id          VARCHAR(64),
  classification    VARCHAR(30),
  sensitivity_level VARCHAR(20),
  location          VARCHAR(255),
  status            VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_assets_domain      ON data_assets(domain_id)      WHERE domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_type         ON data_assets(asset_type_id)  WHERE asset_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_owner        ON data_assets(owner_id)       WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_classif      ON data_assets(classification) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_status       ON data_assets(status)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_assets_sensitivity  ON data_assets(sensitivity_level) WHERE deleted_at IS NULL;

-- ── K4. data_asset_owners ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_asset_owners (
  ownership_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES data_assets(asset_id) ON DELETE CASCADE,
  user_id        VARCHAR(64) NOT NULL,
  ownership_type VARCHAR(30),
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_asset_owners_asset   ON data_asset_owners(asset_id);
CREATE INDEX IF NOT EXISTS idx_data_asset_owners_user    ON data_asset_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_data_asset_owners_primary ON data_asset_owners(asset_id, is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

-- ── K5. data_stewards ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_stewards (
  steward_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id        UUID NOT NULL REFERENCES data_domains(domain_id) ON DELETE CASCADE,
  user_id          VARCHAR(64) NOT NULL,
  stewardship_type VARCHAR(30),
  responsibilities TEXT,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_stewards_domain ON data_stewards(domain_id);
CREATE INDEX IF NOT EXISTS idx_data_stewards_user   ON data_stewards(user_id);

-- ── K6. data_classifications ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_classifications (
  classification_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   VARCHAR(50) NOT NULL UNIQUE,
  name_en                VARCHAR(255) NOT NULL,
  name_ar                VARCHAR(255),
  description            TEXT,
  sensitivity_level      INT NOT NULL DEFAULT 0,
  handling_requirements  TEXT,
  retention_requirements TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_classifications_code      ON data_classifications(code);
CREATE INDEX IF NOT EXISTS idx_data_classifications_sensitive ON data_classifications(sensitivity_level DESC) WHERE deleted_at IS NULL;

-- ── K7. metadata_records ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metadata_records (
  record_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES data_assets(asset_id) ON DELETE CASCADE,
  metadata_key   VARCHAR(200) NOT NULL,
  metadata_value TEXT,
  metadata_type  VARCHAR(50),
  source         VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_metadata_records_asset ON metadata_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_metadata_records_key   ON metadata_records(metadata_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_metadata_records_pair  ON metadata_records(asset_id, metadata_key) WHERE deleted_at IS NULL;

-- ── K8. data_quality_rules ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_quality_rules (
  rule_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id  UUID REFERENCES data_domains(domain_id) ON DELETE SET NULL,
  rule_name  VARCHAR(255) NOT NULL,
  rule_type  VARCHAR(50) NOT NULL,
  expression JSONB,
  severity   VARCHAR(20),
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dq_rules_domain  ON data_quality_rules(domain_id)  WHERE domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dq_rules_type    ON data_quality_rules(rule_type)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dq_rules_enabled ON data_quality_rules(enabled)    WHERE deleted_at IS NULL;

-- ── K9. data_quality_issues ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_quality_issues (
  issue_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     UUID REFERENCES data_quality_rules(rule_id) ON DELETE SET NULL,
  asset_id    UUID REFERENCES data_assets(asset_id) ON DELETE SET NULL,
  description TEXT,
  severity    VARCHAR(20),
  status      VARCHAR(30) NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dq_issues_rule     ON data_quality_issues(rule_id)  WHERE rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_asset    ON data_quality_issues(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_status   ON data_quality_issues(status)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_severity ON data_quality_issues(severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dq_issues_detected ON data_quality_issues(detected_at DESC);

-- ── K10. data_sharing_requests ────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_sharing_requests (
  request_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  VARCHAR(64) NOT NULL,
  requester_org VARCHAR(255),
  data_assets   UUID[],
  purpose       TEXT,
  legal_basis   VARCHAR(50),
  recipient_org VARCHAR(255),
  cross_border  BOOLEAN NOT NULL DEFAULT FALSE,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sharing_requests_requester ON data_sharing_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_sharing_requests_status    ON data_sharing_requests(status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sharing_requests_xborder   ON data_sharing_requests(cross_border) WHERE cross_border = TRUE AND deleted_at IS NULL;

-- ── K11. data_sharing_approvals ───────────────────────────────────

CREATE TABLE IF NOT EXISTS data_sharing_approvals (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES data_sharing_requests(request_id) ON DELETE CASCADE,
  approver_id VARCHAR(64) NOT NULL,
  decision    VARCHAR(20) NOT NULL,
  conditions  TEXT,
  approved_at TIMESTAMPTZ,
  valid_until DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sharing_approvals_request  ON data_sharing_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_sharing_approvals_approver ON data_sharing_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_sharing_approvals_decision ON data_sharing_approvals(decision) WHERE deleted_at IS NULL;

-- ── K12. retention_rules ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS retention_rules (
  rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_id    UUID REFERENCES data_classifications(classification_id) ON DELETE SET NULL,
  entity_type          VARCHAR(100) NOT NULL,
  retention_period_days INT NOT NULL,
  action_after_expiry  VARCHAR(30) NOT NULL CHECK (action_after_expiry IN ('archive','delete','review')),
  legal_hold_override  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_retention_rules_classif ON retention_rules(classification_id) WHERE classification_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retention_rules_entity  ON retention_rules(entity_type)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_retention_rules_action  ON retention_rules(action_after_expiry) WHERE deleted_at IS NULL;

-- ── K13. privacy_incidents ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_incidents (
  incident_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    VARCHAR(500) NOT NULL,
  description              TEXT,
  incident_type            VARCHAR(50) NOT NULL,
  severity                 VARCHAR(20),
  affected_data_types      TEXT[],
  affected_count           INT,
  detected_at              TIMESTAMPTZ,
  reported_at              TIMESTAMPTZ,
  status                   VARCHAR(30) NOT NULL DEFAULT 'open',
  dpa_notified             BOOLEAN NOT NULL DEFAULT FALSE,
  data_subjects_notified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_incidents_type     ON privacy_incidents(incident_type)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_severity ON privacy_incidents(severity)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_status   ON privacy_incidents(status)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_detected ON privacy_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_incidents_dpa      ON privacy_incidents(dpa_notified)   WHERE dpa_notified = FALSE AND deleted_at IS NULL;

-- ── K14. privacy_control_links ────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_control_links (
  link_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id     VARCHAR(100) NOT NULL,
  privacy_domain VARCHAR(50) NOT NULL,
  link_type      VARCHAR(30),
  coverage_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_control_links_control ON privacy_control_links(control_id);
CREATE INDEX IF NOT EXISTS idx_privacy_control_links_domain  ON privacy_control_links(privacy_domain) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_privacy_control_link
  ON privacy_control_links(control_id, privacy_domain) WHERE deleted_at IS NULL;

-- ── K15. privacy_reviews ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_reviews (
  review_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type      VARCHAR(50) NOT NULL,
  scope            TEXT,
  reviewer_id      VARCHAR(64),
  outcome          VARCHAR(20),
  findings         TEXT,
  next_review_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_reviews_type       ON privacy_reviews(review_type)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_reviews_reviewer   ON privacy_reviews(reviewer_id)      WHERE reviewer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_reviews_outcome    ON privacy_reviews(outcome)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_reviews_next       ON privacy_reviews(next_review_date) WHERE next_review_date IS NOT NULL AND deleted_at IS NULL;

-- ── K16. privacy_data_subject_requests ────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_data_subject_requests (
  request_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type       VARCHAR(30) NOT NULL CHECK (request_type IN ('access','rectification','erasure','portability','objection','restriction')),
  subject_identifier VARCHAR(200) NOT NULL,
  status             VARCHAR(30) NOT NULL DEFAULT 'received',
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date           DATE,
  completed_at       TIMESTAMPTZ,
  response_details   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dsr_type      ON privacy_data_subject_requests(request_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsr_status    ON privacy_data_subject_requests(status)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsr_due       ON privacy_data_subject_requests(due_date)     WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsr_received  ON privacy_data_subject_requests(received_at DESC);

-- ── K17. privacy_legal_bases ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_legal_bases (
  basis_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) NOT NULL UNIQUE,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  description     TEXT,
  requires_consent BOOLEAN NOT NULL DEFAULT FALSE,
  requires_dpia   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_legal_bases_code    ON privacy_legal_bases(code);
CREATE INDEX IF NOT EXISTS idx_privacy_legal_bases_consent ON privacy_legal_bases(requires_consent) WHERE requires_consent = TRUE AND deleted_at IS NULL;

-- ── TABLE DOCUMENTATION ───────────────────────────────────────────

COMMENT ON TABLE data_domains                  IS 'Logical data domains with hierarchical ownership';
COMMENT ON TABLE data_asset_types              IS 'Catalog of data asset type classifications';
COMMENT ON TABLE data_assets                   IS 'Data asset inventory with classification and sensitivity';
COMMENT ON TABLE data_asset_owners             IS 'Ownership assignments for data assets';
COMMENT ON TABLE data_stewards                 IS 'Data stewardship assignments per domain';
COMMENT ON TABLE data_classifications          IS 'Data classification scheme with handling/retention rules';
COMMENT ON TABLE metadata_records              IS 'Key-value metadata annotations on data assets';
COMMENT ON TABLE data_quality_rules            IS 'Data quality rule definitions with JSONB expressions';
COMMENT ON TABLE data_quality_issues           IS 'Data quality issues detected by rule evaluation';
COMMENT ON TABLE data_sharing_requests         IS 'Requests to share data assets (internal/cross-border)';
COMMENT ON TABLE data_sharing_approvals        IS 'Approval decisions for data sharing requests';
COMMENT ON TABLE retention_rules               IS 'Retention policy rules per classification/entity type';
COMMENT ON TABLE privacy_incidents             IS 'Privacy breach/incident register with DPA notification tracking';
COMMENT ON TABLE privacy_control_links         IS 'Mapping between GRC controls and privacy domains';
COMMENT ON TABLE privacy_reviews               IS 'Periodic privacy review records';
COMMENT ON TABLE privacy_data_subject_requests IS 'PDPL/GDPR data subject access/erasure requests';
COMMENT ON TABLE privacy_legal_bases           IS 'Legal basis catalog for personal data processing';

-- ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 043: Data Governance / Privacy created successfully';
  RAISE NOTICE '- Data governance: 9 tables (domains, asset_types, assets, owners, stewards, classifications, metadata, quality_rules, quality_issues)';
  RAISE NOTICE '- Data sharing: 2 tables (sharing_requests, sharing_approvals)';
  RAISE NOTICE '- Retention: 1 table (retention_rules)';
  RAISE NOTICE '- Privacy program: 5 tables (privacy_incidents, privacy_control_links, privacy_reviews, privacy_data_subject_requests, privacy_legal_bases)';
  RAISE NOTICE '- Total: 17 new tables (existing ropa_entries, consent_records, dpia_assessments preserved)';
END $$;
