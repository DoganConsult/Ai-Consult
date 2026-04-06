-- Phase 7: Profile Completeness & Provisioning Standards
-- GAP-10: Missing profile completeness scoring

CREATE TABLE IF NOT EXISTS profile_completeness_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL UNIQUE,
  applies_to_actor_type TEXT NOT NULL CHECK (applies_to_actor_type IN ('human','agent','external','all')),
  applies_to_role_code TEXT,
  field_path TEXT NOT NULL,
  field_label_en TEXT NOT NULL,
  field_label_ar TEXT,
  weight INT NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  enforcement_level TEXT NOT NULL DEFAULT 'advisory' CHECK (enforcement_level IN ('advisory','warning','blocking')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_completeness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES actor_registry(actor_id),
  total_score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 100,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  blocking_fields TEXT[] NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(actor_id)
);
CREATE INDEX IF NOT EXISTS idx_completeness_actor ON profile_completeness_scores (actor_id);
