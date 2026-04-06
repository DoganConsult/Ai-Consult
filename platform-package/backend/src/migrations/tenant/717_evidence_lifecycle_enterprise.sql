-- Migration 717: Evidence Lifecycle Enterprise Tables
-- Creates operational tables for multi-object linkage, request targets,
-- submissions, quality assessments, freshness, provenance, reuse, and duplicates.

-- 1. evidence_links — link evidence to controls, risks, policies, obligations, findings, audits
CREATE TABLE IF NOT EXISTS evidence_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id         UUID NOT NULL,
  linked_entity_type  VARCHAR(30) NOT NULL,
  linked_entity_id    VARCHAR(100) NOT NULL,
  link_type           VARCHAR(30) NOT NULL DEFAULT 'supports',
  linked_by           VARCHAR(64),
  linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes               TEXT,
  CONSTRAINT uq_evidence_link UNIQUE (evidence_id, linked_entity_type, linked_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_links_evidence ON evidence_links(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_entity ON evidence_links(linked_entity_type, linked_entity_id);

-- 2. evidence_request_targets — route a single request to multiple users/teams
CREATE TABLE IF NOT EXISTS evidence_request_targets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL,
  target_user_id        VARCHAR(64),
  target_team_id        VARCHAR(64),
  acknowledged_at       TIMESTAMPTZ,
  submitted_evidence_id UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_request_targets_req ON evidence_request_targets(request_id);
CREATE INDEX IF NOT EXISTS idx_evidence_request_targets_user ON evidence_request_targets(target_user_id);

-- 3. evidence_submissions — tracks fulfilment of requests
CREATE TABLE IF NOT EXISTS evidence_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL,
  evidence_id       UUID NOT NULL,
  submitted_by      VARCHAR(64) NOT NULL,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_submissions_req ON evidence_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_evidence ON evidence_submissions(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_status ON evidence_submissions(status);

-- 4. evidence_quality_assessments — persistent quality evaluation history
CREATE TABLE IF NOT EXISTS evidence_quality_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL,
  assessed_by       VARCHAR(64) NOT NULL,
  composite_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  quality_tier      VARCHAR(1) NOT NULL DEFAULT 'C',
  dimension_scores  JSONB NOT NULL DEFAULT '{}',
  notes             TEXT,
  assessed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_quality_assess_eid ON evidence_quality_assessments(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_quality_assess_tier ON evidence_quality_assessments(quality_tier);

-- 5. evidence_rejection_reasons — structured rejection tracking
CREATE TABLE IF NOT EXISTS evidence_rejection_reasons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL,
  review_id         UUID,
  reason_code       VARCHAR(30) NOT NULL,
  reason_text       TEXT,
  created_by        VARCHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_rejections_eid ON evidence_rejection_reasons(evidence_id);

-- 6. evidence_freshness_records — point-in-time freshness snapshots
CREATE TABLE IF NOT EXISTS evidence_freshness_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id           UUID NOT NULL,
  freshness_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  days_since_collection INT NOT NULL DEFAULT 0,
  expected_cadence_days INT DEFAULT 90,
  is_stale              BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_freshness_eid ON evidence_freshness_records(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_freshness_stale ON evidence_freshness_records(is_stale) WHERE is_stale = TRUE;

-- 7. evidence_provenance_records — chain-of-custody audit trail
CREATE TABLE IF NOT EXISTS evidence_provenance_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL,
  event_type        VARCHAR(50) NOT NULL,
  actor             VARCHAR(64) NOT NULL,
  actor_role        VARCHAR(30),
  event_data        JSONB DEFAULT '{}',
  ip_address        VARCHAR(45),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_provenance_eid ON evidence_provenance_records(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_provenance_type ON evidence_provenance_records(event_type);
CREATE INDEX IF NOT EXISTS idx_evidence_provenance_time ON evidence_provenance_records(evidence_id, created_at DESC);

-- 8. evidence_verification_events — verification/validation events
CREATE TABLE IF NOT EXISTS evidence_verification_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id         UUID NOT NULL,
  verification_type   VARCHAR(30) NOT NULL,
  result              VARCHAR(20) NOT NULL,
  verifier            VARCHAR(64) NOT NULL,
  details             JSONB DEFAULT '{}',
  verified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_verify_eid ON evidence_verification_events(evidence_id);

-- 9. evidence_reuse_links — explicit reuse tracking across controls/frameworks
CREATE TABLE IF NOT EXISTS evidence_reuse_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_evidence_id    UUID NOT NULL,
  target_control_id     VARCHAR(100),
  target_framework_code VARCHAR(30),
  target_obligation_id  VARCHAR(100),
  reuse_type            VARCHAR(30) NOT NULL DEFAULT 'direct',
  created_by            VARCHAR(64),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_reuse_src ON evidence_reuse_links(source_evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_reuse_ctrl ON evidence_reuse_links(target_control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_reuse_fw ON evidence_reuse_links(target_framework_code);

-- 10. evidence_duplicate_candidates — potential duplicate detection
CREATE TABLE IF NOT EXISTS evidence_duplicate_candidates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id_a     UUID NOT NULL,
  evidence_id_b     UUID NOT NULL,
  similarity_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
  match_type        VARCHAR(30) NOT NULL DEFAULT 'content',
  reviewed          BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by       VARCHAR(64),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_dupes_a ON evidence_duplicate_candidates(evidence_id_a);
CREATE INDEX IF NOT EXISTS idx_evidence_dupes_b ON evidence_duplicate_candidates(evidence_id_b);
CREATE INDEX IF NOT EXISTS idx_evidence_dupes_unreviewed ON evidence_duplicate_candidates(reviewed) WHERE reviewed = FALSE;
