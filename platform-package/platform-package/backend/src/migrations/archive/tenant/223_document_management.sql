-- ============================================================================
-- Migration 219: Document Management System
-- Versioned document store with reviews and retention tracking.
-- ============================================================================

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  doc_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(100) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  doc_type        VARCHAR(50) DEFAULT 'general',
  version         INTEGER DEFAULT 1,
  status          VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived','superseded')),
  owner_id        VARCHAR(100),
  dept_id         UUID,
  classification  VARCHAR(30) DEFAULT 'internal',
  file_path       TEXT,
  file_size_bytes BIGINT,
  content_hash    VARCHAR(128),
  retention_until DATE,
  review_date     DATE,
  tags            JSONB DEFAULT '[]'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_by      VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_dept ON documents(dept_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_review_date ON documents(review_date) WHERE status = 'published';

-- Document versions (change history)
CREATE TABLE IF NOT EXISTS document_versions (
  version_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id          UUID NOT NULL REFERENCES documents(doc_id),
  version_number  INTEGER NOT NULL,
  change_summary  TEXT,
  file_path       TEXT,
  file_size_bytes BIGINT,
  content_hash    VARCHAR(128),
  created_by      VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON document_versions(doc_id);

-- Document reviews
CREATE TABLE IF NOT EXISTS document_reviews (
  review_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      UUID NOT NULL REFERENCES documents(doc_id),
  reviewer_id VARCHAR(100) NOT NULL,
  status      VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_revision')),
  comments    TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_reviews_doc ON document_reviews(doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_reviews_reviewer ON document_reviews(reviewer_id);

-- Evidence scoring cache (from performance/compliance plan)
CREATE TABLE IF NOT EXISTS evidence_scores (
  evidence_id        UUID PRIMARY KEY,
  completeness_score NUMERIC(5,2),
  freshness_score    NUMERIC(5,2),
  verification_score NUMERIC(5,2),
  integrity_score    NUMERIC(5,2),
  reuse_score        NUMERIC(5,2),
  composite_score    NUMERIC(5,2),
  computed_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-framework evidence reuse tracking
CREATE TABLE IF NOT EXISTS evidence_reuse_links (
  link_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id          UUID,
  source_control_id    VARCHAR(100),
  target_control_id    VARCHAR(100),
  source_framework_code VARCHAR(50),
  target_framework_code VARCHAR(50),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_reuse_evidence ON evidence_reuse_links(evidence_id);

-- Audit anomaly detection results
CREATE TABLE IF NOT EXISTS audit_anomalies (
  anomaly_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type VARCHAR(50) NOT NULL,
  severity    VARCHAR(20) DEFAULT 'medium',
  user_id     VARCHAR(100),
  details     JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_audit_anomalies_type ON audit_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_audit_anomalies_severity ON audit_anomalies(severity);
