-- Migration: 941_qiyas_service_runtime_tables.sql
-- Creates runtime tables required by Qiyas backend services that are
-- missing from the original elaborate schema (046-050).
-- All DDL uses IF NOT EXISTS for idempotency.
-- Date: 2026-04-04

-- ═══════════════════════════════════════════════════════════════
-- 1. Domain Scores (computed scores per domain per assessment)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_domain_scores (
    domain_score_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    domain_id         UUID         NOT NULL,
    domain_name       VARCHAR(255),
    score             DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_score         DECIMAL(10,2) DEFAULT 5,
    maturity_level    VARCHAR(50),
    computed_at       TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (assessment_id, domain_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_domain_scores_assessment
    ON qiyas_domain_scores (assessment_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. Score History (point-in-time overall score records)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_score_history (
    history_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    overall_score     DECIMAL(10,2) NOT NULL DEFAULT 0,
    maturity_level    VARCHAR(50),
    domain_scores     JSONB        DEFAULT '[]',
    recorded_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_score_history_assessment
    ON qiyas_score_history (assessment_id, recorded_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 3. Simplified Respondents (service-layer respondent management)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_respondents (
    respondent_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    user_id           VARCHAR(64)  NOT NULL,
    role              VARCHAR(50)  DEFAULT 'assessor',
    domain_ids        JSONB        DEFAULT '[]',
    status            VARCHAR(20)  NOT NULL DEFAULT 'assigned'
                      CHECK (status IN ('assigned','in_progress','submitted','reviewed')),
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_respondents_assessment
    ON qiyas_respondents (assessment_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. Question Sets (service-layer question bank)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_question_sets (
    question_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id         UUID,
    group_id          UUID,
    model_id          UUID,
    text              TEXT         NOT NULL,
    description       TEXT,
    question_type     VARCHAR(30)  NOT NULL DEFAULT 'likert',
    weight            DECIMAL(5,2) DEFAULT 1.00,
    max_score         DECIMAL(10,2) DEFAULT 5,
    display_order     INT          DEFAULT 0,
    metadata          JSONB        DEFAULT '{}',
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_question_sets_domain
    ON qiyas_question_sets (domain_id, display_order);

-- ═══════════════════════════════════════════════════════════════
-- 5. Question Groups
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_question_groups (
    group_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id          UUID,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    display_order     INT          DEFAULT 0,
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_question_groups_model
    ON qiyas_question_groups (model_id, display_order);

-- ═══════════════════════════════════════════════════════════════
-- 6. Calibration Sessions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_calibration_sessions (
    session_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    session_name      VARCHAR(255),
    facilitator_id    VARCHAR(64),
    status            VARCHAR(20)  NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','finalized','cancelled')),
    scheduled_at      TIMESTAMPTZ,
    notes             TEXT,
    reliability_score DECIMAL(5,2),
    consensus_results JSONB        DEFAULT '[]',
    finalized_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_calibration_sessions_assessment
    ON qiyas_calibration_sessions (assessment_id, status);

-- ═══════════════════════════════════════════════════════════════
-- 7. Calibration Entries
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_calibration_entries (
    entry_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID         NOT NULL REFERENCES qiyas_calibration_sessions(session_id) ON DELETE CASCADE,
    assessor_id       VARCHAR(64)  NOT NULL,
    domain_id         UUID,
    question_id       UUID,
    original_score    DECIMAL(10,2),
    calibrated_score  DECIMAL(10,2),
    justification     TEXT,
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_calibration_entries_session
    ON qiyas_calibration_entries (session_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. Certification Gaps
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_certification_gaps (
    gap_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    domain_id         UUID,
    domain_name       VARCHAR(255),
    current_score     DECIMAL(10,2),
    required_score    DECIMAL(10,2),
    severity          VARCHAR(20)  DEFAULT 'medium'
                      CHECK (severity IN ('critical','high','medium','low')),
    status            VARCHAR(20)  NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','resolved','accepted')),
    framework_code    VARCHAR(50),
    evidence          JSONB,
    resolved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (assessment_id, domain_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_certification_gaps_assessment
    ON qiyas_certification_gaps (assessment_id, status);

-- ═══════════════════════════════════════════════════════════════
-- 9. Certification Readiness
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_certification_readiness (
    readiness_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL UNIQUE,
    readiness_score   INT          NOT NULL DEFAULT 0,
    total_gaps        INT          DEFAULT 0,
    critical_gaps     INT          DEFAULT 0,
    passing_domains   INT          DEFAULT 0,
    total_domains     INT          DEFAULT 0,
    computed_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 10. Peer Comparisons
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_peer_comparisons (
    comparison_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    dataset_id        UUID,
    overall_score     DECIMAL(10,2),
    overall_percentile INT,
    domain_comparisons JSONB       DEFAULT '[]',
    compared_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_peer_comparisons_assessment
    ON qiyas_peer_comparisons (assessment_id, compared_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 11. Peer Comparison Pool (opt-in anonymized data)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_peer_comparison_pool (
    pool_entry_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code        VARCHAR(50)  NOT NULL,
    overall_score     DECIMAL(10,2) NOT NULL,
    domain_scores     JSONB        DEFAULT '{}',
    sector            VARCHAR(100),
    org_size          VARCHAR(50),
    region            VARCHAR(50),
    opted_in          BOOLEAN      DEFAULT TRUE,
    snapshot_date     DATE         DEFAULT CURRENT_DATE,
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_peer_pool_model
    ON qiyas_peer_comparison_pool (model_code, opted_in);

-- ═══════════════════════════════════════════════════════════════
-- 12. Maturity Snapshots
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_maturity_snapshots (
    snapshot_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    overall_score     DECIMAL(10,2) NOT NULL DEFAULT 0,
    maturity_level    VARCHAR(50),
    domain_scores     JSONB        DEFAULT '[]',
    snapshot_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_snapshots_assessment
    ON qiyas_maturity_snapshots (assessment_id, snapshot_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 13. Capability Scores
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_capability_scores (
    capability_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    domain_id         UUID         NOT NULL,
    capability_id     UUID,
    capability_name   VARCHAR(255),
    score             DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_score         DECIMAL(10,2) DEFAULT 5,
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_capability_scores_assessment
    ON qiyas_capability_scores (assessment_id, domain_id);

-- ═══════════════════════════════════════════════════════════════
-- 14. Target Profiles
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_target_profiles (
    profile_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id         UUID         NOT NULL UNIQUE,
    target_level      INT          DEFAULT 3,
    target_score      DECIMAL(10,2),
    target_date       DATE,
    notes             TEXT,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 15. Improvement Plans
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_improvement_plans (
    plan_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id     UUID         NOT NULL,
    domain_id         UUID,
    title             VARCHAR(500) NOT NULL,
    description       TEXT,
    priority          VARCHAR(20)  DEFAULT 'medium'
                      CHECK (priority IN ('critical','high','medium','low')),
    effort            VARCHAR(20)  DEFAULT 'medium',
    impact            VARCHAR(20)  DEFAULT 'medium',
    status            VARCHAR(20)  NOT NULL DEFAULT 'planned'
                      CHECK (status IN ('planned','in_progress','completed','cancelled')),
    target_date       DATE,
    owner_id          VARCHAR(64),
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_improvement_plans_assessment
    ON qiyas_improvement_plans (assessment_id, priority);

-- ═══════════════════════════════════════════════════════════════
-- 16. Evidence Links (maps evidence to assessments)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qiyas_evidence_links (
    link_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id       UUID         NOT NULL,
    assessment_id     UUID,
    control_id        VARCHAR(100),
    obligation_id     VARCHAR(100),
    link_type         VARCHAR(30)  DEFAULT 'supports',
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_links_evidence
    ON qiyas_evidence_links (evidence_id);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_links_assessment
    ON qiyas_evidence_links (assessment_id);

-- ═══════════════════════════════════════════════════════════════
-- 17. Column reconciliation for tables created by 046-050
--     that have mismatched columns vs service expectations.
-- ═══════════════════════════════════════════════════════════════

-- qiyas_assessments: services expect assessment_id, title, description, conducted_by, metadata, deleted_at, framework_code
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS assessment_id UUID DEFAULT gen_random_uuid();
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS conducted_by VARCHAR(64);
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS framework_code VARCHAR(50);
ALTER TABLE qiyas_assessments ADD COLUMN IF NOT EXISTS model_id UUID;
-- Populate assessment_id from PK if null
UPDATE qiyas_assessments SET assessment_id = qiyas_assessment_id WHERE assessment_id IS NULL;
UPDATE qiyas_assessments SET title = title_en WHERE title IS NULL AND title_en IS NOT NULL;
UPDATE qiyas_assessments SET description = description_en WHERE description IS NULL AND description_en IS NOT NULL;
UPDATE qiyas_assessments SET conducted_by = created_by WHERE conducted_by IS NULL AND created_by IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_qiyas_assessments_assessment_id ON qiyas_assessments (assessment_id);

-- qiyas_responses: services expect assessment_id, justification, evidence_ids
ALTER TABLE qiyas_responses ADD COLUMN IF NOT EXISTS assessment_id UUID;
ALTER TABLE qiyas_responses ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE qiyas_responses ADD COLUMN IF NOT EXISTS evidence_ids JSONB DEFAULT '[]';
UPDATE qiyas_responses SET assessment_id = qiyas_assessment_id WHERE assessment_id IS NULL AND qiyas_assessment_id IS NOT NULL;

-- qiyas_assessment_scopes: services expect assessment_id, scope_value, description
ALTER TABLE qiyas_assessment_scopes ADD COLUMN IF NOT EXISTS assessment_id UUID;
ALTER TABLE qiyas_assessment_scopes ADD COLUMN IF NOT EXISTS scope_value TEXT;
ALTER TABLE qiyas_assessment_scopes ADD COLUMN IF NOT EXISTS description TEXT;
UPDATE qiyas_assessment_scopes SET assessment_id = qiyas_assessment_id WHERE assessment_id IS NULL AND qiyas_assessment_id IS NOT NULL;
UPDATE qiyas_assessment_scopes SET scope_value = scope_entity_id WHERE scope_value IS NULL AND scope_entity_id IS NOT NULL;

-- qiyas_dimensions: services expect model_id, name, display_order, deleted_at
ALTER TABLE qiyas_dimensions ADD COLUMN IF NOT EXISTS model_id UUID;
ALTER TABLE qiyas_dimensions ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE qiyas_dimensions ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE qiyas_dimensions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE qiyas_dimensions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE qiyas_dimensions ADD COLUMN IF NOT EXISTS dimension_id_alias UUID;
-- Populate model_id from parent domain
UPDATE qiyas_dimensions d SET model_id = dom.model_id
  FROM qiyas_domains dom WHERE dom.domain_id = d.domain_id AND d.model_id IS NULL;
UPDATE qiyas_dimensions SET name = name_en WHERE name IS NULL AND name_en IS NOT NULL;
UPDATE qiyas_dimensions SET display_order = sort_order WHERE display_order = 0 AND sort_order IS NOT NULL;
UPDATE qiyas_dimensions SET description = description_en WHERE description IS NULL AND description_en IS NOT NULL;

-- qiyas_model_versions: services expect change_notes, snapshot_data
ALTER TABLE qiyas_model_versions ADD COLUMN IF NOT EXISTS change_notes TEXT;
ALTER TABLE qiyas_model_versions ADD COLUMN IF NOT EXISTS snapshot_data JSONB DEFAULT '{}';
UPDATE qiyas_model_versions SET change_notes = change_summary WHERE change_notes IS NULL AND change_summary IS NOT NULL;
UPDATE qiyas_model_versions SET snapshot_data = definition WHERE snapshot_data IS NULL AND definition IS NOT NULL;

-- qiyas_maturity_models (049): services expect model_id, name, description, model_type, max_level, metadata, deleted_at, model_code
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS model_id UUID DEFAULT gen_random_uuid();
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS model_type VARCHAR(30) DEFAULT 'standard';
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS max_level INT DEFAULT 5;
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE qiyas_maturity_models ADD COLUMN IF NOT EXISTS model_code VARCHAR(50);
UPDATE qiyas_maturity_models SET model_id = maturity_model_id WHERE model_id IS NULL;
UPDATE qiyas_maturity_models SET name = name_en WHERE name IS NULL AND name_en IS NOT NULL;
UPDATE qiyas_maturity_models SET description = description_en WHERE description IS NULL AND description_en IS NOT NULL;
UPDATE qiyas_maturity_models SET max_level = total_levels WHERE max_level = 5 AND total_levels IS NOT NULL AND total_levels != 5;
UPDATE qiyas_maturity_models SET model_code = code WHERE model_code IS NULL AND code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_qiyas_maturity_models_model_id ON qiyas_maturity_models (model_id);

-- qiyas_evidence_scoring_models (049): services expect name, active
ALTER TABLE qiyas_evidence_scoring_models ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE qiyas_evidence_scoring_models ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
UPDATE qiyas_evidence_scoring_models SET name = name_en WHERE name IS NULL AND name_en IS NOT NULL;
UPDATE qiyas_evidence_scoring_models SET active = (status = 'active') WHERE active IS NULL;

-- qiyas_evidence_scores (049): services expect relevance_score, quality_score, recency_score, justification
ALTER TABLE qiyas_evidence_scores ADD COLUMN IF NOT EXISTS relevance_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE qiyas_evidence_scores ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE qiyas_evidence_scores ADD COLUMN IF NOT EXISTS recency_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE qiyas_evidence_scores ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE qiyas_evidence_scores ADD COLUMN IF NOT EXISTS scoring_model_id_compat UUID;
-- Map scoring_model_id reference if different column name
UPDATE qiyas_evidence_scores SET scoring_model_id_compat = scoring_model_id WHERE scoring_model_id_compat IS NULL;

-- qiyas_recommendations (048): services expect title, description, effort, impact, updated_by
ALTER TABLE qiyas_recommendations ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE qiyas_recommendations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE qiyas_recommendations ADD COLUMN IF NOT EXISTS effort VARCHAR(20) DEFAULT 'medium';
ALTER TABLE qiyas_recommendations ADD COLUMN IF NOT EXISTS impact VARCHAR(20) DEFAULT 'medium';
ALTER TABLE qiyas_recommendations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);
UPDATE qiyas_recommendations SET title = title_en WHERE title IS NULL AND title_en IS NOT NULL;
UPDATE qiyas_recommendations SET description = description_en WHERE description IS NULL AND description_en IS NOT NULL;
UPDATE qiyas_recommendations SET effort = effort_level WHERE effort IS NULL AND effort_level IS NOT NULL;

-- qiyas_benchmark_datasets (050): services expect name, sector, org_size, data_points, statistics
ALTER TABLE qiyas_benchmark_datasets ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE qiyas_benchmark_datasets ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE qiyas_benchmark_datasets ADD COLUMN IF NOT EXISTS org_size VARCHAR(50);
ALTER TABLE qiyas_benchmark_datasets ADD COLUMN IF NOT EXISTS data_points JSONB DEFAULT '[]';
ALTER TABLE qiyas_benchmark_datasets ADD COLUMN IF NOT EXISTS statistics JSONB DEFAULT '{}';
UPDATE qiyas_benchmark_datasets SET name = name_en WHERE name IS NULL AND name_en IS NOT NULL;
UPDATE qiyas_benchmark_datasets SET sector = sector_id WHERE sector IS NULL AND sector_id IS NOT NULL;
UPDATE qiyas_benchmark_datasets SET statistics = data WHERE statistics = '{}'::jsonb AND data != '{}'::jsonb;

-- ═══════════════════════════════════════════════════════════════
-- 18. Trigger to keep assessment_id in sync with qiyas_assessment_id
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION qiyas_sync_assessment_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assessment_id IS NULL THEN
    NEW.assessment_id = NEW.qiyas_assessment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_qiyas_sync_assessment_id'
  ) THEN
    CREATE TRIGGER trg_qiyas_sync_assessment_id
      BEFORE INSERT ON qiyas_assessments
      FOR EACH ROW
      EXECUTE FUNCTION qiyas_sync_assessment_id();
  END IF;
END $$;

-- Same sync trigger for responses
CREATE OR REPLACE FUNCTION qiyas_sync_response_assessment_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assessment_id IS NULL THEN
    NEW.assessment_id = NEW.qiyas_assessment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_qiyas_sync_response_assessment_id'
  ) THEN
    CREATE TRIGGER trg_qiyas_sync_response_assessment_id
      BEFORE INSERT ON qiyas_responses
      FOR EACH ROW
      EXECUTE FUNCTION qiyas_sync_response_assessment_id();
  END IF;
END $$;

-- Same sync for assessment_scopes
CREATE OR REPLACE FUNCTION qiyas_sync_scope_assessment_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assessment_id IS NULL THEN
    NEW.assessment_id = NEW.qiyas_assessment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_qiyas_sync_scope_assessment_id'
  ) THEN
    CREATE TRIGGER trg_qiyas_sync_scope_assessment_id
      BEFORE INSERT ON qiyas_assessment_scopes
      FOR EACH ROW
      EXECUTE FUNCTION qiyas_sync_scope_assessment_id();
  END IF;
END $$;
