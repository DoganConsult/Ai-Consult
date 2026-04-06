-- Fix control_id type mismatch in control_monitoring tables
-- Migration 113 used VARCHAR(255) but parent controls.control_id is VARCHAR(100)
-- This repair migration aligns FK columns for tenants that already ran 113

DO $$
BEGIN
  -- control_tests
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'control_tests' AND column_name = 'control_id'
      AND character_maximum_length > 100
      AND table_schema = current_schema()
  ) THEN
    ALTER TABLE control_tests ALTER COLUMN control_id TYPE VARCHAR(100);
  END IF;

  -- control_failures
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'control_failures' AND column_name = 'control_id'
      AND character_maximum_length > 100
      AND table_schema = current_schema()
  ) THEN
    ALTER TABLE control_failures ALTER COLUMN control_id TYPE VARCHAR(100);
  END IF;

  -- control_actions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'control_actions' AND column_name = 'control_id'
      AND character_maximum_length > 100
      AND table_schema = current_schema()
  ) THEN
    ALTER TABLE control_actions ALTER COLUMN control_id TYPE VARCHAR(100);
  END IF;
END $$;
