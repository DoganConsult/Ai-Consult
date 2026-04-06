-- Migration: 045_shared_platform_additions.sql
-- Phase 8: Shared Platform Services (Domain M) additions
-- Most tables in M already exist; this adds only the missing ones.
-- Date: 2026-03-01

-- AI-generated summaries cache (polymorphic)
CREATE TABLE IF NOT EXISTS ai_summaries (
    summary_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       VARCHAR(100) NOT NULL,
    summary_type    VARCHAR(30)  NOT NULL DEFAULT 'executive'
                    CHECK (summary_type IN ('executive','technical','action_items','risk_highlight','trend')),
    language        VARCHAR(5)   NOT NULL DEFAULT 'en',
    content         TEXT         NOT NULL,
    model_used      VARCHAR(100),
    tokens_used     INT          DEFAULT 0,
    confidence      DECIMAL(3,2) DEFAULT 0.00,
    generated_by    VARCHAR(64)  NOT NULL,
    generated_at    TIMESTAMPTZ  DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    UNIQUE (entity_type, entity_id, summary_type, language)
);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_entity
    ON ai_summaries (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_type
    ON ai_summaries (summary_type, generated_at DESC);
