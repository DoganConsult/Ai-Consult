-- Migration 712: obligation_policy_links
-- Tracks which policies fulfil or support each obligation
-- Pattern mirrors obligation_control_mappings

CREATE TABLE IF NOT EXISTS obligation_policy_links (
  link_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id   UUID NOT NULL,
  policy_id       UUID NOT NULL,
  link_type       VARCHAR(30) NOT NULL DEFAULT 'implements',  -- implements | supports | references
  relevance_score NUMERIC(5,2) DEFAULT 100.00,               -- 0-100: how well policy covers the obligation
  notes           TEXT,
  created_by      VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (obligation_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_opl_obligation ON obligation_policy_links (obligation_id);
CREATE INDEX IF NOT EXISTS idx_opl_policy     ON obligation_policy_links (policy_id);
