DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'department_id'
    AND table_schema = current_schema()
  ) THEN
    ALTER TABLE teams ADD COLUMN department_id UUID;
  END IF;
END $$;
