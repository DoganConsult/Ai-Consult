CREATE TABLE IF NOT EXISTS onboarding_seed_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_type     VARCHAR(50)  NOT NULL,
  seed_code     VARCHAR(100) NOT NULL,
  seed_payload  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  seeded_by     VARCHAR(64)  NOT NULL DEFAULT 'system',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_seed_history_type
  ON onboarding_seed_history (seed_type);
