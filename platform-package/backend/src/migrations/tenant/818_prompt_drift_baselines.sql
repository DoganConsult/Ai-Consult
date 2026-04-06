-- Feature 16: Prompt Drift Detection Baselines

CREATE TABLE IF NOT EXISTS prompt_drift_baselines (
  baseline_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id   UUID NOT NULL,
  avg_confidence      NUMERIC(4,3) NOT NULL DEFAULT 0.0,
  rejection_rate      NUMERIC(4,3) NOT NULL DEFAULT 0.0,
  action_distribution JSONB NOT NULL DEFAULT '{}',
  sample_size         INT NOT NULL DEFAULT 0,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_drift_baseline_version UNIQUE (prompt_version_id)
);

CREATE INDEX IF NOT EXISTS idx_pdb_version ON prompt_drift_baselines(prompt_version_id);

ALTER TABLE ai_prompt_registry ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ai_prompt_registry ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE ai_prompt_registry ADD COLUMN IF NOT EXISTS flag_reason TEXT;
