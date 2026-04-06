-- ============================================================
-- Migration 917: Consolidate sla_priority_config schema drift
-- Migrations 357 and 434 created incompatible schemas:
--   357: PK = priority (TEXT), has min_authority_level
--   434: PK = priority_level (VARCHAR), no min_authority_level
-- This migration standardizes to priority_level + min_authority_level.
-- ============================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema AND table_name = 'sla_priority_config' AND column_name = 'priority'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema AND table_name = 'sla_priority_config' AND column_name = 'priority_level'
  ) THEN
    ALTER TABLE sla_priority_config RENAME COLUMN priority TO priority_level;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema AND table_name = 'sla_priority_config' AND column_name = 'min_authority_level'
  ) THEN
    ALTER TABLE sla_priority_config ADD COLUMN min_authority_level TEXT;
    UPDATE sla_priority_config SET min_authority_level = 'approve_high' WHERE priority_level = 'critical';
    UPDATE sla_priority_config SET min_authority_level = 'approve_medium' WHERE priority_level = 'high';
    UPDATE sla_priority_config SET min_authority_level = 'approve_low' WHERE priority_level = 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema AND table_name = 'sla_priority_config' AND column_name = 'warning_pct'
  ) THEN
    ALTER TABLE sla_priority_config ADD COLUMN warning_pct INT NOT NULL DEFAULT 75;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema AND table_name = 'sla_priority_config' AND column_name = 'description'
  ) THEN
    ALTER TABLE sla_priority_config ADD COLUMN description VARCHAR(500);
    UPDATE sla_priority_config SET description = 'Critical priority: 4-hour SLA' WHERE priority_level = 'critical';
    UPDATE sla_priority_config SET description = 'High priority: 24-hour SLA' WHERE priority_level = 'high';
    UPDATE sla_priority_config SET description = 'Medium priority: 72-hour SLA' WHERE priority_level = 'medium';
    UPDATE sla_priority_config SET description = 'Low priority: 168-hour SLA' WHERE priority_level = 'low';
  END IF;
END $$;
