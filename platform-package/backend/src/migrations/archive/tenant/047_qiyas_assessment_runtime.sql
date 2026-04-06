-- Migration: 047_qiyas_assessment_runtime.sql
-- Phase 9b: Qiyas Engine — Sub-domain O-C (Assessment Execution Runtime)
--           + Sub-domain O-D (Scoring & Results)
-- 16 new tables
-- Date: 2026-03-01

-- ═══════════════════════════════════════════════════════════════
-- O-C. Assessment Execution Runtime (8 tables)
-- ═══════════════════════════════════════════════════════════════

-- A Qiyas assessment instance (wraps the existing assessments table with Qiyas-specific metadata)
CREATE TABLE IF NOT EXISTS qiyas_assessments (
    qiyas_assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID,
    model_id        UUID         NOT NULL,
    template_id     UUID,
    title_en        VARCHAR(255) NOT NULL,
    title_ar        VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    assessment_type VARCHAR(30)  NOT NULL DEFAULT 'self_assessment'
                    CHECK (assessment_type IN ('self_assessment','external_audit','peer_review',
                                               'gap_analysis','certification_readiness','benchmarking')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','in_progress','under_review','calibration',
                                      'finalized','archived')),
    target_date     DATE,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    finalized_at    TIMESTAMPTZ,
    finalized_by    VARCHAR(64),
    created_by      VARCHAR(64)  NOT NULL,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_assessments_model
    ON qiyas_assessments (model_id, status);
CREATE INDEX IF NOT EXISTS idx_qiyas_assessments_status
    ON qiyas_assessments (status, created_at DESC);

-- Scoping: which org units / departments / teams are in scope for an assessment
CREATE TABLE IF NOT EXISTS qiyas_assessment_scopes (
    scope_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL REFERENCES qiyas_assessments(qiyas_assessment_id) ON DELETE CASCADE,
    scope_type      VARCHAR(30)  NOT NULL
                    CHECK (scope_type IN ('department','team','business_unit','location','process','system')),
    scope_entity_id VARCHAR(100) NOT NULL,
    scope_name      VARCHAR(255),
    included        BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (qiyas_assessment_id, scope_type, scope_entity_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_assessment_scopes_assessment
    ON qiyas_assessment_scopes (qiyas_assessment_id);

-- Respondent assignments (who answers which sections)
CREATE TABLE IF NOT EXISTS qiyas_assessment_respondents (
    respondent_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL REFERENCES qiyas_assessments(qiyas_assessment_id) ON DELETE CASCADE,
    user_id         VARCHAR(64)  NOT NULL,
    user_name       VARCHAR(255),
    role            VARCHAR(50)  DEFAULT 'respondent'
                    CHECK (role IN ('respondent','reviewer','calibrator','approver','observer')),
    assigned_sections TEXT[]     DEFAULT '{}',
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','submitted','reviewed')),
    invited_at      TIMESTAMPTZ  DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    reminder_count  INT          DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    UNIQUE (qiyas_assessment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_respondents_assessment
    ON qiyas_assessment_respondents (qiyas_assessment_id, status);

-- Individual question responses
CREATE TABLE IF NOT EXISTS qiyas_responses (
    response_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL REFERENCES qiyas_assessments(qiyas_assessment_id) ON DELETE CASCADE,
    question_id     UUID         NOT NULL,
    respondent_id   UUID         REFERENCES qiyas_assessment_respondents(respondent_id),
    answer_value    JSONB        NOT NULL DEFAULT '{}',
    score           DECIMAL(10,2),
    confidence      DECIMAL(3,2) DEFAULT 0.00,
    notes           TEXT,
    flagged         BOOLEAN      DEFAULT FALSE,
    flag_reason     TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (qiyas_assessment_id, question_id, respondent_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_responses_assessment
    ON qiyas_responses (qiyas_assessment_id);
CREATE INDEX IF NOT EXISTS idx_qiyas_responses_question
    ON qiyas_responses (question_id);

-- Response change history (full audit trail per answer)
CREATE TABLE IF NOT EXISTS qiyas_response_history (
    history_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id     UUID         NOT NULL REFERENCES qiyas_responses(response_id) ON DELETE CASCADE,
    version         INT          NOT NULL DEFAULT 1,
    previous_value  JSONB,
    new_value       JSONB        NOT NULL,
    previous_score  DECIMAL(10,2),
    new_score       DECIMAL(10,2),
    changed_by      VARCHAR(64)  NOT NULL,
    change_reason   TEXT,
    changed_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_response_history_response
    ON qiyas_response_history (response_id, version DESC);

-- File/evidence attachments on responses
CREATE TABLE IF NOT EXISTS qiyas_response_attachments (
    attachment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id     UUID         NOT NULL REFERENCES qiyas_responses(response_id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_path       VARCHAR(1000),
    file_size_bytes BIGINT,
    content_type    VARCHAR(100),
    content_hash    VARCHAR(128),
    evidence_id     UUID,
    uploaded_by     VARCHAR(64)  NOT NULL,
    uploaded_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_response_attachments_response
    ON qiyas_response_attachments (response_id);

-- Reviewer feedback on assessment sections/questions
CREATE TABLE IF NOT EXISTS qiyas_assessment_reviews (
    review_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL REFERENCES qiyas_assessments(qiyas_assessment_id) ON DELETE CASCADE,
    reviewer_id     VARCHAR(64)  NOT NULL,
    reviewer_name   VARCHAR(255),
    scope           VARCHAR(30)  DEFAULT 'full'
                    CHECK (scope IN ('full','section','question')),
    scope_entity_id UUID,
    decision        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (decision IN ('pending','approved','returned','escalated')),
    comments        TEXT,
    score_adjustments JSONB      DEFAULT '[]',
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_assessment_reviews_assessment
    ON qiyas_assessment_reviews (qiyas_assessment_id, decision);

-- Assessment status change history (state machine audit trail)
CREATE TABLE IF NOT EXISTS qiyas_assessment_status_history (
    history_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL REFERENCES qiyas_assessments(qiyas_assessment_id) ON DELETE CASCADE,
    from_status     VARCHAR(20)  NOT NULL,
    to_status       VARCHAR(20)  NOT NULL,
    changed_by      VARCHAR(64)  NOT NULL,
    reason          TEXT,
    metadata        JSONB        DEFAULT '{}',
    changed_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_status_history_assessment
    ON qiyas_assessment_status_history (qiyas_assessment_id, changed_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- O-D. Scoring and Results (8 tables)
-- ═══════════════════════════════════════════════════════════════

-- Overall assessment scores (one row per finalized assessment)
CREATE TABLE IF NOT EXISTS qiyas_scores (
    score_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL REFERENCES qiyas_assessments(qiyas_assessment_id) ON DELETE CASCADE,
    model_id        UUID         NOT NULL,
    overall_score   DECIMAL(10,2) NOT NULL DEFAULT 0,
    overall_level   VARCHAR(50),
    max_possible    DECIMAL(10,2),
    completion_pct  DECIMAL(5,2) DEFAULT 0,
    scoring_method  VARCHAR(50),
    scored_at       TIMESTAMPTZ  DEFAULT NOW(),
    scored_by       VARCHAR(64),
    is_final        BOOLEAN      DEFAULT FALSE,
    metadata        JSONB        DEFAULT '{}',
    UNIQUE (qiyas_assessment_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_scores_model
    ON qiyas_scores (model_id, scored_at DESC);

-- Per-dimension score breakdown
CREATE TABLE IF NOT EXISTS qiyas_dimension_scores (
    dimension_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id        UUID         NOT NULL REFERENCES qiyas_scores(score_id) ON DELETE CASCADE,
    dimension_id    UUID         NOT NULL,
    domain_id       UUID         NOT NULL,
    score           DECIMAL(10,2) NOT NULL DEFAULT 0,
    level           VARCHAR(50),
    max_possible    DECIMAL(10,2),
    weight_applied  DECIMAL(5,2),
    questions_total INT          DEFAULT 0,
    questions_answered INT       DEFAULT 0,
    metadata        JSONB        DEFAULT '{}',
    UNIQUE (score_id, dimension_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_dimension_scores_score
    ON qiyas_dimension_scores (score_id);

-- Per-indicator score breakdown
CREATE TABLE IF NOT EXISTS qiyas_indicator_scores (
    indicator_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id        UUID         NOT NULL REFERENCES qiyas_scores(score_id) ON DELETE CASCADE,
    indicator_id    UUID         NOT NULL,
    dimension_id    UUID         NOT NULL,
    score           DECIMAL(10,2) NOT NULL DEFAULT 0,
    raw_value       DECIMAL(10,2),
    normalized_value DECIMAL(10,2),
    weight_applied  DECIMAL(5,2),
    evidence_count  INT          DEFAULT 0,
    metadata        JSONB        DEFAULT '{}',
    UNIQUE (score_id, indicator_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_indicator_scores_score
    ON qiyas_indicator_scores (score_id);

-- Gap analysis scores (current vs target per domain/dimension)
CREATE TABLE IF NOT EXISTS qiyas_gap_scores (
    gap_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id        UUID         NOT NULL REFERENCES qiyas_scores(score_id) ON DELETE CASCADE,
    entity_type     VARCHAR(30)  NOT NULL
                    CHECK (entity_type IN ('domain','dimension','indicator')),
    entity_id       UUID         NOT NULL,
    current_score   DECIMAL(10,2) NOT NULL,
    target_score    DECIMAL(10,2) NOT NULL,
    gap_value       DECIMAL(10,2) GENERATED ALWAYS AS (target_score - current_score) STORED,
    gap_pct         DECIMAL(5,2),
    severity        VARCHAR(20)  DEFAULT 'medium'
                    CHECK (severity IN ('critical','high','medium','low','none')),
    recommendations_count INT    DEFAULT 0,
    UNIQUE (score_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_gap_scores_score
    ON qiyas_gap_scores (score_id, severity);

-- Maturity-specific scores (wraps existing maturity_scores with Qiyas context)
CREATE TABLE IF NOT EXISTS qiyas_maturity_scores (
    maturity_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id        UUID         NOT NULL REFERENCES qiyas_scores(score_id) ON DELETE CASCADE,
    domain_id       UUID         NOT NULL,
    current_level   INT          NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 0 AND 5),
    target_level    INT          DEFAULT 3 CHECK (target_level BETWEEN 0 AND 5),
    level_label_en  VARCHAR(100),
    level_label_ar  VARCHAR(100),
    criteria_met    JSONB        DEFAULT '[]',
    criteria_unmet  JSONB        DEFAULT '[]',
    evidence_coverage_pct DECIMAL(5,2) DEFAULT 0,
    UNIQUE (score_id, domain_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_scores_score
    ON qiyas_maturity_scores (score_id);

-- Benchmark comparison results (how this assessment compares to profiles)
CREATE TABLE IF NOT EXISTS qiyas_benchmark_results (
    result_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id        UUID         NOT NULL REFERENCES qiyas_scores(score_id) ON DELETE CASCADE,
    profile_id      UUID         NOT NULL,
    entity_type     VARCHAR(30)  DEFAULT 'overall'
                    CHECK (entity_type IN ('overall','domain','dimension')),
    entity_id       UUID,
    actual_score    DECIMAL(10,2) NOT NULL,
    benchmark_score DECIMAL(10,2) NOT NULL,
    delta           DECIMAL(10,2) GENERATED ALWAYS AS (actual_score - benchmark_score) STORED,
    percentile      DECIMAL(5,2),
    rating          VARCHAR(20)  DEFAULT 'average'
                    CHECK (rating IN ('below_average','average','above_average','best_in_class')),
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_results_score
    ON qiyas_benchmark_results (score_id);

-- Human-readable score explanations (AI-generated or manual)
CREATE TABLE IF NOT EXISTS qiyas_score_explanations (
    explanation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id        UUID         NOT NULL REFERENCES qiyas_scores(score_id) ON DELETE CASCADE,
    entity_type     VARCHAR(30)  NOT NULL
                    CHECK (entity_type IN ('overall','domain','dimension','indicator','gap')),
    entity_id       UUID,
    language        VARCHAR(5)   NOT NULL DEFAULT 'en',
    summary         TEXT         NOT NULL,
    details         TEXT,
    key_findings    JSONB        DEFAULT '[]',
    source          VARCHAR(30)  DEFAULT 'ai'
                    CHECK (source IN ('ai','manual','template')),
    generated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_score_explanations_score
    ON qiyas_score_explanations (score_id, entity_type);

-- Point-in-time snapshots of scores for trend tracking
CREATE TABLE IF NOT EXISTS qiyas_score_snapshots (
    snapshot_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL,
    model_id        UUID         NOT NULL,
    snapshot_type   VARCHAR(20)  NOT NULL DEFAULT 'periodic'
                    CHECK (snapshot_type IN ('periodic','milestone','finalization','comparison')),
    overall_score   DECIMAL(10,2) NOT NULL,
    domain_scores   JSONB        NOT NULL DEFAULT '{}',
    dimension_scores JSONB       DEFAULT '{}',
    gap_summary     JSONB        DEFAULT '{}',
    maturity_summary JSONB       DEFAULT '{}',
    snapshot_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_score_snapshots_assessment
    ON qiyas_score_snapshots (qiyas_assessment_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_qiyas_score_snapshots_model
    ON qiyas_score_snapshots (model_id, snapshot_date DESC);
