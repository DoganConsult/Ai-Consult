-- Migration 130: Fix process_tasks.control_id UUID → VARCHAR(128)
-- The controls table uses VARCHAR control_ids (e.g. ctrl-net-002),
-- but process_tasks.control_id was created as UUID, causing
-- "invalid input syntax for type uuid" errors.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'process_tasks'
               AND column_name = 'control_id'
               AND udt_name = 'uuid') THEN
    ALTER TABLE process_tasks ALTER COLUMN control_id TYPE VARCHAR(128) USING control_id::text;
  END IF;
END $$;
