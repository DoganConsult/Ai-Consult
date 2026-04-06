-- Migration: 050_qiyas_benchmarking_and_certification.sql
-- Phase 9e: Qiyas Engine — Sub-domain O-H (Benchmarking and Comparison)
--           + Sub-domain O-I (Certification Readiness)
-- 12 new tables
-- Date: 2026-03-01

-- ═══════════════════════════════════════════════════════════════
-- O-H. Benchmarking and Comparison (6 tables)
-- ═══════════════════════════════════════════════════════════════

-- Benchmark datasets (curated reference data for comparisons)
CREATE TABLE IF NOT EXISTS qiyas_benchmark_datasets (
    dataset_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)  NOT NULL UNIQUE,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    source          VARCHAR(100) NOT NULL DEFAULT 'internal'
                    CHECK (source IN ('internal','nca','industry_report','custom','aggregated')),
    model_id        UUID,
    sector_id       VARCHAR(64),
    region          VARCHAR(50)  DEFAULT 'KSA',
    sample_size     INT          DEFAULT 0,
    collection_period VARCHAR(20),
    valid_from      DATE,
    valid_to        DATE,
    data            JSONB        NOT NULL DEFAULT '{}',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft','active','expired','archived')),
    created_by      VARCHAR(64),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_datasets_model
    ON qiyas_benchmark_datasets (model_id, status);

-- Cohorts (groups of organizations for peer comparison)
CREATE TABLE IF NOT EXISTS qiyas_benchmark_cohorts (
    cohort_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id      UUID         NOT NULL REFERENCES qiyas_benchmark_datasets(dataset_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    criteria        JSONB        NOT NULL DEFAULT '{}',
    member_count    INT          DEFAULT 0,
    sector_filter   VARCHAR(64),
    size_filter     VARCHAR(30),
    region_filter   VARCHAR(50),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (dataset_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_cohorts_dataset
    ON qiyas_benchmark_cohorts (dataset_id);

-- Statistical metrics within a benchmark dataset/cohort
CREATE TABLE IF NOT EXISTS qiyas_benchmark_metrics (
    metric_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id      UUID         NOT NULL REFERENCES qiyas_benchmark_datasets(dataset_id) ON DELETE CASCADE,
    cohort_id       UUID         REFERENCES qiyas_benchmark_cohorts(cohort_id),
    entity_type     VARCHAR(30)  NOT NULL DEFAULT 'overall'
                    CHECK (entity_type IN ('overall','domain','dimension','indicator')),
    entity_id       UUID,
    metric_name     VARCHAR(50)  NOT NULL,
    mean_value      DECIMAL(10,2),
    median_value    DECIMAL(10,2),
    std_deviation   DECIMAL(10,2),
    min_value       DECIMAL(10,2),
    max_value       DECIMAL(10,2),
    p25             DECIMAL(10,2),
    p75             DECIMAL(10,2),
    p90             DECIMAL(10,2),
    sample_size     INT          DEFAULT 0,
    computed_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_metrics_dataset
    ON qiyas_benchmark_metrics (dataset_id, entity_type);

-- Individual comparison records (this org vs benchmark)
CREATE TABLE IF NOT EXISTS qiyas_benchmark_comparisons (
    comparison_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID     NOT NULL,
    dataset_id      UUID         NOT NULL REFERENCES qiyas_benchmark_datasets(dataset_id),
    cohort_id       UUID         REFERENCES qiyas_benchmark_cohorts(cohort_id),
    entity_type     VARCHAR(30)  DEFAULT 'overall',
    entity_id       UUID,
    org_score       DECIMAL(10,2) NOT NULL,
    benchmark_mean  DECIMAL(10,2) NOT NULL,
    benchmark_median DECIMAL(10,2),
    delta_from_mean DECIMAL(10,2) GENERATED ALWAYS AS (org_score - benchmark_mean) STORED,
    percentile_rank DECIMAL(5,2),
    rating          VARCHAR(30)  DEFAULT 'average'
                    CHECK (rating IN ('significantly_below','below_average','average',
                                      'above_average','best_in_class')),
    compared_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_comparisons_assessment
    ON qiyas_benchmark_comparisons (qiyas_assessment_id);

-- Percentile distributions (precomputed for dashboards)
CREATE TABLE IF NOT EXISTS qiyas_benchmark_percentiles (
    percentile_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id      UUID         NOT NULL REFERENCES qiyas_benchmark_datasets(dataset_id) ON DELETE CASCADE,
    cohort_id       UUID         REFERENCES qiyas_benchmark_cohorts(cohort_id),
    entity_type     VARCHAR(30)  NOT NULL DEFAULT 'overall',
    entity_id       UUID,
    percentile      INT          NOT NULL CHECK (percentile BETWEEN 0 AND 100),
    score_value     DECIMAL(10,2) NOT NULL,
    computed_at     TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (dataset_id, cohort_id, entity_type, entity_id, percentile)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_percentiles_dataset
    ON qiyas_benchmark_percentiles (dataset_id, entity_type);

-- Trend tracking over multiple benchmark periods
CREATE TABLE IF NOT EXISTS qiyas_benchmark_trends (
    trend_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id      UUID         NOT NULL REFERENCES qiyas_benchmark_datasets(dataset_id) ON DELETE CASCADE,
    entity_type     VARCHAR(30)  NOT NULL DEFAULT 'overall',
    entity_id       UUID,
    period_label    VARCHAR(50)  NOT NULL,
    period_start    DATE         NOT NULL,
    period_end      DATE         NOT NULL,
    mean_score      DECIMAL(10,2),
    median_score    DECIMAL(10,2),
    sample_size     INT          DEFAULT 0,
    trend_direction VARCHAR(10)  DEFAULT 'stable'
                    CHECK (trend_direction IN ('improving','stable','declining')),
    change_pct      DECIMAL(5,2),
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_trends_dataset
    ON qiyas_benchmark_trends (dataset_id, period_start DESC);

-- ═══════════════════════════════════════════════════════════════
-- O-I. Certification Readiness (6 tables)
-- ═══════════════════════════════════════════════════════════════

-- Certification readiness assessments (overall readiness per framework/standard)
CREATE TABLE IF NOT EXISTS qiyas_certification_readiness (
    readiness_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qiyas_assessment_id UUID,
    framework_requirement_id VARCHAR(100),
    framework_name  VARCHAR(255),
    certification_body VARCHAR(255),
    target_date     DATE,
    overall_readiness_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    controls_ready  INT          DEFAULT 0,
    controls_total  INT          DEFAULT 0,
    evidence_ready  INT          DEFAULT 0,
    evidence_total  INT          DEFAULT 0,
    critical_gaps   INT          DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'assessing'
                    CHECK (status IN ('assessing','not_ready','partially_ready','ready','certified')),
    assessed_by     VARCHAR(64),
    assessed_at     TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_readiness_status
    ON qiyas_certification_readiness (status);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_readiness_assessment
    ON qiyas_certification_readiness (qiyas_assessment_id);

-- Individual certification gaps (what's missing for certification)
CREATE TABLE IF NOT EXISTS qiyas_certification_gaps (
    gap_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    readiness_id    UUID         NOT NULL REFERENCES qiyas_certification_readiness(readiness_id) ON DELETE CASCADE,
    gap_type        VARCHAR(30)  NOT NULL
                    CHECK (gap_type IN ('control_missing','control_inadequate','evidence_missing',
                                        'evidence_expired','process_gap','documentation_gap','training_gap')),
    entity_type     VARCHAR(50),
    entity_id       VARCHAR(100),
    description_en  TEXT         NOT NULL,
    description_ar  TEXT,
    severity        VARCHAR(20)  NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('critical','high','medium','low')),
    remediation_effort VARCHAR(20) DEFAULT 'medium'
                    CHECK (remediation_effort IN ('low','medium','high','very_high')),
    estimated_days  INT,
    assigned_to     VARCHAR(64),
    status          VARCHAR(20)  NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','accepted_risk','deferred')),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_gaps_readiness
    ON qiyas_certification_gaps (readiness_id, severity);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_gaps_status
    ON qiyas_certification_gaps (status);

-- Certification simulation runs (what-if analysis for readiness)
CREATE TABLE IF NOT EXISTS qiyas_certification_simulations (
    simulation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    readiness_id    UUID         NOT NULL REFERENCES qiyas_certification_readiness(readiness_id) ON DELETE CASCADE,
    scenario_name   VARCHAR(255) NOT NULL,
    scenario_description TEXT,
    assumptions     JSONB        NOT NULL DEFAULT '{}',
    projected_readiness_pct DECIMAL(5,2),
    projected_gaps  INT          DEFAULT 0,
    projected_timeline_days INT,
    simulated_changes JSONB      DEFAULT '[]',
    result_summary  JSONB        DEFAULT '{}',
    simulated_by    VARCHAR(64)  NOT NULL,
    simulated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_simulations_readiness
    ON qiyas_certification_simulations (readiness_id);

-- Certification milestones (key checkpoints on the certification journey)
CREATE TABLE IF NOT EXISTS qiyas_certification_milestones (
    milestone_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    readiness_id    UUID         NOT NULL REFERENCES qiyas_certification_readiness(readiness_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    milestone_type  VARCHAR(30)  NOT NULL DEFAULT 'checkpoint'
                    CHECK (milestone_type IN ('checkpoint','gate','deliverable','review','audit')),
    target_date     DATE,
    actual_date     DATE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed','overdue','skipped')),
    owner           VARCHAR(64),
    dependencies    JSONB        DEFAULT '[]',
    sort_order      INT          DEFAULT 0,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (readiness_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_milestones_readiness
    ON qiyas_certification_milestones (readiness_id, sort_order);

-- Evidence packs (bundled evidence for certification submission)
CREATE TABLE IF NOT EXISTS qiyas_certification_evidence_packs (
    pack_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    readiness_id    UUID         NOT NULL REFERENCES qiyas_certification_readiness(readiness_id) ON DELETE CASCADE,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    pack_type       VARCHAR(30)  DEFAULT 'submission'
                    CHECK (pack_type IN ('submission','pre_audit','internal_review','external_audit','follow_up')),
    evidence_ids    UUID[]       DEFAULT '{}',
    document_ids    UUID[]       DEFAULT '{}',
    total_items     INT          DEFAULT 0,
    completeness_pct DECIMAL(5,2) DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','in_review','approved','submitted','returned')),
    prepared_by     VARCHAR(64),
    reviewed_by     VARCHAR(64),
    approved_by     VARCHAR(64),
    approved_at     TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_evidence_packs_readiness
    ON qiyas_certification_evidence_packs (readiness_id, status);

-- Certification action plans (formal remediation plans for gaps)
CREATE TABLE IF NOT EXISTS qiyas_certification_action_plans (
    plan_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    readiness_id    UUID         NOT NULL REFERENCES qiyas_certification_readiness(readiness_id) ON DELETE CASCADE,
    gap_id          UUID         REFERENCES qiyas_certification_gaps(gap_id),
    title_en        VARCHAR(500) NOT NULL,
    title_ar        VARCHAR(500),
    description_en  TEXT,
    description_ar  TEXT,
    priority        VARCHAR(20)  NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low')),
    owner           VARCHAR(64),
    target_date     DATE,
    actual_completion_date DATE,
    actions         JSONB        NOT NULL DEFAULT '[]',
    dependencies    JSONB        DEFAULT '[]',
    progress_pct    DECIMAL(5,2) DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned','in_progress','completed','blocked','cancelled')),
    created_by      VARCHAR(64),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_action_plans_readiness
    ON qiyas_certification_action_plans (readiness_id, status);
CREATE INDEX IF NOT EXISTS idx_qiyas_cert_action_plans_gap
    ON qiyas_certification_action_plans (gap_id) WHERE gap_id IS NOT NULL;
