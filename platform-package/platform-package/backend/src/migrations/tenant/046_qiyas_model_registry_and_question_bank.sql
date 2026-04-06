-- Migration: 046_qiyas_model_registry_and_question_bank.sql
-- Phase 9a: Qiyas Engine — Sub-domain O-A (Model Registry) + O-B (Question Bank)
-- 16 new tables
-- Date: 2026-03-01

-- ═══════════════════════════════════════════════════════════════
-- O-A. Model Registry (8 tables)
-- ═══════════════════════════════════════════════════════════════

-- Central registry of assessment/maturity models (e.g. NCA-ECC, ISO27001-Maturity, PDPL-Readiness)
CREATE TABLE IF NOT EXISTS qiyas_models (
    model_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)  NOT NULL UNIQUE,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    model_type      VARCHAR(30)  NOT NULL DEFAULT 'maturity'
                    CHECK (model_type IN ('maturity','compliance','risk','readiness','custom')),
    owner           VARCHAR(64),
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','deprecated','archived')),
    tags            JSONB        DEFAULT '[]',
    metadata        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Versioned snapshots of a model definition
CREATE TABLE IF NOT EXISTS qiyas_model_versions (
    version_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id        UUID         NOT NULL REFERENCES qiyas_models(model_id) ON DELETE CASCADE,
    version_number  INT          NOT NULL DEFAULT 1,
    label           VARCHAR(50),
    change_summary  TEXT,
    definition      JSONB        NOT NULL DEFAULT '{}',
    published_at    TIMESTAMPTZ,
    published_by    VARCHAR(64),
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','superseded')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (model_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_model_versions_model
    ON qiyas_model_versions (model_id, version_number DESC);

-- Domains within a model (e.g. "Access Control", "Risk Management")
CREATE TABLE IF NOT EXISTS qiyas_domains (
    domain_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id        UUID         NOT NULL REFERENCES qiyas_models(model_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    sort_order      INT          DEFAULT 0,
    weight          DECIMAL(5,2) DEFAULT 1.00,
    parent_domain_id UUID        REFERENCES qiyas_domains(domain_id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (model_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_domains_model
    ON qiyas_domains (model_id, sort_order);

-- Dimensions within a domain (e.g. "Policy", "Technology", "People")
CREATE TABLE IF NOT EXISTS qiyas_dimensions (
    dimension_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id       UUID         NOT NULL REFERENCES qiyas_domains(domain_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    sort_order      INT          DEFAULT 0,
    weight          DECIMAL(5,2) DEFAULT 1.00,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (domain_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_dimensions_domain
    ON qiyas_dimensions (domain_id, sort_order);

-- Measurable indicators within a dimension
CREATE TABLE IF NOT EXISTS qiyas_indicators (
    indicator_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id    UUID         NOT NULL REFERENCES qiyas_dimensions(dimension_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    measurement_type VARCHAR(30) NOT NULL DEFAULT 'scale'
                    CHECK (measurement_type IN ('scale','binary','percentage','count','custom')),
    target_value    DECIMAL(10,2),
    weight          DECIMAL(5,2) DEFAULT 1.00,
    sort_order      INT          DEFAULT 0,
    evidence_required BOOLEAN    DEFAULT FALSE,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (dimension_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_indicators_dimension
    ON qiyas_indicators (dimension_id, sort_order);

-- Scoring method definitions (how raw answers → numeric scores)
CREATE TABLE IF NOT EXISTS qiyas_scoring_methods (
    method_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id        UUID         NOT NULL REFERENCES qiyas_models(model_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    method_type     VARCHAR(30)  NOT NULL DEFAULT 'weighted_average'
                    CHECK (method_type IN ('weighted_average','simple_average','max','min','custom_formula')),
    formula         JSONB        DEFAULT '{}',
    normalization   VARCHAR(20)  DEFAULT 'none'
                    CHECK (normalization IN ('none','min_max','z_score','percentile')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (model_id, code)
);

-- Rating scales (e.g. 1-5 maturity, Red/Amber/Green)
CREATE TABLE IF NOT EXISTS qiyas_rating_scales (
    scale_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id        UUID         NOT NULL REFERENCES qiyas_models(model_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    scale_type      VARCHAR(20)  NOT NULL DEFAULT 'numeric'
                    CHECK (scale_type IN ('numeric','ordinal','rag','percentage','custom')),
    levels          JSONB        NOT NULL DEFAULT '[]',
    min_value       DECIMAL(10,2) DEFAULT 0,
    max_value       DECIMAL(10,2) DEFAULT 5,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (model_id, code)
);

-- Benchmark profiles (reference baselines: sector averages, best-in-class)
CREATE TABLE IF NOT EXISTS qiyas_benchmark_profiles (
    profile_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id        UUID         NOT NULL REFERENCES qiyas_models(model_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    profile_type    VARCHAR(30)  NOT NULL DEFAULT 'sector_average'
                    CHECK (profile_type IN ('sector_average','best_in_class','regulatory_minimum','custom')),
    sector_id       VARCHAR(64),
    baseline_scores JSONB        NOT NULL DEFAULT '{}',
    valid_from      DATE,
    valid_to        DATE,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (model_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmark_profiles_model
    ON qiyas_benchmark_profiles (model_id);

-- ═══════════════════════════════════════════════════════════════
-- O-B. Question Bank and Templates (8 tables)
-- ═══════════════════════════════════════════════════════════════

-- Assessment templates (reusable questionnaire blueprints)
CREATE TABLE IF NOT EXISTS qiyas_templates (
    template_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id        UUID         NOT NULL REFERENCES qiyas_models(model_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    template_type   VARCHAR(30)  NOT NULL DEFAULT 'assessment'
                    CHECK (template_type IN ('assessment','audit','self_assessment','gap_analysis','certification')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','deprecated')),
    estimated_minutes INT        DEFAULT 60,
    created_by      VARCHAR(64),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (model_id, code)
);

-- Template version history
CREATE TABLE IF NOT EXISTS qiyas_template_versions (
    version_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID         NOT NULL REFERENCES qiyas_templates(template_id) ON DELETE CASCADE,
    version_number  INT          NOT NULL DEFAULT 1,
    change_summary  TEXT,
    snapshot        JSONB        NOT NULL DEFAULT '{}',
    published_at    TIMESTAMPTZ,
    published_by    VARCHAR(64),
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','superseded')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (template_id, version_number)
);

-- Sections within a template (logical groupings of questions)
CREATE TABLE IF NOT EXISTS qiyas_sections (
    section_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID         NOT NULL REFERENCES qiyas_templates(template_id) ON DELETE CASCADE,
    domain_id       UUID         REFERENCES qiyas_domains(domain_id),
    code            VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description_en  TEXT,
    description_ar  TEXT,
    sort_order      INT          DEFAULT 0,
    is_required     BOOLEAN      DEFAULT TRUE,
    visibility_rule JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (template_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_sections_template
    ON qiyas_sections (template_id, sort_order);

-- Individual questions in the bank
CREATE TABLE IF NOT EXISTS qiyas_questions (
    question_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id      UUID         NOT NULL REFERENCES qiyas_sections(section_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    text_en         TEXT         NOT NULL,
    text_ar         TEXT,
    help_text_en    TEXT,
    help_text_ar    TEXT,
    question_type   VARCHAR(30)  NOT NULL DEFAULT 'single_select'
                    CHECK (question_type IN ('single_select','multi_select','scale','text','number',
                                             'date','file_upload','yes_no','matrix','ranking')),
    is_required     BOOLEAN      DEFAULT TRUE,
    sort_order      INT          DEFAULT 0,
    visibility_rule JSONB        DEFAULT '{}',
    validation_rule JSONB        DEFAULT '{}',
    metadata        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (section_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_questions_section
    ON qiyas_questions (section_id, sort_order);

-- Answer options for select-type questions
CREATE TABLE IF NOT EXISTS qiyas_question_options (
    option_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID         NOT NULL REFERENCES qiyas_questions(question_id) ON DELETE CASCADE,
    code            VARCHAR(50)  NOT NULL,
    label_en        VARCHAR(500) NOT NULL,
    label_ar        VARCHAR(500),
    score_value     DECIMAL(10,2) DEFAULT 0,
    sort_order      INT          DEFAULT 0,
    is_disqualifying BOOLEAN     DEFAULT FALSE,
    metadata        JSONB        DEFAULT '{}',
    UNIQUE (question_id, code)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_question_options_question
    ON qiyas_question_options (question_id, sort_order);

-- Per-question weight overrides (context-specific)
CREATE TABLE IF NOT EXISTS qiyas_question_weights (
    weight_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID         NOT NULL REFERENCES qiyas_questions(question_id) ON DELETE CASCADE,
    indicator_id    UUID         REFERENCES qiyas_indicators(indicator_id),
    dimension_id    UUID         REFERENCES qiyas_dimensions(dimension_id),
    weight          DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    context         VARCHAR(50)  DEFAULT 'default',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (question_id, indicator_id, context)
);

-- Question-to-entity mappings (links questions to controls, obligations, requirements)
CREATE TABLE IF NOT EXISTS qiyas_question_mappings (
    mapping_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID         NOT NULL REFERENCES qiyas_questions(question_id) ON DELETE CASCADE,
    entity_type     VARCHAR(50)  NOT NULL
                    CHECK (entity_type IN ('control','obligation','framework_requirement','risk','indicator')),
    entity_id       VARCHAR(100) NOT NULL,
    mapping_type    VARCHAR(30)  DEFAULT 'assesses'
                    CHECK (mapping_type IN ('assesses','validates','measures','evidences')),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (question_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_qiyas_question_mappings_entity
    ON qiyas_question_mappings (entity_type, entity_id);

-- Evidence rules tied to questions (what evidence is needed per answer)
CREATE TABLE IF NOT EXISTS qiyas_evidence_rules (
    rule_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID         NOT NULL REFERENCES qiyas_questions(question_id) ON DELETE CASCADE,
    trigger_condition JSONB      NOT NULL DEFAULT '{}',
    evidence_type   VARCHAR(50)  NOT NULL,
    description_en  TEXT,
    description_ar  TEXT,
    is_mandatory    BOOLEAN      DEFAULT TRUE,
    max_age_days    INT          DEFAULT 365,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qiyas_evidence_rules_question
    ON qiyas_evidence_rules (question_id);
