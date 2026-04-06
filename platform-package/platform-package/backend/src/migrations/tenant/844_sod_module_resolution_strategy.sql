-- Migration 844: Add resolution_strategy to module_sod_rules
-- Supports block/warn/escalate/allow-with-audit outcomes for module-level SoD definitions.
-- Also adds escalate to enterprise sod_rules conflict_level CHECK constraint.

-- 1. Add resolution_strategy to module_sod_rules (defaults to 'block' for hard, 'warn' for soft)
DO $$ BEGIN
  ALTER TABLE module_sod_rules
    ADD COLUMN resolution_strategy VARCHAR(30) NOT NULL DEFAULT 'block'
    CHECK (resolution_strategy IN ('block', 'warn', 'escalate', 'allow'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Widen enterprise sod_rules conflict_level to include 'escalate'
DO $$ BEGIN
  ALTER TABLE sod_rules DROP CONSTRAINT IF EXISTS sod_rules_conflict_level_check;
  ALTER TABLE sod_rules ADD CONSTRAINT sod_rules_conflict_level_check
    CHECK (conflict_level IN ('warn', 'block', 'escalate'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Add sod_conflict_log table if not exists (used by sod-conflict-audit.service.ts)
CREATE TABLE IF NOT EXISTS sod_conflict_log (
  conflict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  rule_code TEXT NOT NULL,
  role_code_a TEXT NOT NULL,
  role_code_b TEXT NOT NULL,
  conflict_level TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  resolved_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sod_conflict_log_user ON sod_conflict_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sod_conflict_log_unresolved ON sod_conflict_log(resolved_at) WHERE resolved_at IS NULL;
