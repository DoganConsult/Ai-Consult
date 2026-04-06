-- Migration: 048_qiyas_recommendations_calibration.sql
-- Phase 9c: Qiyas Engine — Sub-domain O-E (Recommendations and Action Linkage)
-- 6 new tables
-- Date: 2026-03-01

-- ═══════════════════════════════════════════════════════════════
-- O-E. Recommendations and Action Linkage (6 tables)
-- ═══════════════════════════════════════════════════════════════

-- AI/rule-generated recommendations based on gap analysis
CREATE TABLE IF NOT EXISTS qiyas_recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID         NOT NULL,
    domain_id       UUID         REFERENCES qiyas_domains(domain_id),
    dimension_id    UUID         REFERENCES qiyas_dimensions(dimension_id),
    code            VARCHAR(50),
    title_en        VARCHAR(500) NOT NULL,
    title_ar        VARCHAR(500),
    description_en  TEXT,
    description_ar  TEXT,
    priority        VARCHAR(20)  NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low')),
    category        VARCHAR(50)  DEFAULT 'improvement'
                    CHECK (category IN ('improvement','gap_closure','quick_win','strategic','compliance')),
    effort_level    VARCHAR(20)  DEFAULT 'medium'
                    CHECK (effort_level IN ('low','medium','high','very_high')),
    estimated_days  INT,
    impact_score    DECIMAL(5,2),
    source          VARCHAR(30)  NOT NULL DEFAULT 'ai'
                    CHECK (source IN ('ai','rule_engine','manual','benchmark')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'proposed'
                    CHECK (status IN ('proposed','accepted','in_progress','completed','rejected','deferred')),
    accepted_by     VARCHAR(64),
    accepted_at     TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_recommendations_assessment
    ON qiyas_recommendations (assessment_id, priority);
CREATE INDEX IF NOT EXISTS idx_qiyas_recommendations_status
    ON qiyas_recommendations (status);

-- Maps recommendations to actionable GRC entities (controls, obligations, tasks)
CREATE TABLE IF NOT EXISTS qiyas_recommendation_mappings (
    mapping_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID       NOT NULL REFERENCES qiyas_recommendations(recommendation_id) ON DELETE CASCADE,
    target_type     VARCHAR(50)  NOT NULL
                    CHECK (target_type IN ('control','obligation','risk','remediation_task','action_item','policy')),
    target_id       VARCHAR(100) NOT NULL,
    mapping_type    VARCHAR(30)  DEFAULT 'implements'
                    CHECK (mapping_type IN ('implements','mitigates','addresses','supports')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (recommendation_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_rec_mappings_target
    ON qiyas_recommendation_mappings (target_type, target_id);

-- Multi-step improvement paths (roadmap from current to target maturity)
CREATE TABLE IF NOT EXISTS qiyas_improvement_paths (
    path_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID         NOT NULL,
    domain_id       UUID         REFERENCES qiyas_domains(domain_id),
    current_level   DECIMAL(5,2) NOT NULL,
    target_level    DECIMAL(5,2) NOT NULL,
    steps           JSONB        NOT NULL DEFAULT '[]',
    estimated_months INT,
    effort_estimate VARCHAR(20)  DEFAULT 'medium',
    priority        VARCHAR(20)  DEFAULT 'medium',
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','completed','abandoned')),
    created_by      VARCHAR(64),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_improvement_paths_assessment
    ON qiyas_improvement_paths (assessment_id);

-- Calibration log (audit trail of score adjustments by reviewers)
CREATE TABLE IF NOT EXISTS qiyas_calibration_log (
    calibration_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID         NOT NULL,
    entity_type     VARCHAR(50)  NOT NULL
                    CHECK (entity_type IN ('score','dimension_score','indicator_score','gap_score')),
    entity_id       UUID         NOT NULL,
    original_value  DECIMAL(10,2) NOT NULL,
    adjusted_value  DECIMAL(10,2) NOT NULL,
    reason          TEXT         NOT NULL,
    calibrated_by   VARCHAR(64)  NOT NULL,
    calibrated_at   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_calibration_assessment
    ON qiyas_calibration_log (assessment_id, calibrated_at DESC);

-- Consensus reviews (multi-reviewer agreement before finalization)
CREATE TABLE IF NOT EXISTS qiyas_consensus_reviews (
    review_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID         NOT NULL,
    reviewer_id     VARCHAR(64)  NOT NULL,
    reviewer_name   VARCHAR(255),
    reviewer_role   VARCHAR(50),
    overall_score   DECIMAL(5,2),
    comments        TEXT,
    domain_scores   JSONB        DEFAULT '{}',
    decision        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (decision IN ('pending','agree','disagree','abstain')),
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (assessment_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_consensus_assessment
    ON qiyas_consensus_reviews (assessment_id, decision);

-- Export records (PDF reports, Excel dumps, API extracts)
CREATE TABLE IF NOT EXISTS qiyas_assessment_exports (
    export_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID         NOT NULL,
    export_type     VARCHAR(30)  NOT NULL DEFAULT 'pdf'
                    CHECK (export_type IN ('pdf','excel','csv','json','api')),
    file_name       VARCHAR(500),
    file_path       VARCHAR(1000),
    file_size_bytes BIGINT,
    template_used   VARCHAR(100),
    filters         JSONB        DEFAULT '{}',
    generated_by    VARCHAR(64)  NOT NULL,
    generated_at    TIMESTAMPTZ  DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qiyas_exports_assessment
    ON qiyas_assessment_exports (assessment_id, generated_at DESC);
