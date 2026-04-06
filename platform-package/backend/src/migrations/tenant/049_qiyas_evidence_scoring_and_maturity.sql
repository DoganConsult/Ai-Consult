-- Migration: 049_qiyas_evidence_scoring_and_maturity.sql
-- Phase 9d: Qiyas Engine — Sub-domain O-F (Evidence Scoring & Quality)
--           + Sub-domain O-G (Maturity Analytics & Progression)
-- 15 new tables
-- Date: 2026-03-01

-- ═══════════════════════════════════════════════════════════════
-- O-F. Evidence Scoring and Quality (7 tables)
-- ═══════════════════════════════════════════════════════════════

-- Evidence scoring model definitions (how evidence quality is measured)
CREATE TABLE IF NOT EXISTS qiyas_evidence_scoring_models (
    model_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)  NOT NULL UNIQUE,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    scoring_dimensions JSONB     NOT NULL DEFAULT '["relevance","completeness","timeliness","authenticity"]',
    weight_config   JSONB        DEFAULT '{}',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft','active','deprecated')),
    created_by      VARCHAR(64),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Criteria within an evidence scoring model
CREATE TABLE IF NOT EXISTS qiyas_evidence_scoring_criteria (
    criteria_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id        UUID         NOT NULL REFERENCES qiyas_evidence_scoring_models(model_id) ON DELETE CASCADE,
    dimension       VARCHAR(50)  NOT NULL,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    max_score       DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    weight          DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    scoring_guide   JSONB        DEFAULT '{}',
    sort_order      INT          DEFAULT 0,
    UNIQUE (model_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_scoring_criteria_model
    ON qiyas_evidence_scoring_criteria (model_id, dimension);

-- Actual evidence scores (per evidence item evaluated)
CREATE TABLE IF NOT EXISTS qiyas_evidence_scores (
    score_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id     UUID         NOT NULL,
    scoring_model_id UUID        NOT NULL REFERENCES qiyas_evidence_scoring_models(model_id),
    qiyas_assessment_id UUID,
    control_id      VARCHAR(100),
    obligation_id   VARCHAR(100),
    overall_score   DECIMAL(5,2) NOT NULL DEFAULT 0,
    dimension_scores JSONB       NOT NULL DEFAULT '{}',
    criteria_scores JSONB        NOT NULL DEFAULT '[]',
    quality_grade   VARCHAR(20)  DEFAULT 'acceptable'
                    CHECK (quality_grade IN ('excellent','good','acceptable','poor','insufficient')),
    scored_by       VARCHAR(64),
    scored_at       TIMESTAMPTZ  DEFAULT NOW(),
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_scores_evidence
    ON qiyas_evidence_scores (evidence_id);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_scores_assessment
    ON qiyas_evidence_scores (qiyas_assessment_id);

-- Aggregate evidence quality metrics (per assessment or per control)
CREATE TABLE IF NOT EXISTS qiyas_evidence_quality_metrics (
    metric_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(30)  NOT NULL
                    CHECK (entity_type IN ('assessment','control','obligation','domain')),
    entity_id       VARCHAR(100) NOT NULL,
    qiyas_assessment_id UUID,
    total_evidence  INT          DEFAULT 0,
    scored_evidence INT          DEFAULT 0,
    avg_quality_score DECIMAL(5,2) DEFAULT 0,
    excellent_count INT          DEFAULT 0,
    good_count      INT          DEFAULT 0,
    acceptable_count INT         DEFAULT 0,
    poor_count      INT          DEFAULT 0,
    insufficient_count INT       DEFAULT 0,
    freshness_pct   DECIMAL(5,2) DEFAULT 0,
    computed_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_quality_entity
    ON qiyas_evidence_quality_metrics (entity_type, entity_id);

-- Coverage analysis (which controls/obligations have sufficient evidence)
CREATE TABLE IF NOT EXISTS qiyas_evidence_coverage_analysis (
    analysis_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL,
    entity_type     VARCHAR(30)  NOT NULL
                    CHECK (entity_type IN ('control','obligation','requirement','indicator')),
    entity_id       VARCHAR(100) NOT NULL,
    required_evidence_types JSONB DEFAULT '[]',
    provided_evidence_types JSONB DEFAULT '[]',
    coverage_pct    DECIMAL(5,2) NOT NULL DEFAULT 0,
    missing_types   JSONB        DEFAULT '[]',
    status          VARCHAR(20)  DEFAULT 'partial'
                    CHECK (status IN ('full','partial','none','excessive')),
    analyzed_at     TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (qiyas_assessment_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_coverage_assessment
    ON qiyas_evidence_coverage_analysis (qiyas_assessment_id, status);

-- Sufficiency rules (what evidence is "enough" for a given context)
CREATE TABLE IF NOT EXISTS qiyas_evidence_sufficiency_rules (
    rule_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type    VARCHAR(30)  NOT NULL
                    CHECK (context_type IN ('control','obligation','framework_requirement','indicator')),
    context_id      VARCHAR(100),
    model_id        UUID,
    min_evidence_count INT       DEFAULT 1,
    required_types  JSONB        DEFAULT '[]',
    max_age_days    INT          DEFAULT 365,
    min_quality_grade VARCHAR(20) DEFAULT 'acceptable',
    min_quality_score DECIMAL(5,2) DEFAULT 5.00,
    is_default      BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_sufficiency_context
    ON qiyas_evidence_sufficiency_rules (context_type, context_id);

-- Evidence chain validation (verifying integrity and provenance of evidence chains)
CREATE TABLE IF NOT EXISTS qiyas_evidence_chain_validations (
    validation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id     UUID         NOT NULL,
    qiyas_assessment_id UUID,
    chain_length    INT          NOT NULL DEFAULT 1,
    all_hashes_valid BOOLEAN     NOT NULL DEFAULT TRUE,
    broken_links    JSONB        DEFAULT '[]',
    provenance_score DECIMAL(5,2) DEFAULT 10.00,
    tamper_detected BOOLEAN      DEFAULT FALSE,
    validated_by    VARCHAR(64),
    validated_at    TIMESTAMPTZ  DEFAULT NOW(),
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_chain_evidence
    ON qiyas_evidence_chain_validations (evidence_id);

-- ═══════════════════════════════════════════════════════════════
-- O-G. Maturity Analytics and Progression (8 tables)
-- ═══════════════════════════════════════════════════════════════

-- Maturity model definitions (e.g. CMM, NIST CSF, custom)
CREATE TABLE IF NOT EXISTS qiyas_maturity_models (
    maturity_model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_model_id  UUID         REFERENCES qiyas_models(model_id),
    code            VARCHAR(50)  NOT NULL UNIQUE,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    total_levels    INT          NOT NULL DEFAULT 5,
    level_labels    JSONB        NOT NULL DEFAULT '["Initial","Managed","Defined","Quantitatively Managed","Optimizing"]',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft','active','deprecated')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Individual maturity levels within a model
CREATE TABLE IF NOT EXISTS qiyas_maturity_levels (
    level_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maturity_model_id UUID       NOT NULL REFERENCES qiyas_maturity_models(maturity_model_id) ON DELETE CASCADE,
    level_number    INT          NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    color_code      VARCHAR(7)   DEFAULT '#808080',
    sort_order      INT          DEFAULT 0,
    UNIQUE (maturity_model_id, level_number)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_levels_model
    ON qiyas_maturity_levels (maturity_model_id, level_number);

-- Criteria that must be met for each maturity level
CREATE TABLE IF NOT EXISTS qiyas_maturity_level_criteria (
    criteria_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id        UUID         NOT NULL REFERENCES qiyas_maturity_levels(level_id) ON DELETE CASCADE,
    domain_id       UUID         REFERENCES qiyas_domains(domain_id),
    code            VARCHAR(50)  NOT NULL,
    description_en  TEXT         NOT NULL,
    description_ar  TEXT,
    evidence_required BOOLEAN    DEFAULT TRUE,
    weight          DECIMAL(5,2) DEFAULT 1.00,
    sort_order      INT          DEFAULT 0,
    UNIQUE (level_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_criteria_level
    ON qiyas_maturity_level_criteria (level_id);

-- Maturity assessment instances (one per org-unit per period)
CREATE TABLE IF NOT EXISTS qiyas_maturity_assessments (
    maturity_assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maturity_model_id UUID       NOT NULL REFERENCES qiyas_maturity_models(maturity_model_id),
    qiyas_assessment_id UUID,
    entity_type     VARCHAR(30)  DEFAULT 'organization'
                    CHECK (entity_type IN ('organization','department','team','process','system')),
    entity_id       VARCHAR(100),
    assessment_period VARCHAR(20) DEFAULT 'annual',
    period_start    DATE,
    period_end      DATE,
    overall_level   INT          DEFAULT 1,
    domain_levels   JSONB        DEFAULT '{}',
    status          VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','completed','validated')),
    assessed_by     VARCHAR(64),
    validated_by    VARCHAR(64),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_assessments_model
    ON qiyas_maturity_assessments (maturity_model_id, status);

-- Per-dimension results within a maturity assessment
CREATE TABLE IF NOT EXISTS qiyas_maturity_dimension_results (
    result_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maturity_assessment_id UUID   NOT NULL REFERENCES qiyas_maturity_assessments(maturity_assessment_id) ON DELETE CASCADE,
    domain_id       UUID         NOT NULL,
    dimension_id    UUID,
    achieved_level  INT          NOT NULL DEFAULT 1,
    target_level    INT          DEFAULT 3,
    criteria_met    INT          DEFAULT 0,
    criteria_total  INT          DEFAULT 0,
    evidence_coverage_pct DECIMAL(5,2) DEFAULT 0,
    notes           TEXT,
    UNIQUE (maturity_assessment_id, domain_id, dimension_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_dim_results_assessment
    ON qiyas_maturity_dimension_results (maturity_assessment_id);

-- Historical progression tracking (level changes over time)
CREATE TABLE IF NOT EXISTS qiyas_maturity_progression_history (
    progression_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maturity_model_id UUID       NOT NULL REFERENCES qiyas_maturity_models(maturity_model_id),
    entity_type     VARCHAR(30)  DEFAULT 'organization',
    entity_id       VARCHAR(100),
    domain_id       UUID,
    previous_level  INT,
    new_level       INT          NOT NULL,
    delta           INT          GENERATED ALWAYS AS (new_level - COALESCE(previous_level, 0)) STORED,
    assessment_ref  UUID,
    recorded_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_progression_model
    ON qiyas_maturity_progression_history (maturity_model_id, recorded_at DESC);

-- Target maturity profiles (where the org wants to be)
CREATE TABLE IF NOT EXISTS qiyas_maturity_target_profiles (
    profile_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maturity_model_id UUID       NOT NULL REFERENCES qiyas_maturity_models(maturity_model_id),
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    target_date     DATE,
    overall_target_level INT     NOT NULL DEFAULT 3,
    domain_targets  JSONB        NOT NULL DEFAULT '{}',
    rationale       TEXT,
    approved_by     VARCHAR(64),
    approved_at     TIMESTAMPTZ,
    status          VARCHAR(20)  DEFAULT 'active'
                    CHECK (status IN ('draft','active','achieved','superseded')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_targets_model
    ON qiyas_maturity_target_profiles (maturity_model_id, status);

-- Maturity improvement roadmaps (step-by-step paths to target levels)
CREATE TABLE IF NOT EXISTS qiyas_maturity_roadmaps (
    roadmap_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maturity_model_id UUID       NOT NULL REFERENCES qiyas_maturity_models(maturity_model_id),
    target_profile_id UUID       REFERENCES qiyas_maturity_target_profiles(profile_id),
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    milestones      JSONB        NOT NULL DEFAULT '[]',
    estimated_months INT,
    current_progress_pct DECIMAL(5,2) DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','completed','abandoned')),
    created_by      VARCHAR(64),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_maturity_roadmaps_model
    ON qiyas_maturity_roadmaps (maturity_model_id, status);
