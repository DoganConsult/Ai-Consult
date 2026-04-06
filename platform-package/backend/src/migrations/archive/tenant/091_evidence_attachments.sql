-- Migration 091: Evidence Attachments & Config Tables
-- Polymorphic entity→evidence-type attachment linking + per-entity required type config
-- Used by EvidenceApiService endpoints (policies, controls, risks, frameworks)

-- 1. evidence_attachments — stores individual evidence file attachments per entity
CREATE TABLE IF NOT EXISTS evidence_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,   -- 'policy', 'control', 'risk', 'framework'
  entity_id     VARCHAR(100) NOT NULL,
  evidence_type_code VARCHAR(50) NOT NULL,
  file_name     VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT DEFAULT 0,
  uploaded_by   VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_attachments_entity
  ON evidence_attachments (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_evidence_attachments_type_code
  ON evidence_attachments (evidence_type_code);

-- 2. evidence_attachments_config — stores per-entity required evidence type codes
CREATE TABLE IF NOT EXISTS evidence_attachments_config (
  config_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       VARCHAR(50) NOT NULL,
  entity_id         VARCHAR(100) NOT NULL,
  required_type_codes TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_evidence_config_entity UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_config_entity
  ON evidence_attachments_config (entity_type, entity_id);
