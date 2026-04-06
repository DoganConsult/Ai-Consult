-- 357: Evidence quality tier (Phase 3 — evidence quality and freshness)
-- Adds quality_tier column to evidence for Tier A/B/C classification.
-- Run per tenant schema. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'evidence' AND column_name = 'quality_tier'
  ) THEN
    ALTER TABLE evidence ADD COLUMN quality_tier VARCHAR(1) DEFAULT 'B';
    ALTER TABLE evidence ADD CONSTRAINT evidence_quality_tier_check
      CHECK (quality_tier IN ('A','B','C'));
  END IF;
END $$;
