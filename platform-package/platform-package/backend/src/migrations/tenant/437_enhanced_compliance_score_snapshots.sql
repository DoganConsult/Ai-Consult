-- Migration 437: Setup and Enhance compliance_score_snapshots
-- Supports the comprehensive 4-dimension weighted compliance score computation
-- (control effectiveness, evidence freshness, policy coverage, audit findings closure).

CREATE TABLE IF NOT EXISTS compliance_score_snapshots (
  snapshot_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   DATE NOT NULL UNIQUE,
  score           NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_controls  INT DEFAULT 0,
  effective_controls INT DEFAULT 0,
  control_score   NUMERIC(5,2) DEFAULT 0,
  evidence_score  NUMERIC(5,2) DEFAULT 0,
  policy_score    NUMERIC(5,2) DEFAULT 0,
  audit_score     NUMERIC(5,2) DEFAULT 0,
  narrative_en    TEXT,
  narrative_ar    TEXT,
  dimensions_json JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist for existing tables
DO $$
BEGIN
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS control_score NUMERIC(5,2) DEFAULT 0;
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS evidence_score NUMERIC(5,2) DEFAULT 0;
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS policy_score NUMERIC(5,2) DEFAULT 0;
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS audit_score NUMERIC(5,2) DEFAULT 0;
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS narrative_en TEXT;
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS narrative_ar TEXT;
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS dimensions_json JSONB DEFAULT '[]';
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS total_controls INT DEFAULT 0;
  ALTER TABLE compliance_score_snapshots ADD COLUMN IF NOT EXISTS effective_controls INT DEFAULT 0;
END $$;

CREATE INDEX IF NOT EXISTS idx_compliance_score_snapshots_date ON compliance_score_snapshots(snapshot_date DESC);
